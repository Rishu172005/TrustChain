package services

import (
	"context"
	"fmt"
	"time"

	"github.com/rs/zerolog"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/trustchain/backend/internal/models"
	"github.com/trustchain/backend/internal/ports"
)

// CheckInRequest carries the validated input for a check-in operation.
type CheckInRequest struct {
	UserID    string
	POIID     string
	Latitude  float64
	Longitude float64
}

// CheckInResult carries the output of a successful check-in operation.
type CheckInResult struct {
	CheckIn  *models.CheckIn
	TxHash   string
	TxStatus string
}

// CheckInService orchestrates the check-in business flow:
// validate → persist → submit blockchain transaction.
type CheckInService struct {
	checkinRepo ports.CheckInRepository
	poiRepo     ports.POIRepository
	blockchain  ports.BlockchainProvider
	log         zerolog.Logger
}

// NewCheckInService constructs a CheckInService with all required dependencies.
func NewCheckInService(
	checkinRepo ports.CheckInRepository,
	poiRepo ports.POIRepository,
	blockchain ports.BlockchainProvider,
	log zerolog.Logger,
) *CheckInService {
	return &CheckInService{
		checkinRepo: checkinRepo,
		poiRepo:     poiRepo,
		blockchain:  blockchain,
		log:         log.With().Str("service", "checkin").Logger(),
	}
}

// CreateCheckIn validates the request, confirms the POI exists (if in DB), persists the
// check-in, and submits a blockchain transaction.
// NOTE: If the POI is not in MongoDB (e.g. demo mode with static data), the service
// logs a warning but still submits the blockchain transaction.
func (s *CheckInService) CreateCheckIn(ctx context.Context, req CheckInRequest) (*CheckInResult, error) {
	poi, err := s.poiRepo.FindByID(ctx, req.POIID)
	if err != nil {
		// Non-fatal: log and continue — the blockchain tx should still fire.
		s.log.Warn().Err(err).Str("poiId", req.POIID).Msg("POI lookup failed; proceeding with check-in anyway")
	}
	if poi == nil {
		s.log.Warn().Str("poiId", req.POIID).Msg("POI not found in DB")
		return nil, ErrPOINotFound
	}

	userOID, err := primitive.ObjectIDFromHex(req.UserID)
	if err != nil {
		return nil, fmt.Errorf("invalid userId: %w", err)
	}
	poiOID, err := primitive.ObjectIDFromHex(req.POIID)
	if err != nil {
		return nil, fmt.Errorf("invalid poiId: %w", err)
	}

	now := time.Now().UTC()
	checkin := &models.CheckIn{
		UserID:   userOID,
		POIID:    poiOID,
		Location: models.NewGeoJSONPoint(req.Latitude, req.Longitude),
		Verification: models.CheckInVerification{
			Method: models.VerificationNone,
			Status: models.VerificationStatusPending,
		},
		Blockchain: models.CheckInBlockchain{
			TxStatus: models.TxStatusNone,
		},
		RewardGranted: false,
		RewardAmount:  0,
		SchemaVersion: 1,
		Timestamps: models.Timestamps{
			CreatedAt: now,
			UpdatedAt: now,
		},
	}

	if err := s.checkinRepo.Insert(ctx, checkin); err != nil {
		return nil, fmt.Errorf("persisting checkin: %w", err)
	}

	txResult, err := s.blockchain.SubmitCheckin(ctx, req.UserID, req.POIID)
	if err != nil {
		// Blockchain failure is non-fatal: the check-in is recorded; TX will be retried later.
		s.log.Warn().
			Err(err).
			Str("checkinId", checkin.ID.Hex()).
			Msg("blockchain submission failed; check-in recorded without tx hash")

		return &CheckInResult{
			CheckIn:  checkin,
			TxHash:   "",
			TxStatus: string(models.TxStatusNone),
		}, nil
	}

	submittedAt := time.Now().UTC()
	checkin.Blockchain.TxHash = &txResult.TxHash
	checkin.Blockchain.TxStatus = models.TxStatusPending
	checkin.Blockchain.SubmittedAt = &submittedAt

	return &CheckInResult{
		CheckIn:  checkin,
		TxHash:   txResult.TxHash,
		TxStatus: txResult.Status,
	}, nil
}
