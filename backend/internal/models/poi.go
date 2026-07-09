package models

import "go.mongodb.org/mongo-driver/bson/primitive"

// POIAddress holds the human-readable address of a point of interest.
type POIAddress struct {
	Street     string `bson:"street"     json:"street"`
	City       string `bson:"city"       json:"city"`
	Country    string `bson:"country"    json:"country"`
	PostalCode string `bson:"postalCode" json:"postalCode"`
}

// POIMetadata holds denormalised aggregate statistics for a POI.
// Updated atomically via $inc on check-in and review writes.
type POIMetadata struct {
	AverageRating float64 `bson:"averageRating" json:"averageRating"`
	TotalReviews  int32   `bson:"totalReviews"  json:"totalReviews"`
	TotalCheckins int32   `bson:"totalCheckins" json:"totalCheckins"`
	Verified      bool    `bson:"verified"      json:"verified"`
}

// POI represents a physical location that users can check in to and review.
type POI struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name          string             `bson:"name"          json:"name"`
	Description   string             `bson:"description"   json:"description"`
	Category      string             `bson:"category"      json:"category"`
	Tags          []string           `bson:"tags"          json:"tags"`
	Location      GeoJSONPoint       `bson:"location"      json:"location"`
	Address       POIAddress         `bson:"address"       json:"address"`
	Metadata      POIMetadata        `bson:"metadata"      json:"metadata"`
	IsActive      bool               `bson:"isActive"      json:"isActive"`
	SchemaVersion int32              `bson:"schemaVersion" json:"schemaVersion"`
	Timestamps    `bson:",inline"`
}
