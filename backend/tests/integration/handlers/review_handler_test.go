package handlers_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/trustchain/backend/internal/handlers"
	"github.com/trustchain/backend/internal/models"
	"github.com/trustchain/backend/internal/services"
)

func buildReviewRouter(svc *services.ReviewService) *gin.Engine {
	r := gin.New()
	h := handlers.NewReviewHandler(svc, nopLogger())
	r.POST("/api/v1/review", h.Create)
	return r
}

func reviewBody(userID, poiID string, rating int, body string) *bytes.Buffer {
	b, _ := json.Marshal(map[string]interface{}{
		"userId": userID,
		"poiId":  poiID,
		"rating": rating,
		"review": body,
	})
	return bytes.NewBuffer(b)
}

func TestReviewHandler_Create_Success(t *testing.T) {
	poi := samplePOI()
	poiRepo := &mockPOIRepository{
		findByIDFn: func(_ context.Context, id string) (*models.POI, error) { return poi, nil },
	}
	reviewRepo := &mockReviewRepository{
		insertFn: func(_ context.Context, r *models.Review) error {
			r.ID = primitive.NewObjectID()
			return nil
		},
	}

	svc := services.NewReviewService(reviewRepo, poiRepo, nopLogger())
	router := buildReviewRouter(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/review",
		reviewBody(validUserID(), poi.ID.Hex(), 5, "Exceptional experience."))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d — body: %s", w.Code, w.Body.String())
	}
	resp := parseResponse(w)
	if resp["success"] != true {
		t.Errorf("expected success=true, got %v", resp["success"])
	}
}

func TestReviewHandler_Create_RatingOutOfRange(t *testing.T) {
	poiRepo := &mockPOIRepository{}
	reviewRepo := &mockReviewRepository{}

	svc := services.NewReviewService(reviewRepo, poiRepo, nopLogger())
	router := buildReviewRouter(svc)

	for _, rating := range []int{0, 6, -1} {
		w := httptest.NewRecorder()
		req, _ := http.NewRequest(http.MethodPost, "/api/v1/review",
			reviewBody(validUserID(), primitive.NewObjectID().Hex(), rating, "Some text."))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		if w.Code != http.StatusUnprocessableEntity {
			t.Errorf("expected 422 for rating=%d, got %d", rating, w.Code)
		}
	}
}

func TestReviewHandler_Create_EmptyReviewBody(t *testing.T) {
	poiRepo := &mockPOIRepository{}
	reviewRepo := &mockReviewRepository{}

	svc := services.NewReviewService(reviewRepo, poiRepo, nopLogger())
	router := buildReviewRouter(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/review",
		reviewBody(validUserID(), primitive.NewObjectID().Hex(), 4, ""))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422, got %d", w.Code)
	}
}

func TestReviewHandler_Create_POINotFound(t *testing.T) {
	poiRepo := &mockPOIRepository{
		findByIDFn: func(_ context.Context, id string) (*models.POI, error) { return nil, nil },
	}
	reviewRepo := &mockReviewRepository{}

	svc := services.NewReviewService(reviewRepo, poiRepo, nopLogger())
	router := buildReviewRouter(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/review",
		reviewBody(validUserID(), primitive.NewObjectID().Hex(), 4, "Nice spot."))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestReviewHandler_Create_ServiceError_Returns500(t *testing.T) {
	poi := samplePOI()
	poiRepo := &mockPOIRepository{
		findByIDFn: func(_ context.Context, id string) (*models.POI, error) { return poi, nil },
	}
	reviewRepo := &mockReviewRepository{
		insertFn: func(_ context.Context, r *models.Review) error {
			return errors.New("db write failed")
		},
	}

	svc := services.NewReviewService(reviewRepo, poiRepo, nopLogger())
	router := buildReviewRouter(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/review",
		reviewBody(validUserID(), poi.ID.Hex(), 3, "Decent."))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}
