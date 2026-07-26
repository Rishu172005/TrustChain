import { useEffect, useState } from 'react';
import { latLngBounds } from 'leaflet';
import { CircleMarker, MapContainer, TileLayer, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function MapBoundsController({ pois, recommendedPoiIds, selectedPoiId }) {
  const map = useMap();

  useEffect(() => {
    const highlightedPois = pois.filter(
      (poi) => recommendedPoiIds.has(poi.id) || poi.id === selectedPoiId
    );
    if (highlightedPois.length === 0) return;
    const bounds = latLngBounds(highlightedPois.map((poi) => [poi.lat, poi.lng]));
    map.fitBounds(bounds.pad(0.3), { padding: [24, 24] });
  }, [map, pois, recommendedPoiIds, selectedPoiId]);

  return null;
}

export default function PoiMap({
  pois,
  onSelectPoi,
  onCheckIn,
  onOpenDetails,
  selectedPoiId,
  recommendedPoiIds = new Set(),
}) {
  const nycCenter = [40.7128, -74.006];
  const [tilesAvailable, setTilesAvailable] = useState(true);

  // Render recommended + selected LAST so they sit on top of general dots
  const sortedPois = [...pois].sort((a, b) => {
    const rank = (p) =>
      selectedPoiId === p.id ? 2 : recommendedPoiIds.has(p.id) ? 1 : 0;
    return rank(a) - rank(b);
  });

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={nycCenter}
        zoom={12}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          eventHandlers={{
            load: () => setTilesAvailable(true),
            tileerror: () => setTilesAvailable(false),
          }}
        />
        <MapBoundsController
          pois={pois}
          recommendedPoiIds={recommendedPoiIds}
          selectedPoiId={selectedPoiId}
        />

        {sortedPois.map((poi) => {
          const isSelected = selectedPoiId === poi.id;
          const isRecommended = recommendedPoiIds.has(poi.id);

          // ── Colours ───────────────────────────────
          const color = isSelected
            ? '#34d399'   // emerald green
            : isRecommended
            ? '#f97316'   // vivid orange
            : '#60a5fa';  // sky blue

          // ── Sizes ─────────────────────────────────
          //   General     → radius 3,  tiny, low-opacity background dots
          //   Recommended → radius 16, very prominent with double halo
          //   Selected    → radius 14, solid filled with halo
          const mainRadius  = isSelected ? 14 : isRecommended ? 11 : 3;
          const haloRadius1 = isSelected ? 24 : 19; // inner solid ring
          const haloRadius2 = isSelected ? 34 : 27; // outer dashed ring

          return (
            <div key={poi.id}>
              {/* ── Double halo rings for recommended / selected ── */}
              {(isRecommended || isSelected) && (
                <>
                  {/* Inner solid halo */}
                  <CircleMarker
                    center={[poi.lat, poi.lng]}
                    radius={haloRadius1}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity: 0,
                      weight: 2,
                      opacity: 0.45,
                    }}
                    interactive={false}
                  />
                  {/* Outer dashed ring */}
                  <CircleMarker
                    center={[poi.lat, poi.lng]}
                    radius={haloRadius2}
                    pathOptions={{
                      color,
                      fillColor: color,
                      fillOpacity: 0,
                      weight: 1.5,
                      opacity: 0.2,
                      dashArray: '5 6',
                    }}
                    interactive={false}
                  />
                </>
              )}

              {/* ── Main marker ───────────────────── */}
              <CircleMarker
                center={[poi.lat, poi.lng]}
                radius={mainRadius}
                pathOptions={{
                  color,
                  fillColor: color,
                  // General: semi-transparent tiny dot so all 34k are visible but subtle
                  fillOpacity: isSelected ? 1 : isRecommended ? 0.95 : 0.45,
                  weight: isSelected ? 3 : isRecommended ? 2.5 : 0.8,
                  opacity: isRecommended || isSelected ? 1 : 0.6,
                }}
                eventHandlers={{ click: () => onSelectPoi(poi) }}
              >
                <Popup>
                  <div className="popup-content">
                    {isRecommended && (
                      <div className="popup-recommended-badge">
                        ⭐ Recommended for you
                      </div>
                    )}
                    {isSelected && (
                      <div className="popup-selected-badge">
                        📍 Currently Selected
                      </div>
                    )}
                    <strong>{poi.name}</strong>
                    <div className="popup-copy">{poi.category}</div>
                    <div className="popup-copy">
                      {poi.checkins?.toLocaleString()} check-ins
                    </div>

                    {/* Score details — recommended or scored POIs */}
                    {(isRecommended || poi.score != null) && onOpenDetails && (
                      <button
                        type="button"
                        className="popup-button"
                        style={{
                          marginBottom: '6px',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          color: '#ffffff',
                          boxShadow: '0 4px 10px rgba(59,130,246,0.25)',
                        }}
                        onClick={() => {
                          onSelectPoi(poi);
                          onOpenDetails(poi);
                        }}
                      >
                        📊 View Scores
                      </button>
                    )}
                    <button
                      type="button"
                      className="popup-button"
                      onClick={() => {
                        onSelectPoi(poi);
                        onCheckIn(poi);
                      }}
                    >
                      Check in here
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            </div>
          );
        })}
      </MapContainer>

      {/* ── Map legend ─────────────────────────────── */}
      <div className="map-legend">
        <div className="map-legend-item">
          <span
            className="map-legend-dot"
            style={{ background: '#34d399', boxShadow: '0 0 6px #34d399aa' }}
          />
          Selected
        </div>
        <div className="map-legend-item">
          <span
            className="map-legend-dot"
            style={{ background: '#f97316', boxShadow: '0 0 8px #f97316cc' }}
          />
          Recommended
        </div>
        <div className="map-legend-item">
          <span
            className="map-legend-dot"
            style={{ background: '#60a5fa', opacity: 0.7 }}
          />
          General POI
        </div>
      </div>

      {!tilesAvailable && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.75)',
            color: 'white',
            padding: '16px',
            textAlign: 'center',
            zIndex: 1000,
          }}
        >
          <div>
            <strong>Map tiles are temporarily unavailable.</strong>
            <div style={{ marginTop: '6px', fontSize: '0.95rem' }}>
              The POI dashboard is still working, and you can continue using the rest of the interface.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}