package services

import (
	"context"
	"fmt"

	"github.com/rs/zerolog"

	"github.com/trustchain/backend/internal/models"
	"github.com/trustchain/backend/internal/ports"
)

// POIQueryRequest carries parameters for POI listing and geo-search.
type POIQueryRequest struct {
	Lat      *float64
	Lon      *float64
	Radius   float64
	Category string
	Limit    int
}

// POIService handles POI discovery including geospatial filtering.
type POIService struct {
	poiRepo ports.POIRepository
	log     zerolog.Logger
}

// NewPOIService constructs a POIService.
func NewPOIService(poiRepo ports.POIRepository, log zerolog.Logger) *POIService {
	return &POIService{
		poiRepo: poiRepo,
		log:     log.With().Str("service", "poi").Logger(),
	}
}

// GetPOIs returns POIs, using a geo query when coordinates are provided.
func (s *POIService) GetPOIs(ctx context.Context, req POIQueryRequest) ([]models.POI, error) {
	if req.Lat != nil && req.Lon != nil {
		pois, err := s.poiRepo.FindNearby(ctx, *req.Lat, *req.Lon, req.Radius, req.Category, req.Limit)
		if err != nil {
			return nil, fmt.Errorf("geo poi search: %w", err)
		}
		return pois, nil
	}

	pois, err := s.poiRepo.FindAll(ctx, req.Category, req.Limit)
	if err != nil {
		return nil, fmt.Errorf("listing pois: %w", err)
	}
	return pois, nil
}
