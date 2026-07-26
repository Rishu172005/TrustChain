package validator

import (
	"errors"
	"strings"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ObjectID returns an error if s is not a valid 24-character hex MongoDB ObjectID.
func ObjectID(s string) error {
	if _, err := primitive.ObjectIDFromHex(s); err != nil {
		return errors.New("must be a valid ObjectID (24-character hex string)")
	}
	return nil
}

// Coordinate returns an error if the lat/lon values are outside legal ranges.
func Coordinate(lat, lon float64) error {
	var errs []string
	if lat < -90 || lat > 90 {
		errs = append(errs, "latitude must be between -90 and 90")
	}
	if lon < -180 || lon > 180 {
		errs = append(errs, "longitude must be between -180 and 180")
	}
	if len(errs) > 0 {
		return errors.New(strings.Join(errs, "; "))
	}
	return nil
}

// Rating returns an error if r is not in [1, 5].
func Rating(r int32) error {
	if r < 1 || r > 5 {
		return errors.New("rating must be between 1 and 5")
	}
	return nil
}

// ReviewBody returns an error if the review text exceeds 2000 chars.
func ReviewBody(body string) error {
	trimmed := strings.TrimSpace(body)
	if len(trimmed) > 2000 {
		return errors.New("review body cannot exceed 2000 characters")
	}
	return nil
}

// GeoQueryParams validates the parameter combination for geo-filtered queries.
// lat and lon must both be present or both absent.
func GeoQueryParams(lat, lon *float64, radius int) error {
	var errs []string

	latPresent := lat != nil
	lonPresent := lon != nil

	if latPresent != lonPresent {
		errs = append(errs, "lat and lon must be provided together")
	}
	if latPresent && (*lat < -90 || *lat > 90) {
		errs = append(errs, "latitude must be between -90 and 90")
	}
	if lonPresent && (*lon < -180 || *lon > 180) {
		errs = append(errs, "longitude must be between -180 and 180")
	}
	if radius < 1 || radius > 50000 {
		errs = append(errs, "radius must be between 1 and 50000 metres")
	}
	if len(errs) > 0 {
		return errors.New(strings.Join(errs, "; "))
	}
	return nil
}

// Limit validates a pagination limit value.
func Limit(limit, min, max int) error {
	if limit < min || limit > max {
		return errors.New("limit is out of allowed range")
	}
	return nil
}
