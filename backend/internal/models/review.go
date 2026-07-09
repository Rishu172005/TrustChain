package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ModerationStatus represents where a review is in the moderation pipeline.
type ModerationStatus string

const (
	ModerationPending  ModerationStatus = "pending"
	ModerationApproved ModerationStatus = "approved"
	ModerationRejected ModerationStatus = "rejected"
	ModerationFlagged  ModerationStatus = "flagged"
)

// ReviewSentiment holds NLP-derived sentiment data. Populated by a future ML pipeline.
type ReviewSentiment struct {
	Score *float64 `bson:"score" json:"score,omitempty"`
	Label *string  `bson:"label" json:"label,omitempty"`
}

// ReviewModeration tracks the moderation lifecycle of a review.
type ReviewModeration struct {
	Status     ModerationStatus `bson:"status"     json:"status"`
	FlagCount  int32            `bson:"flagCount"  json:"flagCount"`
	ReviewedAt *time.Time       `bson:"reviewedAt" json:"reviewedAt,omitempty"`
}

// Review represents a user's rating and written feedback for a POI.
type Review struct {
	ID            primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	UserID        primitive.ObjectID  `bson:"userId"        json:"userId"`
	POIID         primitive.ObjectID  `bson:"poiId"         json:"poiId"`
	CheckInID     *primitive.ObjectID `bson:"checkinId"     json:"checkinId,omitempty"`
	Rating        int32               `bson:"rating"        json:"rating"`
	Body          string              `bson:"body"          json:"body"`
	Sentiment     ReviewSentiment     `bson:"sentiment"     json:"sentiment"`
	Moderation    ReviewModeration    `bson:"moderation"    json:"moderation"`
	IsVisible     bool                `bson:"isVisible"     json:"isVisible"`
	SchemaVersion int32               `bson:"schemaVersion" json:"schemaVersion"`
	Timestamps    `bson:",inline"`
}
