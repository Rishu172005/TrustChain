package validators_test

import (
	"strings"
	"testing"

	"github.com/trustchain/backend/pkg/validator"
)

// ── ObjectID ──────────────────────────────────────────────────────────────────

func TestObjectID_Valid(t *testing.T) {
	cases := []string{
		"64f1a2b3c4d5e6f7a8b9c0d1",
		"000000000000000000000000",
		"ffffffffffffffffffffffff",
	}
	for _, id := range cases {
		if err := validator.ObjectID(id); err != nil {
			t.Errorf("expected valid ObjectID for %q, got error: %v", id, err)
		}
	}
}

func TestObjectID_Invalid(t *testing.T) {
	cases := []string{
		"",
		"tooshort",
		"64f1a2b3c4d5e6f7a8b9c0d1XX", // too long
		"64f1a2b3c4d5e6f7a8b9c0zz",   // invalid hex
		"not-an-object-id",
	}
	for _, id := range cases {
		if err := validator.ObjectID(id); err == nil {
			t.Errorf("expected error for invalid ObjectID %q, got nil", id)
		}
	}
}

// ── Coordinate ────────────────────────────────────────────────────────────────

func TestCoordinate_Valid(t *testing.T) {
	cases := [][2]float64{
		{0, 0},
		{90, 180},
		{-90, -180},
		{40.7128, -74.0060},
	}
	for _, c := range cases {
		if err := validator.Coordinate(c[0], c[1]); err != nil {
			t.Errorf("expected valid coords (%.4f, %.4f), got: %v", c[0], c[1], err)
		}
	}
}

func TestCoordinate_InvalidLatitude(t *testing.T) {
	cases := [][2]float64{
		{91, 0},
		{-91, 0},
		{180, 0},
	}
	for _, c := range cases {
		err := validator.Coordinate(c[0], c[1])
		if err == nil {
			t.Errorf("expected error for lat=%.1f, got nil", c[0])
			continue
		}
		if !strings.Contains(err.Error(), "latitude") {
			t.Errorf("error should mention 'latitude', got: %v", err)
		}
	}
}

func TestCoordinate_InvalidLongitude(t *testing.T) {
	cases := [][2]float64{
		{0, 181},
		{0, -181},
	}
	for _, c := range cases {
		err := validator.Coordinate(c[0], c[1])
		if err == nil {
			t.Errorf("expected error for lon=%.1f, got nil", c[1])
			continue
		}
		if !strings.Contains(err.Error(), "longitude") {
			t.Errorf("error should mention 'longitude', got: %v", err)
		}
	}
}

func TestCoordinate_BothInvalid_ErrorMentionsBoth(t *testing.T) {
	err := validator.Coordinate(999, 999)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "latitude") {
		t.Error("error should mention latitude")
	}
	if !strings.Contains(err.Error(), "longitude") {
		t.Error("error should mention longitude")
	}
}

// ── Rating ────────────────────────────────────────────────────────────────────

func TestRating_Valid(t *testing.T) {
	for _, r := range []int32{1, 2, 3, 4, 5} {
		if err := validator.Rating(r); err != nil {
			t.Errorf("expected rating %d to be valid, got: %v", r, err)
		}
	}
}

func TestRating_Invalid(t *testing.T) {
	for _, r := range []int32{0, -1, 6, 100} {
		if err := validator.Rating(r); err == nil {
			t.Errorf("expected rating %d to be invalid, got nil", r)
		}
	}
}

// ── ReviewBody ────────────────────────────────────────────────────────────────

func TestReviewBody_Valid(t *testing.T) {
	cases := []string{
		"Great place.",
		"A",
		strings.Repeat("x", 2000),
	}
	for _, b := range cases {
		if err := validator.ReviewBody(b); err != nil {
			t.Errorf("expected valid body for len=%d, got: %v", len(b), err)
		}
	}
}

func TestReviewBody_Empty(t *testing.T) {
	cases := []string{"", "   ", "\t\n"}
	for _, b := range cases {
		if err := validator.ReviewBody(b); err == nil {
			t.Errorf("expected error for empty body %q, got nil", b)
		}
	}
}

func TestReviewBody_TooLong(t *testing.T) {
	body := strings.Repeat("x", 2001)
	if err := validator.ReviewBody(body); err == nil {
		t.Error("expected error for body > 2000 chars, got nil")
	}
}

// ── GeoQueryParams ────────────────────────────────────────────────────────────

func TestGeoQueryParams_BothPresent_Valid(t *testing.T) {
	lat := 40.7128
	lon := -74.0060
	if err := validator.GeoQueryParams(&lat, &lon, 500); err != nil {
		t.Errorf("expected valid geo params, got: %v", err)
	}
}

func TestGeoQueryParams_NeitherPresent_Valid(t *testing.T) {
	if err := validator.GeoQueryParams(nil, nil, 500); err != nil {
		t.Errorf("expected valid when neither lat nor lon provided, got: %v", err)
	}
}

func TestGeoQueryParams_LatWithoutLon(t *testing.T) {
	lat := 40.7128
	err := validator.GeoQueryParams(&lat, nil, 500)
	if err == nil {
		t.Fatal("expected error when lat provided without lon, got nil")
	}
	if !strings.Contains(err.Error(), "together") {
		t.Errorf("error should mention 'together', got: %v", err)
	}
}

func TestGeoQueryParams_LonWithoutLat(t *testing.T) {
	lon := -74.0060
	err := validator.GeoQueryParams(nil, &lon, 500)
	if err == nil {
		t.Fatal("expected error when lon provided without lat, got nil")
	}
}

func TestGeoQueryParams_RadiusOutOfRange(t *testing.T) {
	cases := []int{0, -1, 50001, 100000}
	for _, r := range cases {
		if err := validator.GeoQueryParams(nil, nil, r); err == nil {
			t.Errorf("expected error for radius=%d, got nil", r)
		}
	}
}

// ── Limit ─────────────────────────────────────────────────────────────────────

func TestLimit_Valid(t *testing.T) {
	cases := []int{1, 10, 50, 100}
	for _, l := range cases {
		if err := validator.Limit(l, 1, 100); err != nil {
			t.Errorf("expected limit %d to be valid, got: %v", l, err)
		}
	}
}

func TestLimit_Invalid(t *testing.T) {
	cases := []int{0, -1, 101, 1000}
	for _, l := range cases {
		if err := validator.Limit(l, 1, 100); err == nil {
			t.Errorf("expected limit %d to be invalid, got nil", l)
		}
	}
}
