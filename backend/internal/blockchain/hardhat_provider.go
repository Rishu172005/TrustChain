package blockchain

import (
	"bytes"
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"math/big"
	"net/http"
	"os"
	"strings"
	"sync/atomic"
	"time"

	"golang.org/x/crypto/sha3"

	"github.com/trustchain/backend/internal/ports"
)

// ── Deployment JSON (written by contracts/trustchain-task3-s1/scripts/deploy.js) ──

type hardhatDeployment struct {
	Network  string                       `json:"network"`
	Deployer string                       `json:"deployer"`
	Contracts map[string]hardhatContract  `json:"contracts"`
}

type hardhatContract struct {
	Address string `json:"address"`
}

// ── JSON-RPC types ─────────────────────────────────────────────────────────────

type rpcRequest struct {
	JSONRPC string        `json:"jsonrpc"`
	Method  string        `json:"method"`
	Params  []interface{} `json:"params"`
	ID      uint64        `json:"id"`
}

type rpcResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      uint64          `json:"id"`
	Result  json.RawMessage `json:"result,omitempty"`
	Error   *rpcError       `json:"error,omitempty"`
}

type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

// ── HardhatProvider ────────────────────────────────────────────────────────────

// HardhatProvider implements ports.BlockchainProvider against a local Hardhat
// node. It talks to the node via raw Ethereum JSON-RPC (no go-ethereum SDK
// needed) and reads contract addresses from the deployment JSON produced by
// deploy.js. Activated when BLOCKCHAIN_PROVIDER=hardhat.
type HardhatProvider struct {
	rpcURL          string
	trustTokenAddr  string
	userRegistryAddr string
	deployerAddr    string
	httpClient      *http.Client
	idCounter       atomic.Uint64
}

// NewHardhatProvider reads deploymentPath (the localhost.json written by
// deploy.js), connects to the Hardhat node at rpcURL, and auto-registers the
// deployer address so check-ins work immediately.
func NewHardhatProvider(rpcURL, deploymentPath string) (*HardhatProvider, error) {
	data, err := os.ReadFile(deploymentPath)
	if err != nil {
		altPaths := []string{
			"../contracts/trustchain-task3-s1/deployments/localhost.json",
			"../contracts/trustchain-task6-s1/deployments/localhost.json",
			"contracts/trustchain-task3-s1/deployments/localhost.json",
			"contracts/trustchain-task6-s1/deployments/localhost.json",
		}
		for _, alt := range altPaths {
			if d, altErr := os.ReadFile(alt); altErr == nil {
				data = d
				err = nil
				break
			}
		}
		if err != nil {
			return nil, fmt.Errorf("hardhat provider: reading deployment file %q: %w", deploymentPath, err)
		}
	}

	var dep hardhatDeployment
	if err := json.Unmarshal(data, &dep); err != nil {
		return nil, fmt.Errorf("hardhat provider: parsing deployment file: %w", err)
	}

	tt, ok := dep.Contracts["TrustToken"]
	if !ok {
		return nil, fmt.Errorf("hardhat provider: TrustToken not found in deployment")
	}
	ur, ok := dep.Contracts["UserRegistry"]
	if !ok {
		return nil, fmt.Errorf("hardhat provider: UserRegistry not found in deployment")
	}

	p := &HardhatProvider{
		rpcURL:           rpcURL,
		trustTokenAddr:   strings.ToLower(tt.Address),
		userRegistryAddr: strings.ToLower(ur.Address),
		deployerAddr:     strings.ToLower(dep.Deployer),
		httpClient:       &http.Client{Timeout: 15 * time.Second},
	}

	// Auto-register the deployer so checkIn() calls work on first use.
	if err := p.ensureDeployerRegistered(context.Background()); err != nil {
		// Non-fatal: log but continue. The first real checkIn will fail and
		// the error will surface through the normal flow.
		fmt.Printf("[HardhatProvider] warning: could not auto-register deployer: %v\n", err)
	}

	return p, nil
}

// ── ports.BlockchainProvider ───────────────────────────────────────────────────

