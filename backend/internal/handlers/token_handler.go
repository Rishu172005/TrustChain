package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"

	"github.com/trustchain/backend/internal/ports"
	"github.com/trustchain/backend/pkg/response"
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
// Accepts either:
//   - ?wallet=0xABC...  (preferred – direct Ethereum address)
//   - ?userId=<mongoID>  (legacy – prepends 0x for the mock provider)
func (h *TokenHandler) GetBalance(c *gin.Context) {
	walletAddr := c.Query("wallet")
	if walletAddr == "" {
		// Legacy path: accept userId and derive a wallet address.
		userID := c.Query("userId")
		if userID == "" {
			response.BadRequest(c, "provide 'wallet' (Ethereum address) or 'userId' query parameter")
			return
		}
		walletAddr = "0x" + userID
	}

	// Normalise: ensure 0x prefix and lowercase.
	if !strings.HasPrefix(walletAddr, "0x") {
		walletAddr = "0x" + walletAddr
	}
	walletAddr = strings.ToLower(walletAddr)

	result, err := h.provider.GetBalance(c.Request.Context(), walletAddr)
	if err != nil {
		h.log.Error().Err(err).Str("wallet", walletAddr).Msg("blockchain provider error")
		response.ServiceUnavailable(c, "provider failed to retrieve balance")
		return
	}

	response.Success(c, http.StatusOK, "Token balance retrieved successfully", gin.H{
		"provider": h.providerName,
		"wallet":   result.WalletAddress,
		"balance":  result.Balance,
		"symbol":   result.Symbol,
		"decimals": result.Decimals,
	})
}
