package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"

	"github.com/trustchain/backend/internal/ports"
	"github.com/trustchain/backend/pkg/response"
	"github.com/trustchain/backend/pkg/validator"
)

// TokenHandler handles GET /token-balance.
type TokenHandler struct {
	provider     ports.BlockchainProvider
	providerName string
	log          zerolog.Logger
}

// NewTokenHandler constructs a TokenHandler.
func NewTokenHandler(provider ports.BlockchainProvider, providerName string, log zerolog.Logger) *TokenHandler {
	return &TokenHandler{
		provider:     provider,
		providerName: providerName,
		log:          log.With().Str("handler", "token").Logger(),
	}
}

// GetBalance handles GET /api/v1/token-balance.
func (h *TokenHandler) GetBalance(c *gin.Context) {
	userID := c.Query("userId")
	if userID == "" {
		response.BadRequest(c, "userId query parameter is required")
		return
	}
	if err := validator.ObjectID(userID); err != nil {
		response.UnprocessableEntity(c, "userId: "+err.Error())
		return
	}

	// In the MVP the wallet address mirrors the userId; the real provider
	// will resolve it via an on-chain registry.
	walletAddr := "0x" + userID

	result, err := h.provider.GetBalance(c.Request.Context(), walletAddr)
	if err != nil {
		h.log.Error().Err(err).Msg("blockchain provider error")
		response.ServiceUnavailable(c, "provider failed to retrieve balance")
		return
	}

	response.Success(c, http.StatusOK, "Token balance retrieved successfully", gin.H{
		"provider": h.providerName,
		"userId":   userID,
		"wallet":   result.WalletAddress,
		"balance":  result.Balance,
		"symbol":   result.Symbol,
		"decimals": result.Decimals,
	})
}
