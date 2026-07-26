package services_test

import (
	"context"

	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/trustchain/backend/internal/models"
	"github.com/trustchain/backend/internal/ports"
)

// ── POI Repository Mock ───────────────────────────────────────────────────────

type mockPOIRepository struct {
	findByIDFn   func(ctx context.Context, id string) (*models.POI, error)
	findAllFn    func(ctx context.Context, category string, limit int) ([]models.POI, error)
	findNearbyFn func(ctx context.Context, lat, lon, radius float64, category string, limit int) ([]models.POI, error)
	insertFn     func(ctx context.Context, poi *models.POI) error
}

func (m *mockPOIRepository) FindByID(ctx context.Context, id string) (*models.POI, error) {
	return m.findByIDFn(ctx, id)
}
func (m *mockPOIRepository) FindAll(ctx context.Context, category string, limit int) ([]models.POI, error) {
	return m.findAllFn(ctx, category, limit)
}
func (m *mockPOIRepository) FindNearby(ctx context.Context, lat, lon, radius float64, category string, limit int) ([]models.POI, error) {
	return m.findNearbyFn(ctx, lat, lon, radius, category, limit)
}
func (m *mockPOIRepository) Insert(ctx context.Context, poi *models.POI) error {
	return m.insertFn(ctx, poi)
}

// ── CheckIn Repository Mock ───────────────────────────────────────────────────

type mockCheckInRepository struct {
	insertFn           func(ctx context.Context, checkin *models.CheckIn) error
	findByUserAndPOIFn func(ctx context.Context, userID, poiID string) (*models.CheckIn, error)
	findByIDFn         func(ctx context.Context, id string) (*models.CheckIn, error)
	findByUserFn       func(ctx context.Context, userID string) ([]models.CheckIn, error)
}

func (m *mockCheckInRepository) FindByUser(ctx context.Context, userID string) ([]models.CheckIn, error) {
	return m.findByUserFn(ctx, userID)
}

func (m *mockCheckInRepository) Insert(ctx context.Context, checkin *models.CheckIn) error {
	return m.insertFn(ctx, checkin)
}
func (m *mockCheckInRepository) FindByUserAndPOI(ctx context.Context, userID, poiID string) (*models.CheckIn, error) {
	return m.findByUserAndPOIFn(ctx, userID, poiID)
}
func (m *mockCheckInRepository) FindByID(ctx context.Context, id string) (*models.CheckIn, error) {
	return m.findByIDFn(ctx, id)
}

// ── Review Repository Mock ────────────────────────────────────────────────────

type mockReviewRepository struct {
	insertFn     func(ctx context.Context, review *models.Review) error
	findByPOIFn  func(ctx context.Context, poiID string) ([]models.Review, error)
	findByUserFn func(ctx context.Context, userID string) ([]models.Review, error)
}

func (m *mockReviewRepository) Insert(ctx context.Context, review *models.Review) error {
	return m.insertFn(ctx, review)
}
func (m *mockReviewRepository) FindByPOI(ctx context.Context, poiID string) ([]models.Review, error) {
	return m.findByPOIFn(ctx, poiID)
}
func (m *mockReviewRepository) FindByUser(ctx context.Context, userID string) ([]models.Review, error) {
	return m.findByUserFn(ctx, userID)
}

// ── Blockchain Provider Mock ──────────────────────────────────────────────────

type mockBlockchainProvider struct {
	getBalanceFn           func(ctx context.Context, wallet string) (*ports.BalanceResult, error)
	submitCheckinFn        func(ctx context.Context, userID, poiID string) (*ports.TxResult, error)
	rewardUserFn           func(ctx context.Context, userID string, amount int64) (*ports.TxResult, error)
	getTransactionStatusFn func(ctx context.Context, txHash string) (*ports.TxStatusResult, error)
}

func (m *mockBlockchainProvider) GetBalance(ctx context.Context, wallet string) (*ports.BalanceResult, error) {
	return m.getBalanceFn(ctx, wallet)
}
func (m *mockBlockchainProvider) SubmitCheckin(ctx context.Context, userID, poiID string) (*ports.TxResult, error) {
	return m.submitCheckinFn(ctx, userID, poiID)
}
func (m *mockBlockchainProvider) RewardUser(ctx context.Context, userID string, amount int64) (*ports.TxResult, error) {
	return m.rewardUserFn(ctx, userID, amount)
}
func (m *mockBlockchainProvider) GetTransactionStatus(ctx context.Context, txHash string) (*ports.TxStatusResult, error) {
	return m.getTransactionStatusFn(ctx, txHash)
}

// ── Test Fixtures ─────────────────────────────────────────────────────────────

func samplePOI() *models.POI {
	return &models.POI{
		ID:       primitive.NewObjectID(),
		Name:     "Test Cafe",
		Category: "cafe",
		Location: models.NewGeoJSONPoint(40.7128, -74.0060),
		IsActive: true,
	}
}

func validUserID() string { return primitive.NewObjectID().Hex() }
func validPOIID() string  { return primitive.NewObjectID().Hex() }
