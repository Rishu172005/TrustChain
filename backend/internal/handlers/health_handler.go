package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"

	"github.com/trustchain/backend/internal/services"
	"github.com/trustchain/backend/pkg/response"
)

// HealthHandler handles GET /health.
type HealthHandler struct {
	service *services.HealthService
	log     zerolog.Logger
}

// NewHealthHandler constructs a HealthHandler.
func NewHealthHandler(service *services.HealthService, log zerolog.Logger) *HealthHandler {
	return &HealthHandler{
		service: service,
		log:     log.With().Str("handler", "health").Logger(),
	}
}

// Get handles GET /api/v1/health.
func (h *HealthHandler) Get(c *gin.Context) {
	result := h.service.Check(c.Request.Context())

	statusCode := http.StatusOK
	if result.Status != "healthy" {
		statusCode = http.StatusServiceUnavailable
	}

	msg := "Service is healthy"
	if result.Status != "healthy" {
		msg = "Service is degraded"
	}

	response.Success(c, statusCode, msg, result)
}