// GetBalance returns the TrustToken (TRUST) balance for walletAddress.
// Calls TrustToken.balanceOf(address) on-chain and converts from 18-decimal
// wei to a whole-token integer.
func (p *HardhatProvider) GetBalance(_ context.Context, walletAddress string) (*ports.BalanceResult, error) {
	// balanceOf(address) — compute selector at runtime to avoid drift
	sel := "0x" + hex.EncodeToString(keccak256Sum([]byte("balanceOf(address)"))[:4])
	data := sel + encodeAddress(walletAddress)
	result, err := p.ethCall(p.trustTokenAddr, data)
	if err != nil {
		return nil, fmt.Errorf("GetBalance eth_call: %w", err)
	}

	raw := strings.TrimPrefix(result, "0x")
	if raw == "" {
		raw = "0"
	}
	balWei := new(big.Int)
	balWei.SetString(raw, 16)

	// Divide by 10^18 to get whole tokens.
	divisor := new(big.Int).Exp(big.NewInt(10), big.NewInt(18), nil)
	balTokens := new(big.Int).Div(balWei, divisor)

	return &ports.BalanceResult{
		WalletAddress: walletAddress,
		Balance:       balTokens.Int64(),
		Symbol:        "TRUST",
		Decimals:      18,
	}, nil
}

// SubmitCheckin records a check-in for userID at poiID on-chain.
// It builds a keccak256 hash from (userID + poiID + unix-timestamp) and calls
// UserRegistry.checkIn(bytes32). The deployer address (Hardhat account 0) acts
// as the signing account so no external wallet is needed.
func (p *HardhatProvider) SubmitCheckin(_ context.Context, userID, poiID string) (*ports.TxResult, error) {
	// Build the check-in hash identically to contractService.js so the chain
	// rejects replays correctly.
	ts := fmt.Sprintf("%d", time.Now().UnixNano())
	raw := userID + ":" + poiID + ":" + ts
	hash := keccak256Sum([]byte(raw))

	// checkIn(bytes32) — compute selector at runtime
	sel := "0x" + hex.EncodeToString(keccak256Sum([]byte("checkIn(bytes32)"))[:4])
	hashHex := hex.EncodeToString(hash)
	data := sel + hashHex

	txHash, err := p.ethSendTransaction(p.deployerAddr, p.userRegistryAddr, data)
	if err != nil {
		return nil, fmt.Errorf("SubmitCheckin eth_sendTransaction: %w", err)
	}

	return &ports.TxResult{TxHash: txHash, Status: "pending"}, nil
}

// RewardUser mints amount TRUST tokens to userID's address.
// Calls TrustToken.mint(address, uint256). Requires the deployer to be an
// authorized controller on TrustToken (set by deploy.js via setController).
func (p *HardhatProvider) RewardUser(_ context.Context, userID string, amount int64) (*ports.TxResult, error) {
	// mint(address,uint256) — compute selector at runtime
	sel := "0x" + hex.EncodeToString(keccak256Sum([]byte("mint(address,uint256)"))[:4])
	amountWei := new(big.Int).Mul(big.NewInt(amount), new(big.Int).Exp(big.NewInt(10), big.NewInt(18), nil))
	data := sel + encodeAddress(userID) + encodeBigInt(amountWei)

	txHash, err := p.ethSendTransaction(p.deployerAddr, p.trustTokenAddr, data)
	if err != nil {
		return nil, fmt.Errorf("RewardUser eth_sendTransaction: %w", err)
	}

	return &ports.TxResult{TxHash: txHash, Status: "pending"}, nil
}

// GetTransactionStatus queries the receipt for txHash and returns its status.
func (p *HardhatProvider) GetTransactionStatus(_ context.Context, txHash string) (*ports.TxStatusResult, error) {
	result, err := p.rpcCall("eth_getTransactionReceipt", []interface{}{txHash})
	if err != nil {
		return nil, fmt.Errorf("GetTransactionStatus: %w", err)
	}

	if string(result) == "null" {
		return &ports.TxStatusResult{TxHash: txHash, Status: "pending"}, nil
	}

	var receipt struct {
		BlockNumber string `json:"blockNumber"`
		Status      string `json:"status"`
	}
	if err := json.Unmarshal(result, &receipt); err != nil {
		return nil, fmt.Errorf("decoding receipt: %w", err)
	}

	status := "confirmed"
	if receipt.Status == "0x0" {
		status = "failed"
	}

	var blockNum *int64
	if receipt.BlockNumber != "" {
		raw := strings.TrimPrefix(receipt.BlockNumber, "0x")
		n := new(big.Int)
		n.SetString(raw, 16)
		v := n.Int64()
		blockNum = &v
	}

	return &ports.TxStatusResult{TxHash: txHash, Status: status, BlockNumber: blockNum}, nil
}

// ── Internal helpers ───────────────────────────────────────────────────────────

