package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"

	"github.com/trustchain/backend/internal/services"
	"github.com/trustchain/backend/pkg/response"
	"github.com/trustchain/backend/pkg/validator"
)

// checkinRequest is the expected JSON body for POST /checkin.
type checkinRequest struct {
	UserID    string  `json:"userId"`
	POIID     string  `json:"poiId"`
	Latitude  float64 `json:"latitude"`
	Longitude float64 `json:"longitude"`
}

// CheckInHandler handles HTTP requests for the check-in endpoint.
type CheckInHandler struct {
	service *services.CheckInService
	log     zerolog.Logger
}

// NewCheckInHandler constructs a CheckInHandler.
func NewCheckInHandler(service *services.CheckInService, log zerolog.Logger) *CheckInHandler {
	return &CheckInHandler{
		service: service,
		log:     log.With().Str("handler", "checkin").Logger(),
	}
}

// Create handles POST /api/v1/checkin.
func (h *CheckInHandler) Create(c *gin.Context) {
	var req checkinRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, err.Error())
		return
	}

	if err := validator.ObjectID(req.UserID); err != nil {
		response.UnprocessableEntity(c, "userId: "+err.Error())
		return
	}
	if err := validator.ObjectID(req.POIID); err != nil {
		response.UnprocessableEntity(c, "poiId: "+err.Error())
		return
	}
	if err := validator.Coordinate(req.Latitude, req.Longitude); err != nil {
		response.UnprocessableEntity(c, err.Error())
		return
	}

	result, err := h.service.CreateCheckIn(c.Request.Context(), services.CheckInRequest{
		UserID:    req.UserID,
		POIID:     req.POIID,
		Latitude:  req.Latitude,
		Longitude: req.Longitude,
	})
	if err != nil {
		if errors.Is(err, services.ErrPOINotFound) {
			response.NotFound(c, "no POI with id "+req.POIID)
			return
		}
		h.log.Error().Err(err).Msg("checkin service error")
		response.InternalServerError(c)
		return
	}

	checkin := result.CheckIn
	response.Success(c, http.StatusCreated, "Check-in recorded successfully", gin.H{
		"checkinId": checkin.ID.Hex(),
		"userId":    checkin.UserID.Hex(),
		"poiId":     checkin.POIID.Hex(),
		"location": gin.H{
			"latitude":  checkin.Location.Latitude(),
			"longitude": checkin.Location.Longitude(),
		},
		"verification": gin.H{
			"method": checkin.Verification.Method,
			"status": checkin.Verification.Status,
		},
		"blockchain": gin.H{
			"txHash":   result.TxHash,
			"txStatus": result.TxStatus,
		},
		"createdAt": checkin.CreatedAt,
	})
}
