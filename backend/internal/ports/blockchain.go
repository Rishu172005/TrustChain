package ports

import "context"

// BalanceResult is returned by BlockchainProvider.GetBalance.
type BalanceResult struct {
	WalletAddress string
	Balance       int64
	Symbol        string
	Decimals      int
}

// TxResult is returned by write operations on the blockchain.
type TxResult struct {
	TxHash string
	Status string
}

// TxStatusResult is returned by BlockchainProvider.GetTransactionStatus.
type TxStatusResult struct {
	TxHash      string
	Status      string
	BlockNumber *int64
}

// BlockchainProvider abstracts all interactions with the underlying blockchain network.
// Swap MockBlockchainProvider for PolygonProvider by changing BLOCKCHAIN_PROVIDER in config.
type BlockchainProvider interface {
	GetBalance(ctx context.Context, walletAddress string) (*BalanceResult, error)
	SubmitCheckin(ctx context.Context, userID, poiID string) (*TxResult, error)
	RewardUser(ctx context.Context, userID string, amount int64) (*TxResult, error)
	GetTransactionStatus(ctx context.Context, txHash string) (*TxStatusResult, error)
}
