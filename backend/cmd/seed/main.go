package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"

	"github.com/trustchain/backend/internal/config"
	"github.com/trustchain/backend/internal/database"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func main() {
	// simple console logger
	zerologger := zerolog.New(zerolog.ConsoleWriter{Out: os.Stdout}).With().Timestamp().Logger()
	_ = zerologger

	cfg, err := config.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("loading config")
	}

	client, err := database.Connect(context.Background(), cfg.MongoDB)
	if err != nil {
		log.Fatal().Err(err).Msg("connecting to mongodb")
	}
	defer client.Disconnect(context.Background())

	// Try multiple likely locations for the frontend POI dataset, then fallback to cmd/server/pois.json
	candidates := []string{
		"../frontend/src/pois.json",
		"../frontend/public/pois.json",
		"../../frontend/src/pois.json",
		"../../frontend/public/pois.json",
		"frontend/src/pois.json",
		"cmd/server/pois.json",
	}
	filePath := ""
	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			filePath = p
			break
		}
	}
	if filePath == "" {
		log.Fatal().Msg("no POI JSON file found in expected locations")
	}

	b, err := os.ReadFile(filePath)
	if err != nil {
		log.Fatal().Err(err).Msgf("reading pois file %s", filePath)
	}

	var items []map[string]interface{}
	if err := json.Unmarshal(b, &items); err != nil {
		log.Fatal().Err(err).Msg("parsing pois json")
	}

	coll := client.Database.Collection("pois")
	now := time.Now().UTC()
	imported := 0

	for _, it := range items {
		idStr, _ := it["id"].(string)
		if idStr == "" {
			continue
		}
		oid, err := primitive.ObjectIDFromHex(idStr)
		if err != nil {
			fmt.Printf("skipping invalid id: %s\n", idStr)
			continue
		}

		name, _ := it["name"].(string)
		category, _ := it["category"].(string)
		lat := 0.0
		lng := 0.0
		if v, ok := it["lat"].(float64); ok {
			lat = v
		}
		if v, ok := it["lng"].(float64); ok {
			lng = v
		}
		checkins := int32(0)
		if v, ok := it["checkins"].(float64); ok {
			checkins = int32(v)
		}

		doc := bson.M{
			"_id":           oid,
			"name":          name,
			"category":      category,
			"location":      bson.M{"type": "Point", "coordinates": bson.A{lng, lat}},
			"metadata":      bson.M{"averageRating": 0.0, "totalReviews": 0, "totalCheckins": checkins, "verified": false},
			"isActive":      true,
			"schemaVersion": 1,
			"createdAt":     now,
			"updatedAt":     now,
		}

		filter := bson.M{"_id": oid}
		update := bson.M{"$set": doc}
		if _, err := coll.UpdateOne(context.Background(), filter, update); err != nil {
			// fallback to InsertOne
			if _, ierr := coll.InsertOne(context.Background(), doc); ierr != nil {
				fmt.Printf("failed to insert poi %s: %v (update err: %v)\n", idStr, ierr, err)
				continue
			}
		}
		imported++
	}

	fmt.Printf("Imported %d POIs from %s\n", imported, filePath)
}
