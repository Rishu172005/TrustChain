package models

import "time"

// APIResponse is the standard envelope returned by every endpoint.
type APIResponse struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// GeoJSONPoint is a MongoDB-compatible GeoJSON Point.
// Coordinates are [longitude, latitude] per the GeoJSON specification.
type GeoJSONPoint struct {
	Type        string     `bson:"type"        json:"type"`
	Coordinates [2]float64 `bson:"coordinates" json:"coordinates"`
}

// NewGeoJSONPoint constructs a GeoJSONPoint from human-readable lat/lon.
func NewGeoJSONPoint(lat, lon float64) GeoJSONPoint {
	return GeoJSONPoint{
		Type:        "Point",
		Coordinates: [2]float64{lon, lat}, // GeoJSON is [lon, lat]
	}
}

// Latitude extracts the latitude from the GeoJSON coordinate pair.
func (g GeoJSONPoint) Latitude() float64 { return g.Coordinates[1] }

// Longitude extracts the longitude from the GeoJSON coordinate pair.
func (g GeoJSONPoint) Longitude() float64 { return g.Coordinates[0] }

// Timestamps is embedded inline into every MongoDB document.
type Timestamps struct {
	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}
