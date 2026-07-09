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
	"github.com/trustchain/backend/internal/ports"
	"github.com/trustchain/backend/internal/services"
)

func buildCheckinRouter(svc *services.CheckInService) *gin.Engine {
	r := gin.New()
	h := handlers.NewCheckInHandler(svc, nopLogger())
	r.POST("/api/v1/checkin", h.Create)
	return r
}

func checkinBody(userID, poiID string, lat, lon float64) *bytes.Buffer {
	b, _ := json.Marshal(map[string]interface{}{
		"userId":    userID,
		"poiId":     poiID,
		"latitude":  lat,
		"longitude": lon,
	})
	return bytes.NewBuffer(b)
}

func TestCheckinHandler_Create_Success(t *testing.T) {
	poi := samplePOI()
	userID := validUserID()

	poiRepo := &mockPOIRepository{
		findByIDFn: func(_ context.Context, id string) (*models.POI, error) { return poi, nil },
	}
	checkinRepo := &mockCheckInRepository{
		insertFn: func(_ context.Context, c *models.CheckIn) error {
			c.ID = primitive.NewObjectID()
			return nil
		},
	}
	blockchain := &mockBlockchainProvider{
		submitCheckinFn: func(_ context.Context, u, p string) (*ports.TxResult, error) {
			return &ports.TxResult{TxHash: "0xdeadbeef", Status: "pending"}, nil
		},
	}

	svc := services.NewCheckInService(checkinRepo, poiRepo, blockchain, nopLogger())
	router := buildCheckinRouter(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/checkin",
		checkinBody(userID, poi.ID.Hex(), 40.7128, -74.0060))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d — body: %s", w.Code, w.Body.String())
	}

	body := parseResponse(w)
	if body["success"] != true {
		t.Errorf("expected success=true, got: %v", body["success"])
	}
	data, ok := body["data"].(map[string]interface{})
	if !ok {
		t.Fatal("expected data object in response")
	}
	blockchain2, ok := data["blockchain"].(map[string]interface{})
	if !ok {
		t.Fatal("expected blockchain object in data")
	}
	if blockchain2["txHash"] != "0xdeadbeef" {
		t.Errorf("expected txHash '0xdeadbeef', got %v", blockchain2["txHash"])
	}
}

func TestCheckinHandler_Create_MissingBody(t *testing.T) {
	poiRepo := &mockPOIRepository{}
	checkinRepo := &mockCheckInRepository{}
	blockchain := &mockBlockchainProvider{}

	svc := services.NewCheckInService(checkinRepo, poiRepo, blockchain, nopLogger())
	router := buildCheckinRouter(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/checkin", bytes.NewBufferString(""))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestCheckinHandler_Create_InvalidCoordinates(t *testing.T) {
	poiRepo := &mockPOIRepository{}
	checkinRepo := &mockCheckInRepository{}
	blockchain := &mockBlockchainProvider{}

	svc := services.NewCheckInService(checkinRepo, poiRepo, blockchain, nopLogger())
	router := buildCheckinRouter(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/checkin",
		checkinBody(validUserID(), primitive.NewObjectID().Hex(), 999.0, 999.0))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422, got %d", w.Code)
	}
}

func TestCheckinHandler_Create_InvalidUserID(t *testing.T) {
	poiRepo := &mockPOIRepository{}
	checkinRepo := &mockCheckInRepository{}
	blockchain := &mockBlockchainProvider{}

	svc := services.NewCheckInService(checkinRepo, poiRepo, blockchain, nopLogger())
	router := buildCheckinRouter(svc)

	b, _ := json.Marshal(map[string]interface{}{
		"userId":    "not-a-valid-id",
		"poiId":     primitive.NewObjectID().Hex(),
		"latitude":  40.7128,
		"longitude": -74.0060,
	})
	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/checkin", bytes.NewBuffer(b))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnprocessableEntity {
		t.Errorf("expected 422, got %d", w.Code)
	}
}

func TestCheckinHandler_Create_POINotFound(t *testing.T) {
	poiRepo := &mockPOIRepository{
		findByIDFn: func(_ context.Context, id string) (*models.POI, error) { return nil, nil },
	}
	checkinRepo := &mockCheckInRepository{}
	blockchain := &mockBlockchainProvider{}

	svc := services.NewCheckInService(checkinRepo, poiRepo, blockchain, nopLogger())
	router := buildCheckinRouter(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/checkin",
		checkinBody(validUserID(), primitive.NewObjectID().Hex(), 40.7128, -74.0060))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestCheckinHandler_Create_ServiceError_Returns500(t *testing.T) {
	poi := samplePOI()
	poiRepo := &mockPOIRepository{
		findByIDFn: func(_ context.Context, id string) (*models.POI, error) { return poi, nil },
	}
	checkinRepo := &mockCheckInRepository{
		insertFn: func(_ context.Context, c *models.CheckIn) error {
			return errors.New("db failure")
		},
	}
	blockchain := &mockBlockchainProvider{}

	svc := services.NewCheckInService(checkinRepo, poiRepo, blockchain, nopLogger())
	router := buildCheckinRouter(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodPost, "/api/v1/checkin",
		checkinBody(validUserID(), poi.ID.Hex(), 40.7128, -74.0060))
	req.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, req)

	if w.Code != http.StatusInternalServerError {
		t.Errorf("expected 500, got %d", w.Code)
	}
}
