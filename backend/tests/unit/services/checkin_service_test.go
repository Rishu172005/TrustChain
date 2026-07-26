package services_test

import (
	"context"
	"errors"
	"testing"

	"github.com/rs/zerolog"

	"github.com/trustchain/backend/internal/models"
	"github.com/trustchain/backend/internal/ports"
	"github.com/trustchain/backend/internal/services"
)

func TestCheckInService_CreateCheckIn_Success(t *testing.T) {
	poi := samplePOI()
	userID := validUserID()
	poiID := poi.ID.Hex()

	poiRepo := &mockPOIRepository{
		findByIDFn: func(_ context.Context, id string) (*models.POI, error) {
			return poi, nil
		},
	}
	checkinRepo := &mockCheckInRepository{
		insertFn: func(_ context.Context, c *models.CheckIn) error {
			return nil
		},
	}
	blockchain := &mockBlockchainProvider{
		submitCheckinFn: func(_ context.Context, uID, pID string) (*ports.TxResult, error) {
			return &ports.TxResult{TxHash: "0xabc", Status: "pending"}, nil
		},
	}

	svc := services.NewCheckInService(checkinRepo, poiRepo, blockchain, zerolog.Nop())
	result, err := svc.CreateCheckIn(context.Background(), services.CheckInRequest{
		UserID:    userID,
		POIID:     poiID,
		Latitude:  40.7128,
		Longitude: -74.0060,
	})

	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if result == nil {
		t.Fatal("expected result, got nil")
	}
	if result.TxHash != "0xabc" {
		t.Errorf("expected txHash '0xabc', got %q", result.TxHash)
	}
	if result.CheckIn.Verification.Method != models.VerificationNone {
		t.Errorf("expected verification method 'none', got %q", result.CheckIn.Verification.Method)
	}
	if result.CheckIn.Verification.Status != models.VerificationStatusPending {
		t.Errorf("expected verification status 'pending', got %q", result.CheckIn.Verification.Status)
	}
}

func TestCheckInService_CreateCheckIn_POINotFound(t *testing.T) {
	poiRepo := &mockPOIRepository{
		findByIDFn: func(_ context.Context, id string) (*models.POI, error) {
			return nil, nil // nil, nil means not found
		},
	}
	checkinRepo := &mockCheckInRepository{}
	blockchain := &mockBlockchainProvider{}

	svc := services.NewCheckInService(checkinRepo, poiRepo, blockchain, zerolog.Nop())
	_, err := svc.CreateCheckIn(context.Background(), services.CheckInRequest{
		UserID:    validUserID(),
		POIID:     validPOIID(),
		Latitude:  40.7128,
		Longitude: -74.0060,
	})

	if !errors.Is(err, services.ErrPOINotFound) {
		t.Errorf("expected ErrPOINotFound, got: %v", err)
	}
}

func TestCheckInService_CreateCheckIn_BlockchainFailureIsNonFatal(t *testing.T) {
	poi := samplePOI()
	poiRepo := &mockPOIRepository{
		findByIDFn: func(_ context.Context, id string) (*models.POI, error) {
			return poi, nil
		},
	}
	checkinRepo := &mockCheckInRepository{
		insertFn: func(_ context.Context, c *models.CheckIn) error { return nil },
	}
	blockchain := &mockBlockchainProvider{
		submitCheckinFn: func(_ context.Context, uID, pID string) (*ports.TxResult, error) {
			return nil, errors.New("blockchain node unreachable")
		},
	}

	svc := services.NewCheckInService(checkinRepo, poiRepo, blockchain, zerolog.Nop())
	result, err := svc.CreateCheckIn(context.Background(), services.CheckInRequest{
		UserID:    validUserID(),
		POIID:     poi.ID.Hex(),
		Latitude:  40.7128,
		Longitude: -74.0060,
	})

	// Blockchain failure must NOT bubble up as an error — check-in is persisted
	if err != nil {
		t.Fatalf("expected no error despite blockchain failure, got: %v", err)
	}
	if result.TxHash != "" {
		t.Errorf("expected empty txHash on blockchain failure, got %q", result.TxHash)
	}
}

func TestCheckInService_CreateCheckIn_RepositoryError(t *testing.T) {
	poi := samplePOI()
	poiRepo := &mockPOIRepository{
		findByIDFn: func(_ context.Context, id string) (*models.POI, error) {
			return poi, nil
		},
	}
	checkinRepo := &mockCheckInRepository{
		insertFn: func(_ context.Context, c *models.CheckIn) error {
			return errors.New("mongo write failed")
		},
	}
	blockchain := &mockBlockchainProvider{}

	svc := services.NewCheckInService(checkinRepo, poiRepo, blockchain, zerolog.Nop())
	_, err := svc.CreateCheckIn(context.Background(), services.CheckInRequest{
		UserID:    validUserID(),
		POIID:     poi.ID.Hex(),
		Latitude:  40.7128,
		Longitude: -74.0060,
	})

	if err == nil {
		t.Fatal("expected error from repository failure, got nil")
	}
}
