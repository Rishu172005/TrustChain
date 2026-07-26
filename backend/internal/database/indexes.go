package database

import (
	"context"
	"fmt"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// CreateIndexes applies all required indexes to every collection.
// This operation is idempotent — safe to call on every startup.
func CreateIndexes(ctx context.Context, db *mongo.Database) error {
	specs := []struct {
		collection string
		models     []mongo.IndexModel
	}{
		{
			collection: "users",
			models: []mongo.IndexModel{
				{
					Keys:    bson.D{{Key: "username", Value: 1}},
					Options: options.Index().SetUnique(true).SetName("idx_users_username"),
				},
				{
					Keys:    bson.D{{Key: "email", Value: 1}},
					Options: options.Index().SetUnique(true).SetName("idx_users_email"),
				},
				{
					Keys:    bson.D{{Key: "walletAddress", Value: 1}},
					Options: options.Index().SetUnique(true).SetSparse(true).SetName("idx_users_wallet"),
				},
			},
		},
		{
			collection: "pois",
			models: []mongo.IndexModel{
				{
					Keys:    bson.D{{Key: "location", Value: "2dsphere"}},
					Options: options.Index().SetName("idx_pois_location_2dsphere"),
				},
				{
					Keys:    bson.D{{Key: "category", Value: 1}},
					Options: options.Index().SetName("idx_pois_category"),
				},
				{
					Keys:    bson.D{{Key: "name", Value: "text"}},
					Options: options.Index().SetName("idx_pois_name_text"),
				},
				{
					Keys:    bson.D{{Key: "isActive", Value: 1}},
					Options: options.Index().SetName("idx_pois_isactive"),
				},
			},
		},
		{
			collection: "checkins",
			models: []mongo.IndexModel{
				{
					Keys:    bson.D{{Key: "userId", Value: 1}, {Key: "poiId", Value: 1}},
					Options: options.Index().SetName("idx_checkins_user_poi"),
				},
				{
					Keys:    bson.D{{Key: "poiId", Value: 1}},
					Options: options.Index().SetName("idx_checkins_poi"),
				},
				{
					Keys:    bson.D{{Key: "location", Value: "2dsphere"}},
					Options: options.Index().SetName("idx_checkins_location_2dsphere"),
				},
				{
					Keys:    bson.D{{Key: "blockchain.txHash", Value: 1}},
					Options: options.Index().SetSparse(true).SetName("idx_checkins_txhash"),
				},
				{
					Keys:    bson.D{{Key: "createdAt", Value: -1}},
					Options: options.Index().SetName("idx_checkins_createdat"),
				},
			},
		},
		{
			collection: "reviews",
			models: []mongo.IndexModel{
				{
					Keys:    bson.D{{Key: "poiId", Value: 1}, {Key: "createdAt", Value: -1}},
					Options: options.Index().SetName("idx_reviews_poi_createdat"),
				},
				{
					Keys:    bson.D{{Key: "userId", Value: 1}},
					Options: options.Index().SetName("idx_reviews_user"),
				},
				{
					Keys:    bson.D{{Key: "checkinId", Value: 1}},
					Options: options.Index().SetSparse(true).SetName("idx_reviews_checkinid"),
				},
				{
					Keys:    bson.D{{Key: "moderation.status", Value: 1}},
					Options: options.Index().SetName("idx_reviews_moderation_status"),
				},
			},
		},
	}

	for _, spec := range specs {
		coll := db.Collection(spec.collection)
		if _, err := coll.Indexes().CreateMany(ctx, spec.models); err != nil {
			return fmt.Errorf("creating indexes on %q: %w", spec.collection, err)
		}
	}

	return nil
}
