package repositories

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"

	"github.com/trustchain/backend/internal/models"
)

// CheckInRepository implements ports.CheckInRepository against MongoDB.
type CheckInRepository struct {
	coll *mongo.Collection
}

// NewCheckInRepository constructs a CheckInRepository using the given database handle.
func NewCheckInRepository(db *mongo.Database) *CheckInRepository {
	return &CheckInRepository{coll: db.Collection("checkins")}
}

// Insert persists a new check-in document and assigns its generated ObjectID.
func (r *CheckInRepository) Insert(ctx context.Context, checkin *models.CheckIn) error {
	checkin.ID = primitive.NewObjectID()
	if _, err := r.coll.InsertOne(ctx, checkin); err != nil {
		return fmt.Errorf("inserting checkin: %w", err)
	}
	return nil
}

// FindByUserAndPOI returns the most recent check-in for a given user/POI pair,
// or nil if no such check-in exists.
func (r *CheckInRepository) FindByUserAndPOI(ctx context.Context, userID, poiID string) (*models.CheckIn, error) {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid userId %q: %w", userID, err)
	}
	pid, err := primitive.ObjectIDFromHex(poiID)
	if err != nil {
		return nil, fmt.Errorf("invalid poiId %q: %w", poiID, err)
	}

	filter := bson.D{
		{Key: "userId", Value: uid},
		{Key: "poiId", Value: pid},
	}

	var checkin models.CheckIn
	if err := r.coll.FindOne(ctx, filter).Decode(&checkin); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, fmt.Errorf("finding checkin by user and poi: %w", err)
	}
	return &checkin, nil
}

// FindByID returns a check-in by its ObjectID string, or nil if not found.
func (r *CheckInRepository) FindByID(ctx context.Context, id string) (*models.CheckIn, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("invalid checkin id %q: %w", id, err)
	}

	var checkin models.CheckIn
	if err := r.coll.FindOne(ctx, bson.D{{Key: "_id", Value: oid}}).Decode(&checkin); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, fmt.Errorf("finding checkin by id: %w", err)
	}
	return &checkin, nil
}
