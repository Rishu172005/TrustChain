package services

import "errors"

// ErrPOINotFound is returned when a POI lookup by ID yields no document.
var ErrPOINotFound = errors.New("poi not found")

// ErrUserNotFound is returned when a user lookup by ID yields no document.
var ErrUserNotFound = errors.New("user not found")

// ErrCheckinNotFound is returned when a check-in lookup yields no document.
var ErrCheckinNotFound = errors.New("checkin not found")
