import { CircleMarker, MapContainer, TileLayer, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export default function PoiMap({ pois, onSelectPoi, onCheckIn, selectedPoiId, recommendedPoiIds = new Set() }) {
  const nycCenter = [40.7128, -74.006];

  return (
    <MapContainer center={nycCenter} zoom={12} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {pois.map((poi) => {
        const isSelected = selectedPoiId === poi.id;
        const isRecommended = recommendedPoiIds.has(poi.id);
        const color = isSelected ? '#34d399' : isRecommended ? '#f59e0b' : '#60a5fa';

        return (
          <CircleMarker
            key={poi.id}
            center={[poi.lat, poi.lng]}
            radius={isSelected ? 9 : isRecommended ? 8 : 6}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: isSelected ? 0.95 : 0.72,
              weight: isSelected ? 3 : 2,
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
  );
}