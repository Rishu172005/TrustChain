package middleware

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

const requestIDHeader = "X-Request-ID"

// Logger returns a Gin middleware that injects a request ID and writes a
// structured access log entry for every request.
func Logger(log zerolog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := c.GetHeader(requestIDHeader)
		if requestID == "" {
			requestID = uuid.New().String()
		}
		c.Set("requestID", requestID)
		c.Header(requestIDHeader, requestID)

		start := time.Now()
		c.Next()
		latency := time.Since(start)

		status := c.Writer.Status()
		entry := log.With().
			Str("requestId", requestID).
			Str("method", c.Request.Method).
			Str("path", c.FullPath()).
			Str("clientIp", c.ClientIP()).
			Int("status", status).
			Dur("latencyMs", latency).
			Logger()

		if len(c.Errors) > 0 {
			entry.Error().Msg(c.Errors.String())
			return
		}

		switch {
		case status >= 500:
			entry.Error().Msg("server error")
		case status >= 400:
			entry.Warn().Msg("client error")
		default:
			entry.Info().Msg("request completed")
		}
	}
}
