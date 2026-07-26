package services_test

import (
	"context"
	"errors"
	"testing"

	"github.com/rs/zerolog"

	"github.com/trustchain/backend/internal/models"
	"github.com/trustchain/backend/internal/services"
)

func TestPOIService_GetPOIs_NoGeo_ReturnsAll(t *testing.T) {
	expectedPOIs := []models.POI{*samplePOI(), *samplePOI()}

	poiRepo := &mockPOIRepository{
		findAllFn: func(_ context.Context, category string, limit int) ([]models.POI, error) {
			return expectedPOIs, nil
		},
	}

	svc := services.NewPOIService(poiRepo, zerolog.Nop())
	pois, err := svc.GetPOIs(context.Background(), services.POIQueryRequest{
		Limit: 20,
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(pois) != 2 {
		t.Errorf("expected 2 POIs, got %d", len(pois))
	}
}

func TestPOIService_GetPOIs_WithGeo_CallsFindNearby(t *testing.T) {
	nearbyPOIs := []models.POI{*samplePOI()}
	findNearbyCalled := false

	poiRepo := &mockPOIRepository{
		findNearbyFn: func(_ context.Context, lat, lon, radius float64, category string, limit int) ([]models.POI, error) {
			findNearbyCalled = true
			if lat != 40.7128 {
				return nil, errors.New("unexpected lat")
			}
			return nearbyPOIs, nil
		},
	}

	lat := 40.7128
	lon := -74.0060
	svc := services.NewPOIService(poiRepo, zerolog.Nop())
	pois, err := svc.GetPOIs(context.Background(), services.POIQueryRequest{
		Lat:    &lat,
		Lon:    &lon,
		Radius: 500,
		Limit:  20,
	})

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !findNearbyCalled {
		t.Error("expected FindNearby to be called when lat/lon provided")
	}
	if len(pois) != 1 {
		t.Errorf("expected 1 POI, got %d", len(pois))
	}
}

func TestPOIService_GetPOIs_RepositoryError(t *testing.T) {
	poiRepo := &mockPOIRepository{
		findAllFn: func(_ context.Context, category string, limit int) ([]models.POI, error) {
			return nil, errors.New("mongo connection lost")
		},
	}

	svc := services.NewPOIService(poiRepo, zerolog.Nop())
	_, err := svc.GetPOIs(context.Background(), services.POIQueryRequest{Limit: 20})

	if err == nil {
		t.Fatal("expected error from repository failure, got nil")
	}
}
