package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// VerificationMethod identifies how a check-in was verified.
type VerificationMethod string

// VerificationStatus represents the current verification state of a check-in.
type VerificationStatus string

// TxStatus represents the state of a blockchain transaction.
type TxStatus string

const (
	VerificationNone   VerificationMethod = "none"
	VerificationGPS    VerificationMethod = "gps"
	VerificationQR     VerificationMethod = "qr"
	VerificationBeacon VerificationMethod = "beacon"
	VerificationManual VerificationMethod = "manual"

	VerificationStatusPending  VerificationStatus = "pending"
	VerificationStatusVerified VerificationStatus = "verified"
	VerificationStatusFailed   VerificationStatus = "failed"
	VerificationStatusDisputed VerificationStatus = "disputed"

	TxStatusNone      TxStatus = "none"
	TxStatusPending   TxStatus = "pending"
	TxStatusConfirmed TxStatus = "confirmed"
	TxStatusFailed    TxStatus = "failed"
)

// ValidatorConsensus records the state of a multi-validator consensus round.
type ValidatorConsensus struct {
	Required  int32 `bson:"required"  json:"required"`
	Received  int32 `bson:"received"  json:"received"`
	Approvals int32 `bson:"approvals" json:"approvals"`
}

// CheckInVerification is the extensible sub-document for all verification methods.
// Fields for GPS, QR, beacon, and consensus are nullable and carry no cost until activated.
type CheckInVerification struct {
	Method             VerificationMethod  `bson:"method"             json:"method"`
	Status             VerificationStatus  `bson:"status"             json:"status"`
	GPSAccuracyMetres  *float64            `bson:"gpsAccuracyMetres"  json:"gpsAccuracyMetres,omitempty"`
	QRCodeID           *string             `bson:"qrCodeId"           json:"qrCodeId,omitempty"`
	BeaconID           *string             `bson:"beaconId"           json:"beaconId,omitempty"`
	ValidatorConsensus *ValidatorConsensus `bson:"validatorConsensus" json:"validatorConsensus,omitempty"`
}

// CheckInBlockchain tracks the lifecycle of the blockchain transaction for a check-in.
type CheckInBlockchain struct {
	TxHash      *string    `bson:"txHash"      json:"txHash,omitempty"`
	TxStatus    TxStatus   `bson:"txStatus"    json:"txStatus"`
	BlockNumber *int64     `bson:"blockNumber" json:"blockNumber,omitempty"`
	SubmittedAt *time.Time `bson:"submittedAt" json:"submittedAt,omitempty"`
	ConfirmedAt *time.Time `bson:"confirmedAt" json:"confirmedAt,omitempty"`
}

// CheckIn records a user's visit to a POI.
type CheckIn struct {
	ID            primitive.ObjectID  `bson:"_id,omitempty" json:"id"`
	UserID        primitive.ObjectID  `bson:"userId"        json:"userId"`
	POIID         primitive.ObjectID  `bson:"poiId"         json:"poiId"`
	Location      GeoJSONPoint        `bson:"location"      json:"location"`
	Verification  CheckInVerification `bson:"verification"  json:"verification"`
	Blockchain    CheckInBlockchain   `bson:"blockchain"    json:"blockchain"`
	RewardGranted bool                `bson:"rewardGranted" json:"rewardGranted"`
	RewardAmount  int64               `bson:"rewardAmount"  json:"rewardAmount"`
	SchemaVersion int32               `bson:"schemaVersion" json:"schemaVersion"`
	Timestamps    `bson:",inline"`
}
