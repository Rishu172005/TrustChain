package services_test

import (
	"context"
	"errors"
	"testing"

	"github.com/rs/zerolog"

	"github.com/trustchain/backend/internal/models"
	"github.com/trustchain/backend/internal/services"
)

func TestReviewService_CreateReview_Success(t *testing.T) {
	poi := samplePOI()

	poiRepo := &mockPOIRepository{
		findByIDFn: func(_ context.Context, id string) (*models.POI, error) {
			return poi, nil
		},
	}
	reviewRepo := &mockReviewRepository{
		insertFn: func(_ context.Context, r *models.Review) error { return nil },
	}

	svc := services.NewReviewService(reviewRepo, poiRepo, zerolog.Nop())
	review, err := svc.CreateReview(context.Background(), services.ReviewRequest{
		UserID: validUserID(),
		POIID:  poi.ID.Hex(),
		Rating: 5,
		Body:   "Excellent place.",
	})

	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if review.Rating != 5 {
		t.Errorf("expected rating 5, got %d", review.Rating)
	}
	if review.Body != "Excellent place." {
		t.Errorf("unexpected review body: %q", review.Body)
	}
	if review.Moderation.Status != models.ModerationApproved {
		t.Errorf("expected moderation status 'approved', got %q", review.Moderation.Status)
	}
	if !review.IsVisible {
		t.Error("expected review to be visible")
	}
}

func TestReviewService_CreateReview_POINotFound(t *testing.T) {
	poiRepo := &mockPOIRepository{
		findByIDFn: func(_ context.Context, id string) (*models.POI, error) {
			return nil, nil
		},
	}
	reviewRepo := &mockReviewRepository{}

	svc := services.NewReviewService(reviewRepo, poiRepo, zerolog.Nop())
	_, err := svc.CreateReview(context.Background(), services.ReviewRequest{
		UserID: validUserID(),
		POIID:  validPOIID(),
		Rating: 4,
		Body:   "Good spot.",
	})

	if !errors.Is(err, services.ErrPOINotFound) {
		t.Errorf("expected ErrPOINotFound, got: %v", err)
	}
}

func TestReviewService_CreateReview_RepositoryError(t *testing.T) {
	poi := samplePOI()
	poiRepo := &mockPOIRepository{
		findByIDFn: func(_ context.Context, id string) (*models.POI, error) {
			return poi, nil
		},
	}
	reviewRepo := &mockReviewRepository{
		insertFn: func(_ context.Context, r *models.Review) error {
			return errors.New("mongo write failed")
		},
	}

	svc := services.NewReviewService(reviewRepo, poiRepo, zerolog.Nop())
	_, err := svc.CreateReview(context.Background(), services.ReviewRequest{
		UserID: validUserID(),
		POIID:  poi.ID.Hex(),
		Rating: 3,
		Body:   "Decent.",
	})

	if err == nil {
		t.Fatal("expected error from repository failure, got nil")
	}
}

func TestReviewService_CreateReview_BodyIsTrimmed(t *testing.T) {
	poi := samplePOI()
	poiRepo := &mockPOIRepository{
		findByIDFn: func(_ context.Context, id string) (*models.POI, error) {
			return poi, nil
		},
	}
	reviewRepo := &mockReviewRepository{
		insertFn: func(_ context.Context, r *models.Review) error { return nil },
	}

	svc := services.NewReviewService(reviewRepo, poiRepo, zerolog.Nop())
	review, err := svc.CreateReview(context.Background(), services.ReviewRequest{
		UserID: validUserID(),
		POIID:  poi.ID.Hex(),
		Rating: 4,
		Body:   "  Great place.  ",
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if review.Body != "Great place." {
		t.Errorf("expected trimmed body, got %q", review.Body)
	}
}
