package handlers

import (
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"

	"github.com/trustchain/backend/internal/ports"
	"github.com/trustchain/backend/pkg/response"
)

type TransactionItem struct {
	ID           string    `json:"id"`
	Type         string    `json:"type"` // "checkin" or "review"
	Name         string    `json:"name"`
	TokensEarned int       `json:"tokensEarned"`
	Timestamp    time.Time `json:"timestamp"`
	TxHash       string    `json:"txHash,omitempty"`
}

// TransactionHandler handles GET /transactions.
type TransactionHandler struct {
	checkinRepo ports.CheckInRepository
	reviewRepo  ports.ReviewRepository
	poiRepo     ports.POIRepository
	log         zerolog.Logger
}

// NewTransactionHandler constructs a TransactionHandler.
func NewTransactionHandler(checkinRepo ports.CheckInRepository, reviewRepo ports.ReviewRepository, poiRepo ports.POIRepository, log zerolog.Logger) *TransactionHandler {
	return &TransactionHandler{
		checkinRepo: checkinRepo,
		reviewRepo:  reviewRepo,
		poiRepo:     poiRepo,
		log:         log.With().Str("handler", "transaction").Logger(),
	}
}

// Get handles GET /api/v1/transactions.
func (h *TransactionHandler) Get(c *gin.Context) {
	userID := c.Query("userId")
	if userID == "" {
		wallet := c.Query("wallet")
		if wallet != "" {
			userID = strings.TrimPrefix(strings.ToLower(wallet), "0x")
		}
	}

	if userID == "" {
		response.BadRequest(c, "provide 'userId' or 'wallet' query parameter")
		return
	}

	// Normalize hex string length to 24 hex chars for Mongo ObjectID matching
	hexStr := strings.TrimPrefix(strings.ToLower(userID), "0x")
	if len(hexStr) >= 24 {
		hexStr = hexStr[:24]
	} else {
		hexStr = strings.Repeat("0", 24-len(hexStr)) + hexStr
	}

	var items []TransactionItem

	checkins, err := h.checkinRepo.FindByUser(c.Request.Context(), hexStr)
	if err == nil {
		for _, ck := range checkins {
			poiName := "Check-in at POI"
			if poi, err := h.poiRepo.FindByID(c.Request.Context(), ck.POIID.Hex()); err == nil && poi != nil {
				poiName = poi.Name
			}
			items = append(items, TransactionItem{
				ID:           ck.ID.Hex(),
				Type:         "checkin",
				Name:         poiName,
				TokensEarned: 10,
				Timestamp:    ck.CreatedAt,
				TxHash:       ck.Blockchain.TxHash,
			})
		}
	}

	reviews, err := h.reviewRepo.FindByUser(c.Request.Context(), hexStr)
	if err == nil {
		for _, rv := range reviews {
			poiName := "POI"
			if poi, err := h.poiRepo.FindByID(c.Request.Context(), rv.POIID.Hex()); err == nil && poi != nil {
				poiName = poi.Name
			}
			items = append(items, TransactionItem{
				ID:           rv.ID.Hex(),
				Type:         "review",
				Name:         "Review: " + poiName,
				TokensEarned: 5,
				Timestamp:    rv.CreatedAt,
			})
		}
	}

	if items == nil {
		items = []TransactionItem{}
	}

	// Sort newest first
	sort.Slice(items, func(i, j int) bool {
		return items[i].Timestamp.After(items[j].Timestamp)
	})

	response.Success(c, http.StatusOK, "Transactions retrieved successfully", gin.H{
		"userId":       userID,
		"transactions": items,
	})
}
