package recommendation

import (
	"context"

	"github.com/trustchain/backend/internal/ports"
)

// MockRecommendationProvider implements ports.RecommendationProvider with
// deterministic static results. Active when RECOMMENDATION_PROVIDER=mock.
type MockRecommendationProvider struct{}

// NewMockRecommendationProvider constructs a MockRecommendationProvider.
func NewMockRecommendationProvider() *MockRecommendationProvider {
	return &MockRecommendationProvider{}
}

// GetRecommendations returns a fixed ranked list of POIs.
// The list is filtered by category if req.Category is non-empty.
func (p *MockRecommendationProvider) GetRecommendations(_ context.Context, req ports.RecommendationRequest) ([]ports.RecommendedPOI, error) {
	all := []ports.RecommendedPOI{
		{
			POIID:     "64f1a2b3c4d5e6f7a8b9c001",
			Name:      "Sample Cafe",
			Category:  "cafe",
			Score:     0.91,
			Latitude:  40.7128,
			Longitude: -74.0060,
		},
		{
			POIID:     "64f1a2b3c4d5e6f7a8b9c002",
			Name:      "Central Park",
			Category:  "park",
			Score:     0.87,
			Latitude:  40.7851,
			Longitude: -73.9683,
		},
		{
			POIID:     "64f1a2b3c4d5e6f7a8b9c003",
			Name:      "Brooklyn Museum",
			Category:  "museum",
			Score:     0.84,
			Latitude:  40.6712,
			Longitude: -73.9636,
		},
		{
			POIID:     "64f1a2b3c4d5e6f7a8b9c004",
			Name:      "Smorgasburg",
			Category:  "market",
			Score:     0.79,
			Latitude:  40.7223,
			Longitude: -73.9580,
		},
	}

	limit := req.Limit
	if limit <= 0 {
		limit = 10
	}

	filtered := make([]ports.RecommendedPOI, 0, len(all))
	for _, poi := range all {
		if req.Category != "" && poi.Category != req.Category {
			continue
		}
		filtered = append(filtered, poi)
		if len(filtered) >= limit {
			break
		}
	}

	return filtered, nil
}
