package services

import (
	"context"
	"time"

	"github.com/trustchain/backend/internal/database"
)

// ComponentStatus describes the health of a single dependency.
type ComponentStatus struct {
	Status    string `json:"status"`
	LatencyMs *int64 `json:"latencyMs,omitempty"`
	Provider  string `json:"provider,omitempty"`
}

// HealthResult is the full health report returned by the health endpoint.
type HealthResult struct {
	Status  string                     `json:"status"`
	Version string                     `json:"version"`
	Uptime  string                     `json:"uptime"`
	Checks  map[string]ComponentStatus `json:"checks"`
}

// HealthService checks the status of all application dependencies.
type HealthService struct {
	db                     *database.Client
	blockchainProviderName string
	recommendProviderName  string
	startTime              time.Time
	version                string
}

// NewHealthService constructs a HealthService.
func NewHealthService(
	db *database.Client,
	blockchainProviderName string,
	recommendProviderName string,
	version string,
) *HealthService {
	return &HealthService{
		db:                     db,
		blockchainProviderName: blockchainProviderName,
		recommendProviderName:  recommendProviderName,
		startTime:              time.Now(),
		version:                version,
	}
}

// Check returns the current health of all system components.
func (s *HealthService) Check(ctx context.Context) HealthResult {
	checks := make(map[string]ComponentStatus)
	overallHealthy := true

	if s.db == nil {
		checks["database"] = ComponentStatus{Status: "unhealthy"}
		overallHealthy = false
	} else {
		latency, err := s.db.Ping(ctx)
		if err != nil {
			checks["database"] = ComponentStatus{Status: "unhealthy"}
			overallHealthy = false
		} else {
			ms := latency.Milliseconds()
			checks["database"] = ComponentStatus{Status: "healthy", LatencyMs: &ms}
		}
	}

	checks["blockchainProvider"] = ComponentStatus{
		Status:   "healthy",
		Provider: s.blockchainProviderName,
	}
	checks["recommendationProvider"] = ComponentStatus{
		Status:   "healthy",
		Provider: s.recommendProviderName,
	}

	status := "healthy"
	if !overallHealthy {
		status = "degraded"
	}

	return HealthResult{
		Status:  status,
		Version: s.version,
		Uptime:  time.Since(s.startTime).Round(time.Second).String(),
		Checks:  checks,
	}
}
