import { useEffect, useState } from 'react';
import { latLngBounds } from 'leaflet';
import { CircleMarker, MapContainer, TileLayer, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function MapBoundsController({ pois, recommendedPoiIds, selectedPoiId }) {
  const map = useMap();

  useEffect(() => {
    const highlightedPois = pois.filter((poi) => recommendedPoiIds.has(poi.id) || poi.id === selectedPoiId);

    if (highlightedPois.length === 0) {
      return;
    }

    const bounds = latLngBounds(highlightedPois.map((poi) => [poi.lat, poi.lng]));
    map.fitBounds(bounds.pad(0.3), { padding: [24, 24] });
  }, [map, pois, recommendedPoiIds, selectedPoiId]);

  return null;
}

export default function PoiMap({ pois, onSelectPoi, onCheckIn, selectedPoiId, recommendedPoiIds = new Set() }) {
  const nycCenter = [40.7128, -74.006];
  const [tilesAvailable, setTilesAvailable] = useState(true);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer center={nycCenter} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          eventHandlers={{
            load: () => setTilesAvailable(true),
            tileerror: () => setTilesAvailable(false),
          }}
        />
        <MapBoundsController pois={pois} recommendedPoiIds={recommendedPoiIds} selectedPoiId={selectedPoiId} />

        {pois.map((poi) => {
          const isSelected = selectedPoiId === poi.id;
          const isRecommended = recommendedPoiIds.has(poi.id);
          const color = isSelected ? '#34d399' : isRecommended ? '#f97316' : '#60a5fa';
          const radius = isSelected ? 10 : isRecommended ? 9 : 6;

          return (
            <CircleMarker
              key={poi.id}
              center={[poi.lat, poi.lng]}
              radius={radius}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: isSelected ? 0.95 : isRecommended ? 0.92 : 0.72,
                weight: isSelected ? 3 : isRecommended ? 2.5 : 2,
              }}
              eventHandlers={{ click: () => onSelectPoi(poi) }}
            >
              <Popup>
                <div className="popup-content">
                  <strong>{poi.name}</strong>
                  <div className="popup-copy">{poi.category}</div>
                  <div className="popup-copy">
                    {isSelected ? 'Selected for check-in' : isRecommended ? 'Recommended for this profile' : 'Tap to select'}
                  </div>
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
          );
        })}
      </MapContainer>
      {!tilesAvailable && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15, 23, 42, 0.75)', color: 'white', padding: '16px', textAlign: 'center', zIndex: 1000 }}>
          <div>
            <strong>Map tiles are temporarily unavailable.</strong>
            <div style={{ marginTop: '6px', fontSize: '0.95rem' }}>The POI dashboard is still working, and you can continue using the rest of the interface.</div>
          </div>
        </div>
      )}
    </div>
  );
}