package ports

import (
	"context"

	"github.com/trustchain/backend/internal/models"
)

// POIRepository defines all data-access operations for the pois collection.
type POIRepository interface {
	FindAll(ctx context.Context, category string, limit int) ([]models.POI, error)
	FindNearby(ctx context.Context, lat, lon float64, radiusMetres float64, category string, limit int) ([]models.POI, error)
	FindByID(ctx context.Context, id string) (*models.POI, error)
	Insert(ctx context.Context, poi *models.POI) error
}

// CheckInRepository defines all data-access operations for the checkins collection.
type CheckInRepository interface {
	Insert(ctx context.Context, checkin *models.CheckIn) error
	FindByUserAndPOI(ctx context.Context, userID, poiID string) (*models.CheckIn, error)
	FindByID(ctx context.Context, id string) (*models.CheckIn, error)
}

// ReviewRepository defines all data-access operations for the reviews collection.
type ReviewRepository interface {
	Insert(ctx context.Context, review *models.Review) error
	FindByPOI(ctx context.Context, poiID string) ([]models.Review, error)
	FindByUser(ctx context.Context, userID string) ([]models.Review, error)
}
