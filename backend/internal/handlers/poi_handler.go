package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"

	"github.com/trustchain/backend/internal/models"
	"github.com/trustchain/backend/internal/services"
	"github.com/trustchain/backend/pkg/response"
	"github.com/trustchain/backend/pkg/validator"
)

// POIHandler handles GET /pois.
type POIHandler struct {
	service *services.POIService
	log     zerolog.Logger
}

// NewPOIHandler constructs a POIHandler.
func NewPOIHandler(service *services.POIService, log zerolog.Logger) *POIHandler {
	return &POIHandler{
		service: service,
		log:     log.With().Str("handler", "poi").Logger(),
	}
}

// List handles GET /api/v1/pois.
func (h *POIHandler) List(c *gin.Context) {
	var lat, lon *float64
	radius := 1000
	limit := 20
	category := c.Query("category")

	if raw := c.Query("lat"); raw != "" {
		v, err := strconv.ParseFloat(raw, 64)
		if err != nil {
			response.UnprocessableEntity(c, "lat must be a valid float")
			return
		}
		lat = &v
	}
	if raw := c.Query("lon"); raw != "" {
		v, err := strconv.ParseFloat(raw, 64)
		if err != nil {
			response.UnprocessableEntity(c, "lon must be a valid float")
			return
		}
		lon = &v
	}
	if raw := c.Query("radius"); raw != "" {
		v, err := strconv.Atoi(raw)
		if err != nil {
			response.UnprocessableEntity(c, "radius must be a valid integer")
			return
		}
		radius = v
	}
	if raw := c.Query("limit"); raw != "" {
		v, err := strconv.Atoi(raw)
		if err != nil {
			response.UnprocessableEntity(c, "limit must be a valid integer")
			return
		}
		limit = v
	}

	if err := validator.GeoQueryParams(lat, lon, radius); err != nil {
		response.UnprocessableEntity(c, err.Error())
		return
	}
	if err := validator.Limit(limit, 1, 500); err != nil {
		response.UnprocessableEntity(c, "limit must be between 1 and 500")
		return
	}

	pois, err := h.service.GetPOIs(c.Request.Context(), services.POIQueryRequest{
		Lat:      lat,
		Lon:      lon,
		Radius:   float64(radius),
		Category: category,
		Limit:    limit,
	})
	if err != nil {
		h.log.Error().Err(err).Msg("poi service error")
		response.InternalServerError(c)
		return
	}

	response.Success(c, http.StatusOK, "POIs retrieved successfully", gin.H{
		"count": len(pois),
		"pois":  formatPOIs(pois),
	})
}

func formatPOIs(pois []models.POI) []gin.H {
	result := make([]gin.H, 0, len(pois))
	for _, p := range pois {
		result = append(result, gin.H{
			"id":          p.ID.Hex(),
			"name":        p.Name,
			"description": p.Description,
			"category":    p.Category,
			"tags":        p.Tags,
			"location": gin.H{
				"latitude":  p.Location.Latitude(),
				"longitude": p.Location.Longitude(),
			},
			"address":   p.Address,
			"metadata":  p.Metadata,
			"createdAt": p.CreatedAt,
		})
	}
	return result
}
