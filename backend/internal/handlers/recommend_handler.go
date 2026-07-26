package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"

	"github.com/trustchain/backend/internal/ports"
	"github.com/trustchain/backend/pkg/response"
)

// RecommendHandler handles GET /recommend.
type RecommendHandler struct {
	provider     ports.RecommendationProvider
	providerName string
	log          zerolog.Logger
}

// NewRecommendHandler constructs a RecommendHandler.
func NewRecommendHandler(provider ports.RecommendationProvider, providerName string, log zerolog.Logger) *RecommendHandler {
	return &RecommendHandler{
		provider:     provider,
		providerName: providerName,
		log:          log.With().Str("handler", "recommend").Logger(),
	}
}

// Get handles GET /api/v1/recommend.
func (h *RecommendHandler) Get(c *gin.Context) {
	userID := c.Query("userId")
	category := c.Query("category")

	limit := 10
	if raw := c.Query("limit"); raw != "" {
		v, err := strconv.Atoi(raw)
		if err != nil || v < 1 || v > 50 {
			response.UnprocessableEntity(c, "limit must be an integer between 1 and 50")
			return
		}
		limit = v
	}

	recs, err := h.provider.GetRecommendations(c.Request.Context(), ports.RecommendationRequest{
		UserID:   userID,
		Limit:    limit,
		Category: category,
	})
	if err != nil {
		h.log.Error().Err(err).Msg("recommendation provider error")
		response.ServiceUnavailable(c, "provider failed to return recommendations")
		return
	}

	items := make([]gin.H, 0, len(recs))
	for _, r := range recs {
		items = append(items, gin.H{
			"poiId":    r.POIID,
			"name":     r.Name,
			"category": r.Category,
			"score":    r.Score,
			"location": gin.H{
				"latitude":  r.Latitude,
				"longitude": r.Longitude,
			},
		})
	}

	response.Success(c, http.StatusOK, "Recommendations retrieved successfully", gin.H{
		"provider":        h.providerName,
		"userId":          userID,
		"recommendations": items,
	})
}
