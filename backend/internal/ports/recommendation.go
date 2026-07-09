package ports

import "context"

// RecommendationRequest carries the parameters for a recommendation query.
type RecommendationRequest struct {
	UserID   string
	Limit    int
	Category string
}

// RecommendedPOI is a single item in a recommendation result set.
type RecommendedPOI struct {
	POIID     string
	Name      string
	Category  string
	Score     float64
	Latitude  float64
	Longitude float64
}

// RecommendationProvider abstracts the recommendation engine.
// Swap MockRecommendationProvider for FederatedLearningProvider via config.
type RecommendationProvider interface {
	GetRecommendations(ctx context.Context, req RecommendationRequest) ([]RecommendedPOI, error)
}
