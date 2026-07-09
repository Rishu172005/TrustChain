package handlers_test

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/trustchain/backend/internal/handlers"
	"github.com/trustchain/backend/internal/models"
	"github.com/trustchain/backend/internal/services"
)

func buildPOIRouter(svc *services.POIService) *gin.Engine {
	r := gin.New()
	h := handlers.NewPOIHandler(svc, nopLogger())
	r.GET("/api/v1/pois", h.List)
	return r
}

func TestPOIHandler_List_Success(t *testing.T) {
	pois := []models.POI{*samplePOI(), *samplePOI()}
	poiRepo := &mockPOIRepository{
		findAllFn: func(_ context.Context, category string, limit int) ([]models.POI, error) {
			return pois, nil
		},
	}

	svc := services.NewPOIService(poiRepo, nopLogger())
	router := buildPOIRouter(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v1/pois", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d — body: %s", w.Code, w.Body.String())
	}
	resp := parseResponse(w)
	if resp["success"] != true {
		t.Errorf("expected success=true")
	}
	data := resp["data"].(map[string]interface{})
	count := data["count"].(float64)
	if int(count) != 2 {
		t.Errorf("expected count=2, got %v", count)
	}
}

func TestPOIHandler_List_LatWithoutLon_Returns422(t *testing.T) {
	poiRepo := &mockPOIRepository{}
	svc := services.NewPOIService(poiRepo, nopLogger())
	router := buildPOIRouter(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v1/pois?lat=40.7128", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422, got %d", w.Code)
	}
}

func TestPOIHandler_List_InvalidRadius_Returns422(t *testing.T) {
	poiRepo := &mockPOIRepository{}
	svc := services.NewPOIService(poiRepo, nopLogger())
	router := buildPOIRouter(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v1/pois?lat=40.7128&lon=-74.0060&radius=99999", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422, got %d", w.Code)
	}
}

func TestPOIHandler_List_ServiceError_Returns500(t *testing.T) {
	poiRepo := &mockPOIRepository{
		findAllFn: func(_ context.Context, category string, limit int) ([]models.POI, error) {
			return nil, errors.New("mongo down")
		},
	}
	svc := services.NewPOIService(poiRepo, nopLogger())
	router := buildPOIRouter(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v1/pois", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}

func TestPOIHandler_List_InvalidLimit_Returns422(t *testing.T) {
	poiRepo := &mockPOIRepository{}
	svc := services.NewPOIService(poiRepo, nopLogger())
	router := buildPOIRouter(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v1/pois?limit=999", nil)
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422, got %d", w.Code)
	}
}
