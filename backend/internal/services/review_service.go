package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/rs/zerolog"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/trustchain/backend/internal/models"
	"github.com/trustchain/backend/internal/ports"
)

// ReviewRequest carries the validated input for a review submission.
type ReviewRequest struct {
	UserID string
	POIID  string
	Rating int32
	Body   string
}

// ReviewService handles review validation and persistence.
type ReviewService struct {
	reviewRepo ports.ReviewRepository
	poiRepo    ports.POIRepository
	log        zerolog.Logger
}

// NewReviewService constructs a ReviewService with all required dependencies.
func NewReviewService(
	reviewRepo ports.ReviewRepository,
	poiRepo ports.POIRepository,
	log zerolog.Logger,
) *ReviewService {
	return &ReviewService{
		reviewRepo: reviewRepo,
		poiRepo:    poiRepo,
		log:        log.With().Str("service", "review").Logger(),
	}
}

// CreateReview validates the submission, confirms the POI exists (if in DB), and persists the review.
// NOTE: If the POI is not in MongoDB (demo mode with static data) the service
// logs a warning but still saves the review.
func (s *ReviewService) CreateReview(ctx context.Context, req ReviewRequest) (*models.Review, error) {
	poi, err := s.poiRepo.FindByID(ctx, req.POIID)
	if err != nil {
		s.log.Warn().Err(err).Str("poiId", req.POIID).Msg("POI lookup failed; saving review anyway")
	}
	if poi == nil {
		s.log.Info().Str("poiId", req.POIID).Msg("POI not in DB; saving review in demo mode")
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
	review := &models.Review{
		UserID:    userOID,
		POIID:     poiOID,
		Rating:    req.Rating,
		Body:      strings.TrimSpace(req.Body),
		Sentiment: models.ReviewSentiment{},
		Moderation: models.ReviewModeration{
			Status:    models.ModerationApproved,
			FlagCount: 0,
		},
		IsVisible:     true,
		SchemaVersion: 1,
		Timestamps: models.Timestamps{
			CreatedAt: now,
			UpdatedAt: now,
		},
	}

	if err := s.reviewRepo.Insert(ctx, review); err != nil {
		return nil, fmt.Errorf("persisting review: %w", err)
	}

	return review, nil
}
