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

// reviewRequest is the expected JSON body for POST /review.
type reviewRequest struct {
	UserID string `json:"userId"`
	POIID  string `json:"poiId"`
	Rating int32  `json:"rating"`
	Review string `json:"review"`
}

// ReviewHandler handles HTTP requests for the review endpoint.
type ReviewHandler struct {
	service *services.ReviewService
	log     zerolog.Logger
}

// NewReviewHandler constructs a ReviewHandler.
func NewReviewHandler(service *services.ReviewService, log zerolog.Logger) *ReviewHandler {
	return &ReviewHandler{
		service: service,
		log:     log.With().Str("handler", "review").Logger(),
	}
}

// Create handles POST /api/v1/review.
func (h *ReviewHandler) Create(c *gin.Context) {
	var req reviewRequest
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
	if err := validator.Rating(req.Rating); err != nil {
		response.UnprocessableEntity(c, err.Error())
		return
	}
	if err := validator.ReviewBody(req.Review); err != nil {
		response.UnprocessableEntity(c, err.Error())
		return
	}

	review, err := h.service.CreateReview(c.Request.Context(), services.ReviewRequest{
		UserID: req.UserID,
		POIID:  req.POIID,
		Rating: req.Rating,
		Body:   req.Review,
	})
	if err != nil {
		if errors.Is(err, services.ErrPOINotFound) {
			response.NotFound(c, "no POI with id "+req.POIID)
			return
		}
		h.log.Error().Err(err).Msg("review service error")
		response.InternalServerError(c)
		return
	}

	response.Success(c, http.StatusCreated, "Review submitted successfully", gin.H{
		"reviewId": review.ID.Hex(),
		"userId":   review.UserID.Hex(),
		"poiId":    review.POIID.Hex(),
		"rating":   review.Rating,
		"review":   review.Body,
		"moderation": gin.H{
			"status": review.Moderation.Status,
		},
		"createdAt": review.CreatedAt,
	})
}
