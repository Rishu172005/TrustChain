package logger

import (
	"io"
	"os"
	"strings"
	"time"

	"github.com/rs/zerolog"
)

// New constructs a zerolog.Logger writing structured JSON to the given writer.
// If w is nil, os.Stdout is used.
func New(level string, w io.Writer) zerolog.Logger {
	if w == nil {
		w = os.Stdout
	}

	lvl, err := zerolog.ParseLevel(strings.ToLower(level))
	if err != nil {
		lvl = zerolog.InfoLevel
	}

	zerolog.TimeFieldFormat = time.RFC3339

	return zerolog.New(w).
		Level(lvl).
		With().
		Timestamp().
		Str("service", "trustchain-backend").
		Logger()
}
