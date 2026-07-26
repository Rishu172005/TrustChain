package models

import "go.mongodb.org/mongo-driver/bson/primitive"

// User represents a registered platform participant.
type User struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Username        string             `bson:"username"      json:"username"`
	Email           string             `bson:"email"          json:"email"`
	WalletAddress   string             `bson:"walletAddress"  json:"walletAddress,omitempty"`
	ReputationScore float64            `bson:"reputationScore" json:"reputationScore"`
	TotalCheckins   int32              `bson:"totalCheckins"   json:"totalCheckins"`
	TotalReviews    int32              `bson:"totalReviews"    json:"totalReviews"`
	SchemaVersion   int32              `bson:"schemaVersion"   json:"schemaVersion"`
	Timestamps      `bson:",inline"`
}
