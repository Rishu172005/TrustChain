// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title GeoRecommender
/// @notice Stores POI locations (as integer-encoded coordinates) and a
/// model score per POI (fed in by an authorized oracle — see Task 5's mock
/// oracle service). Given a user's bounding box, returns the POIs inside it
/// ranked by score. Coordinates are encoded as degrees * 1e6 (a common
/// fixed-point trick) since Solidity has no native decimal type.
contract GeoRecommender is Ownable {
    /// @dev Scale factor for encoding lat/lng as integers, e.g. 12.9716
    /// degrees -> 12971600. Matches the encoding the off-chain oracle must use.
    int256 public constant COORD_SCALE = 1_000_000;

    int256 public constant MIN_LAT = -90 * COORD_SCALE;
    int256 public constant MAX_LAT = 90 * COORD_SCALE;
    int256 public constant MIN_LNG = -180 * COORD_SCALE;
    int256 public constant MAX_LNG = 180 * COORD_SCALE;

    struct POI {
        int256 lat; // encoded, see COORD_SCALE
        int256 lng; // encoded, see COORD_SCALE
        uint256 score; // model/community score, updated by the oracle
        bool active;
    }

    /// @notice Address authorized to register POIs and push score updates
    /// (the backend's mock oracle service in Task 5).
    address public oracle;

    mapping(uint256 => POI) public pois;
    uint256[] public poiIds;
    mapping(uint256 => bool) private poiExists;

    event OracleUpdated(address indexed newOracle);
    event POIRegistered(uint256 indexed poiId, int256 lat, int256 lng);
    event POIScoreUpdated(uint256 indexed poiId, uint256 newScore);
    event POIDeactivated(uint256 indexed poiId);

    modifier onlyOracle() {
        require(msg.sender == oracle, "GeoRecommender: caller is not the oracle");
        _;
    }

    constructor(address initialOracle, address initialOwner) Ownable(initialOwner) {
        oracle = initialOracle;
    }

    function setOracle(address newOracle) external onlyOwner {
        require(newOracle != address(0), "GeoRecommender: oracle cannot be zero address");
        oracle = newOracle;
        emit OracleUpdated(newOracle);
    }

    /// @notice Register a new POI with validated, encoded coordinates.
    /// @dev Explicit range checks here are the fix for the coordinate-encoding
    /// audit finding (see security audit report): Solidity 0.8+ reverts on
    /// raw arithmetic overflow automatically, but that alone does NOT stop
    /// a caller from submitting a logically nonsensical coordinate (e.g.
    /// lat = 999999 * COORD_SCALE) that fits in an int256 without
    /// overflowing. These bounds checks are what actually prevents that.
    function registerPOI(uint256 poiId, int256 lat, int256 lng) external onlyOracle {
        require(!poiExists[poiId], "GeoRecommender: POI already registered");
        require(lat >= MIN_LAT && lat <= MAX_LAT, "GeoRecommender: lat out of range");
        require(lng >= MIN_LNG && lng <= MAX_LNG, "GeoRecommender: lng out of range");

        pois[poiId] = POI({lat: lat, lng: lng, score: 0, active: true});
        poiExists[poiId] = true;
        poiIds.push(poiId);

        emit POIRegistered(poiId, lat, lng);
    }

    /// @notice Push an updated model/community score for a POI.
    function updateScore(uint256 poiId, uint256 newScore) external onlyOracle {
        require(poiExists[poiId], "GeoRecommender: POI not registered");
        pois[poiId].score = newScore;
        emit POIScoreUpdated(poiId, newScore);
    }

    function deactivatePOI(uint256 poiId) external onlyOracle {
        require(poiExists[poiId], "GeoRecommender: POI not registered");
        pois[poiId].active = false;
        emit POIDeactivated(poiId);
    }

    /// @notice Return up to `maxResults` active POI IDs within the given
    /// bounding box, ranked by score descending.
    /// @dev Bounded, gas-aware selection sort: fine for the internship-scale
    /// POI counts used here. A production system with a large POI set would
    /// move ranking off-chain and use this contract only for the authoritative
    /// score/location data, per the brief's "novel mechanism" transparency goal.
    function getRecommendations(
        int256 minLat,
        int256 maxLat,
        int256 minLng,
        int256 maxLng,
        uint256 maxResults
    ) external view returns (uint256[] memory) {
        require(minLat <= maxLat, "GeoRecommender: invalid lat range");
        require(minLng <= maxLng, "GeoRecommender: invalid lng range");

        uint256 total = poiIds.length;
        uint256[] memory matchedIds = new uint256[](total);
        uint256[] memory matchedScores = new uint256[](total);
        uint256 matchCount = 0;

        for (uint256 i = 0; i < total; i++) {
            uint256 id = poiIds[i];
            POI storage poi = pois[id];
            if (
                poi.active &&
                poi.lat >= minLat &&
                poi.lat <= maxLat &&
                poi.lng >= minLng &&
                poi.lng <= maxLng
            ) {
                matchedIds[matchCount] = id;
                matchedScores[matchCount] = poi.score;
                matchCount++;
            }
        }

        uint256 resultCount = matchCount < maxResults ? matchCount : maxResults;
        uint256[] memory result = new uint256[](resultCount);

        // Partial selection sort — only sorts as many top entries as requested.
        for (uint256 i = 0; i < resultCount; i++) {
            uint256 bestIdx = i;
            for (uint256 j = i + 1; j < matchCount; j++) {
                if (matchedScores[j] > matchedScores[bestIdx]) {
                    bestIdx = j;
                }
            }
            if (bestIdx != i) {
                (matchedScores[i], matchedScores[bestIdx]) = (matchedScores[bestIdx], matchedScores[i]);
                (matchedIds[i], matchedIds[bestIdx]) = (matchedIds[bestIdx], matchedIds[i]);
            }
            result[i] = matchedIds[i];
        }

        return result;
    }

    function poiCount() external view returns (uint256) {
        return poiIds.length;
    }
}
