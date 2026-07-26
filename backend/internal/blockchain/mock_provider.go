package blockchain

import (
	"context"
	"fmt"

	"github.com/trustchain/backend/internal/ports"
)

// MockBlockchainProvider implements ports.BlockchainProvider with deterministic
// in-memory responses. It is the active provider when BLOCKCHAIN_PROVIDER=mock.
type MockBlockchainProvider struct{}

// NewMockBlockchainProvider constructs a MockBlockchainProvider.
func NewMockBlockchainProvider() *MockBlockchainProvider {
	return &MockBlockchainProvider{}
}

// GetBalance returns a static mock balance for any wallet address.
func (p *MockBlockchainProvider) GetBalance(_ context.Context, walletAddress string) (*ports.BalanceResult, error) {
	return &ports.BalanceResult{
		WalletAddress: walletAddress,
		Balance:       100,
		Symbol:        "TCT",
		Decimals:      18,
	}, nil
}

// SubmitCheckin returns a mock transaction hash for a check-in event.
func (p *MockBlockchainProvider) SubmitCheckin(_ context.Context, userID, poiID string) (*ports.TxResult, error) {
	uPart := userID
	if len(uPart) > 6 {
		uPart = uPart[:6]
	}
	pPart := poiID
	if len(pPart) > 6 {
		pPart = pPart[:6]
	}
	return &ports.TxResult{
		TxHash: fmt.Sprintf("0xmock_%s_%s", uPart, pPart),
		Status: "pending",
	}, nil
}

// RewardUser returns a mock transaction hash for a token reward operation.
func (p *MockBlockchainProvider) RewardUser(_ context.Context, userID string, amount int64) (*ports.TxResult, error) {
	uPart := userID
	if len(uPart) > 6 {
		uPart = uPart[:6]
	}
	return &ports.TxResult{
		TxHash: fmt.Sprintf("0xreward_%s_%d", uPart, amount),
		Status: "pending",
	}, nil
}

// GetTransactionStatus returns a mock confirmed status for any transaction hash.
func (p *MockBlockchainProvider) GetTransactionStatus(_ context.Context, txHash string) (*ports.TxStatusResult, error) {
	blockNum := int64(12345678)
	return &ports.TxStatusResult{
		TxHash:      txHash,
		Status:      "confirmed",
		BlockNumber: &blockNum,
	}, nil
}
