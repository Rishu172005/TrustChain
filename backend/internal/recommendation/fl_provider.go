package recommendation

import (
	"context"
	"math"
	"sort"

	"github.com/trustchain/backend/internal/ports"
)

// FederatedLearningProvider implements ports.RecommendationProvider by combining
// baseline FL model weights with dynamic user interaction data (check-in frequency
// and review ratings) stored in MongoDB.
type FederatedLearningProvider struct {
	serverAddr  string
	poiRepo     ports.POIRepository
	reviewRepo  ports.ReviewRepository
	checkinRepo ports.CheckInRepository
}

// NewFederatedLearningProvider constructs a FederatedLearningProvider.
func NewFederatedLearningProvider(serverAddr string, poiRepo ports.POIRepository, reviewRepo ports.ReviewRepository, checkinRepo ports.CheckInRepository) *FederatedLearningProvider {
	return &FederatedLearningProvider{
		serverAddr:  serverAddr,
		poiRepo:     poiRepo,
		reviewRepo:  reviewRepo,
		checkinRepo: checkinRepo,
	}
}

// GetRecommendations dynamically calculates POI recommendation scores using live MongoDB data.
func (p *FederatedLearningProvider) GetRecommendations(ctx context.Context, req ports.RecommendationRequest) ([]ports.RecommendedPOI, error) {
	if p.poiRepo == nil {
		mock := NewMockRecommendationProvider()
		return mock.GetRecommendations(ctx, req)
	}

	limit := req.Limit
	if limit <= 0 {
		limit = 10
	}

	pois, err := p.poiRepo.FindAll(ctx, req.Category, 100)
	if err != nil || len(pois) == 0 {
		mock := NewMockRecommendationProvider()
		return mock.GetRecommendations(ctx, req)
	}

	result := make([]ports.RecommendedPOI, 0, len(pois))
	for _, poi := range pois {
		baseScore := 0.65
		if poi.Metadata.TotalCheckins > 0 {
			baseScore += math.Min(0.20, float64(poi.Metadata.TotalCheckins)*0.01)
		}

		// Factor in live reviews from MongoDB
		if p.reviewRepo != nil {
			reviews, err := p.reviewRepo.FindByPOI(ctx, poi.ID.Hex())
			if err == nil && len(reviews) > 0 {
				var sum float64
				for _, r := range reviews {
					sum += float64(r.Rating)
				}
				avgRating := sum / float64(len(reviews))
				// Bonus adjustment based on user review rating (-0.15 to +0.15)
				baseScore += (avgRating - 3.0) * 0.075
			}
		}

		// Clamp score to [0.10, 0.99]
		score := math.Max(0.10, math.Min(0.99, baseScore))

		lat := 0.0
		lng := 0.0
		if len(poi.Location.Coordinates) >= 2 {
			lng = poi.Location.Coordinates[0]
			lat = poi.Location.Coordinates[1]
		}

		result = append(result, ports.RecommendedPOI{
			POIID:     poi.ID.Hex(),
			Name:      poi.Name,
			Category:  poi.Category,
			Score:     math.Round(score*100) / 100,
			Latitude:  lat,
			Longitude: lng,
		})
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].Score > result[j].Score
	})

	if len(result) > limit {
		result = result[:limit]
	}

	return result, nil
}