// ensureDeployerRegistered calls UserRegistry.registerUser() from the deployer
// address. Harmless if already registered (the contract rejects duplicates, but
// we silently ignore that error).
func (p *HardhatProvider) ensureDeployerRegistered(ctx context.Context) error {
	// First check if already registered: isRegistered(address) → 0x...
	// isRegistered(address) selector: keccak256("isRegistered(address)")[0:4]
	isRegSel := "0x" + hex.EncodeToString(keccak256Sum([]byte("isRegistered(address)"))[:4])
	res, err := p.ethCall(p.userRegistryAddr, isRegSel+encodeAddress(p.deployerAddr))
	if err == nil {
		raw := strings.TrimPrefix(res, "0x")
		if len(raw) > 0 && raw[len(raw)-1] == '1' {
			return nil // already registered
		}
	}

	// registerUser() → selector: keccak256("registerUser()")[0:4]
	regSel := "0x" + hex.EncodeToString(keccak256Sum([]byte("registerUser()"))[:4])
	_, err = p.ethSendTransaction(p.deployerAddr, p.userRegistryAddr, regSel)
	if err != nil && !strings.Contains(err.Error(), "already registered") {
		return err
	}
	return nil
}

func (p *HardhatProvider) ethCall(to, data string) (string, error) {
	params := []interface{}{
		map[string]string{"to": to, "data": data},
		"latest",
	}
	result, err := p.rpcCall("eth_call", params)
	if err != nil {
		return "", err
	}
	var s string
	if err := json.Unmarshal(result, &s); err != nil {
		return "", fmt.Errorf("decoding eth_call result: %w", err)
	}
	return s, nil
}

func (p *HardhatProvider) ethSendTransaction(from, to, data string) (string, error) {
	// Hardhat auto-unlocks all its genesis accounts, so no signing needed.
	params := []interface{}{
		map[string]string{
			"from": from,
			"to":   to,
			"data": data,
			"gas":  "0x493E0", // 300,000 gas limit
		},
	}
	result, err := p.rpcCall("eth_sendTransaction", params)
	if err != nil {
		return "", err
	}
	var txHash string
	if err := json.Unmarshal(result, &txHash); err != nil {
		return "", fmt.Errorf("decoding tx hash: %w", err)
	}
	return txHash, nil
}

func (p *HardhatProvider) rpcCall(method string, params []interface{}) (json.RawMessage, error) {
	req := rpcRequest{
		JSONRPC: "2.0",
		Method:  method,
		Params:  params,
		ID:      p.idCounter.Add(1),
	}
	body, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	resp, err := p.httpClient.Post(p.rpcURL, "application/json", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("JSON-RPC %s: %w", method, err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading JSON-RPC response: %w", err)
	}

	var rpcResp rpcResponse
	if err := json.Unmarshal(raw, &rpcResp); err != nil {
		return nil, fmt.Errorf("parsing JSON-RPC response: %w", err)
	}

	if rpcResp.Error != nil {
		return nil, fmt.Errorf("JSON-RPC error %d: %s", rpcResp.Error.Code, rpcResp.Error.Message)
	}

	return rpcResp.Result, nil
}

// ── ABI encoding helpers ───────────────────────────────────────────────────────

// keccak256Sum computes the Keccak-256 hash (Ethereum's hash function).
// Uses golang.org/x/crypto/sha3 which is already in the project's go.sum.
func keccak256Sum(data []byte) []byte {
	h := sha3.NewLegacyKeccak256()
	h.Write(data)
	return h.Sum(nil)
}

// encodeAddress ABI-encodes an Ethereum address as a 32-byte (64 hex char)
// left-zero-padded value, as required by the Solidity ABI spec.
// NOTE: fmt.Sprintf("%064s", s) pads with spaces — wrong for ABI.
// This function explicitly zero-pads instead.
func encodeAddress(addr string) string {
	clean := strings.ToLower(strings.TrimPrefix(addr, "0x"))
	if len(clean) > 64 {
		clean = clean[len(clean)-40:] // keep only the 20-byte address part
	}
	return strings.Repeat("0", 64-len(clean)) + clean
}

// encodeBigInt ABI-encodes a *big.Int as a 32-byte big-endian hex string.
func encodeBigInt(n *big.Int) string {
	b := n.Bytes()
	// Pad to 32 bytes.
	padded := make([]byte, 32)
	copy(padded[32-len(b):], b)
	return hex.EncodeToString(padded)
}
