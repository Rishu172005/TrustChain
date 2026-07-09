package handlers_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"

	"github.com/trustchain/backend/internal/handlers"
	"github.com/trustchain/backend/internal/services"
)

func buildHealthRouter(svc *services.HealthService) *gin.Engine {
	r := gin.New()
	h := handlers.NewHealthHandler(svc, nopLogger())
	r.GET("/api/v1/health", h.Get)
	return r
}

func TestHealthHandler_Get_ResponseShape(t *testing.T) {
	// HealthService requires a *database.Client which needs a real mongo connection
	// for a fully "healthy" response. Passing nil exercises the degraded path —
	// HealthService.Check() nil-checks the db client and reports "unhealthy" for
	// that component without panicking. This verifies routing, response envelope
	// shape, and status code mapping without requiring a live database.
	//
	// A full integration test against a real MongoDB instance runs separately
	// in CI via docker-compose (see docs/deployment-guide.md).

	svc := services.NewHealthService(nil, "mock", "mock", "1.0.0-test")
	router := buildHealthRouter(svc)

	w := httptest.NewRecorder()
	req, _ := http.NewRequest(http.MethodGet, "/api/v1/health", nil)
	router.ServeHTTP(w, req)

	// With nil DB the health check reports degraded — 503 is the correct response.
	if w.Code != http.StatusOK && w.Code != http.StatusServiceUnavailable {
		t.Errorf("expected 200 or 503, got %d — body: %s", w.Code, w.Body.String())
	}

	resp := parseResponse(w)
	if _, ok := resp["success"]; !ok {
		t.Error("response missing 'success' field")
	}
	if _, ok := resp["message"]; !ok {
		t.Error("response missing 'message' field")
	}

	ct := w.Header().Get("Content-Type")
	if ct == "" {
		t.Error("Content-Type header missing")
	}
}
