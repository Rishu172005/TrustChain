package blockchain

import (
	"context"
	"fmt"

	"github.com/trustchain/backend/internal/ports"
)

// PolygonProvider will implement ports.BlockchainProvider against the Polygon network.
// Activated when BLOCKCHAIN_PROVIDER=polygon.
// This stub satisfies the interface so the compiler verifies the contract is complete.
type PolygonProvider struct {
	rpcEndpoint  string
	contractAddr string
}

// NewPolygonProvider constructs a PolygonProvider with the given RPC endpoint and contract address.
func NewPolygonProvider(rpcEndpoint, contractAddr string) *PolygonProvider {
	return &PolygonProvider{
		rpcEndpoint:  rpcEndpoint,
		contractAddr: contractAddr,
	}
}

// GetBalance is not yet implemented; the real implementation will query the deployed contract.
func (p *PolygonProvider) GetBalance(_ context.Context, walletAddress string) (*ports.BalanceResult, error) {
	return nil, fmt.Errorf("PolygonProvider.GetBalance: not yet implemented — deploy smart contract first")
}

// SubmitCheckin is not yet implemented; the real implementation will submit an on-chain transaction.
func (p *PolygonProvider) SubmitCheckin(_ context.Context, userID, poiID string) (*ports.TxResult, error) {
	return nil, fmt.Errorf("PolygonProvider.SubmitCheckin: not yet implemented")
}

// RewardUser is not yet implemented; the real implementation will trigger a token transfer.
func (p *PolygonProvider) RewardUser(_ context.Context, userID string, amount int64) (*ports.TxResult, error) {
	return nil, fmt.Errorf("PolygonProvider.RewardUser: not yet implemented")
}

// GetTransactionStatus is not yet implemented; the real implementation will query the RPC node.
func (p *PolygonProvider) GetTransactionStatus(_ context.Context, txHash string) (*ports.TxStatusResult, error) {
	return nil, fmt.Errorf("PolygonProvider.GetTransactionStatus: not yet implemented")
}
