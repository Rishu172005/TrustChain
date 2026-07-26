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

// POIRepository implements ports.POIRepository against MongoDB.
type POIRepository struct {
	coll *mongo.Collection
}

// NewPOIRepository constructs a POIRepository using the given database handle.
func NewPOIRepository(db *mongo.Database) *POIRepository {
	return &POIRepository{coll: db.Collection("pois")}
}

// FindAll returns all active POIs, optionally filtered by category.
func (r *POIRepository) FindAll(ctx context.Context, category string, limit int) ([]models.POI, error) {
	filter := bson.D{{Key: "isActive", Value: true}}
	if category != "" {
		filter = append(filter, bson.E{Key: "category", Value: category})
	}

	opts := options.Find().SetLimit(int64(limit))
	cursor, err := r.coll.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("querying pois: %w", err)
	}
	defer cursor.Close(ctx)

	var pois []models.POI
	if err := cursor.All(ctx, &pois); err != nil {
		return nil, fmt.Errorf("decoding pois: %w", err)
	}
	return pois, nil
}

// FindNearby returns active POIs within radiusMetres of the given coordinates.
func (r *POIRepository) FindNearby(ctx context.Context, lat, lon, radiusMetres float64, category string, limit int) ([]models.POI, error) {
	filter := bson.D{
		{Key: "isActive", Value: true},
		{Key: "location", Value: bson.D{
			{Key: "$near", Value: bson.D{
				{Key: "$geometry", Value: bson.D{
					{Key: "type", Value: "Point"},
					{Key: "coordinates", Value: bson.A{lon, lat}},
				}},
				{Key: "$maxDistance", Value: radiusMetres},
			}},
		}},
	}
	if category != "" {
		filter = append(filter, bson.E{Key: "category", Value: category})
	}

	opts := options.Find().SetLimit(int64(limit))
	cursor, err := r.coll.Find(ctx, filter, opts)
	if err != nil {
		return nil, fmt.Errorf("geo querying pois: %w", err)
	}
	defer cursor.Close(ctx)

	var pois []models.POI
	if err := cursor.All(ctx, &pois); err != nil {
		return nil, fmt.Errorf("decoding nearby pois: %w", err)
	}
	return pois, nil
}

// FindByID returns a single POI by its ObjectID string.
func (r *POIRepository) FindByID(ctx context.Context, id string) (*models.POI, error) {
	oid, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, fmt.Errorf("invalid poi id %q: %w", id, err)
	}

	var poi models.POI
	if err := r.coll.FindOne(ctx, bson.D{{Key: "_id", Value: oid}}).Decode(&poi); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, fmt.Errorf("finding poi by id: %w", err)
	}
	return &poi, nil
}

// Insert persists a new POI document and assigns its generated ObjectID.
func (r *POIRepository) Insert(ctx context.Context, poi *models.POI) error {
	poi.ID = primitive.NewObjectID()
	if _, err := r.coll.InsertOne(ctx, poi); err != nil {
		return fmt.Errorf("inserting poi: %w", err)
	}
	return nil
}
