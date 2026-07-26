package repositories

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/trustchain/backend/internal/models"
)

// ReviewRepository implements ports.ReviewRepository against MongoDB.
type ReviewRepository struct {
	coll *mongo.Collection
}

// NewReviewRepository constructs a ReviewRepository using the given database handle.
func NewReviewRepository(db *mongo.Database) *ReviewRepository {
	return &ReviewRepository{coll: db.Collection("reviews")}
}

// Insert persists a new review document and assigns its generated ObjectID.
func (r *ReviewRepository) Insert(ctx context.Context, review *models.Review) error {
	review.ID = primitive.NewObjectID()
	if _, err := r.coll.InsertOne(ctx, review); err != nil {
		return fmt.Errorf("inserting review: %w", err)
	}
	return nil
}

// FindByPOI returns all visible, approved reviews for a POI, newest first.
func (r *ReviewRepository) FindByPOI(ctx context.Context, poiID string) ([]models.Review, error) {
	pid, err := primitive.ObjectIDFromHex(poiID)
	if err != nil {
		return nil, fmt.Errorf("invalid poiId %q: %w", poiID, err)
	}

	filter := bson.D{
		{Key: "poiId", Value: pid},
		{Key: "isVisible", Value: true},
		{Key: "moderation.status", Value: models.ModerationApproved},
	}
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := r.coll.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("querying reviews by poi: %w", err)
	}
	defer cursor.Close(ctx)

	var reviews []models.Review
	if err := cursor.All(ctx, &reviews); err != nil {
		return nil, fmt.Errorf("decoding reviews: %w", err)
	}
	return reviews, nil
}

// FindByUser returns all visible reviews written by a user, newest first.
func (r *ReviewRepository) FindByUser(ctx context.Context, userID string) ([]models.Review, error) {
	uid, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid userId %q: %w", userID, err)
	}

	filter := bson.D{
		{Key: "userId", Value: uid},
		{Key: "isVisible", Value: true},
	}
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})

	cursor, err := r.coll.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("querying reviews by user: %w", err)
	}
	defer cursor.Close(ctx)

	var reviews []models.Review
	if err := cursor.All(ctx, &reviews); err != nil {
		return nil, fmt.Errorf("decoding user reviews: %w", err)
	}
	return reviews, nil
}
