package recommendation

import (
	"context"
	"fmt"

	"github.com/trustchain/backend/internal/ports"
)

// FederatedLearningProvider will implement ports.RecommendationProvider via
// the Flower federated learning framework. Activated when RECOMMENDATION_PROVIDER=federated.
type FederatedLearningProvider struct {
	serverAddr string
}

// NewFederatedLearningProvider constructs a FederatedLearningProvider.
func NewFederatedLearningProvider(serverAddr string) *FederatedLearningProvider {
	return &FederatedLearningProvider{serverAddr: serverAddr}
}

// GetRecommendations is not yet implemented; the real implementation will query the Flower server.
func (p *FederatedLearningProvider) GetRecommendations(_ context.Context, _ ports.RecommendationRequest) ([]ports.RecommendedPOI, error) {
	return nil, fmt.Errorf("FederatedLearningProvider.GetRecommendations: not yet implemented — start Flower server first")
}
