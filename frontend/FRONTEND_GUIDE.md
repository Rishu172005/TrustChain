# TrustChain Frontend - POI Map Explorer

## Overview

A React-based map-driven POI (Point of Interest) recommendation interface powered by federated learning. Users can browse NYC POIs, check in at locations, earn tokens, and receive personalized recommendations based on their profile.

## Features - Tasks 2-4

### Task 2: Dataset & UI Shell (Week 8-12 June) ✅
- **POI Dataset**: Foursquare NYC with 220+ venues
- **Map View**: Leaflet.js interactive map showing all POIs
- **Profile Switching**: 3 federated personas (Commuter, Explorer, Social)
- **Token Display**: Real-time balance and add tokens button
- **Check-in Button**: Click POI popup to check-in and earn tokens

### Task 3: Integration with FL Model (Week 22-26 June) ✅
- **Recommendations Feed**: Top 5 POIs per profile from FL model
- **Smart Markers**: 
  - 🟢 Green: Selected POI
  - 🟠 Amber: Recommended for active profile
  - 🔵 Blue: General POIs
- **Check-in History**: Tracks all check-ins with timestamps
- **View All History**: Toggle to expand/collapse full history
- **History in Topbar**: Quick access to check-in history

### Task 4: Polish & Wallet Features (Week 29 June - 3 July) 🚀
- **💰 Token Wallet**: View current balance and transaction history
- **📝 Review Submission**: Write reviews (+5 token reward)
- **🤔 Recommendation Explanation**: See why POIs are recommended
- **Profile Accuracy**: Validation accuracy shown per profile
- **Top Categories**: Display top 3 category preferences per profile

## Architecture

```
frontend/
├── src/
│   ├── App.jsx              # Main app component with state management
│   ├── PoiMap.jsx           # Leaflet map component
│   ├── App.css              # Styling (responsive, dark theme)
│   ├── index.css            # Global styles
│   ├── main.jsx             # React entry point
│   └── pois.json            # POI data (local copy)
├── public/
│   ├── pois.json            # POI master file
│   ├── recommendations.json # FL model output
│   ├── user_profiles.json   # User preference scores
│   └── pois_preview.json    # Preview subset (220 POIs)
├── package.json             # Dependencies
├── vite.config.js           # Vite build config
└── eslint.config.js         # Linting rules
```

## Component Hierarchy

```
App (state + modals)
├── Topbar (profile switcher, history toggle, wallet, token display)
├── Main Content Grid
│   ├── Left Panel (summary)
│   │   ├── Stats (POI count, token balance, accuracy)
│   │   ├── Profile Switcher
│   │   ├── Recommendation Feed (top 5 POIs)
│   │   └── Check-in Status + History
│   └── Right Panel (map)
│       └── PoiMap (Leaflet map with markers)
├── Modal: Wallet
├── Modal: Review Form
└── Modal: Explanation
```

## State Management

### App State Variables:
```javascript
// Data
const [poiData, setPoiData] = useState([])  // All POIs
const [recommendationData, setRecommendationData] = useState({})  // FL output

// User Selection
const [selectedProfileId, setSelectedProfileId] = useState('')  // Current profile
const [selectedPoi, setSelectedPoi] = useState(null)  // Highlighted POI

// Tokens & History
const [tokenBalance, setTokenBalance] = useState(120)  // Token count
const [checkInHistory, setCheckInHistory] = useState([])  // All check-ins
const [lastCheckIn, setLastCheckIn] = useState(null)  // Most recent

// UI State
const [showAllHistory, setShowAllHistory] = useState(false)  // History expanded
const [showWallet, setShowWallet] = useState(false)  // Wallet modal
const [showReviewForm, setShowReviewForm] = useState(false)  // Review modal
const [showExplanation, setShowExplanation] = useState(false)  // Explanation modal
```

## User Flows

### Flow 1: Check-in & Earn Tokens
1. User selects profile
2. Views map with recommended POIs (amber) highlighted
3. Clicks POI marker on map
4. Clicks "Check in here" in popup
5. `+1` token awarded
6. Entry added to history

### Flow 2: View Wallet
1. Click "Wallet" button in topbar
2. See current balance and recent transactions
3. Each check-in shows `+1` token
4. Each review shows `+5` tokens

### Flow 3: Submit Review (Task 4)
1. Click review icon on POI
2. Select rating (1-5 stars)
3. Write review text
4. Submit (+5 tokens awarded)
5. Returns to map

### Flow 4: See Recommendation Explanation (Task 4)
1. Click explanation icon on POI
2. See breakdown:
   - Category match (58% weight)
   - Popularity (27% weight)
   - FL model boost (15% weight)
3. Close to return

## Running the Application

### Quick Start
```bash
cd frontend
npm install  # (first time only)
npm run dev
```

Open: `http://localhost:5173`

### Building for Production
```bash
cd frontend
npm run build
npm run preview  # Test production build
```

### Development Tools
```bash
# Lint code
npm run lint

# View build output
npm run preview
```

## Data Files

### pois.json
```json
[
  {
    "id": "42911d00f964a520f5231fe3",
    "name": "Train Station",
    "category": "Transit",
    "lat": 40.750794799423865,
    "lng": -73.99357639021292,
    "checkins": 1134
  },
  ...
]
```

### recommendations.json (from FL model)
```json
{
  "generatedAt": "2026-06-24T08:02:14.239690+00:00",
  "meta": {
    "model": "Federated collaborative filtering",
    "rounds": 5,
    "clients": 3,
    "finalAccuracy": 0.93
  },
  "rounds": [
    {"round": 1, "accuracy": 0.63, "loss": 0.5},
    ...
  ],
  "profiles": [
    {
      "id": "commuter",
      "label": "Transit Commuter",
      "description": "Prefers practical stops, transport hubs, and quick food.",
      "validationAccuracy": 0.99,
      "topCategories": ["Transit", "Food", "Business"],
      "recommendations": [
        {
          "id": "...",
          "name": "...",
          "category": "Transit",
          "lat": 40.75...,
          "lng": -73.99...,
          "checkins": 1134,
          "score": 0.4489
        },
        ...
      ]
    },
    ...
  ]
}
```

## Styling

### Design System
- **Theme**: Dark mode with teal/blue accents
- **Colors**:
  - Primary: Teal (#5eead4)
  - Accent: Blue (#60a5fa)
  - Success: Green (#22c55e)
  - Warning: Amber (#f59e0b)
  - Background: Dark blue (#07111f)
- **Typography**: System fonts, responsive sizes
- **Spacing**: 2px base unit (multiples of 2, 4, 6, 8, 12, 16, 18, 20, 22, 24)
- **Border Radius**: 12-28px (increasing with importance)

### Responsive Design
- Mobile: Single column, full-width panels
- Tablet (720px+): Adjusts grid columns
- Desktop (1100px+): 2-column layout

### Dark Mode
All colors use `rgba()` for transparency and layering
Glassmorphism: `backdrop-filter: blur()`

## Performance Optimizations

- **Lazy Loading**: POI data fetched once on mount
- **Memoization**: Profile selection doesn't re-render map
- **Event Delegation**: Marker clicks handled by Leaflet
- **CSS Grid**: GPU-accelerated layout
- **Vite**: Fast dev server with HMR

## Dependencies

```json
{
  "dependencies": {
    "leaflet": "^1.9.4",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "react-leaflet": "^5.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^6.0.1",
    "eslint": "^10.3.0",
    "vite": "^8.0.12"
  }
}
```

## Integration with Backend (S3)

The frontend expects a `/recommend` endpoint that returns `recommendations.json`:

```javascript
// GET /api/recommend?profileId=commuter
// Returns: { rounds, profiles, meta }
```

Currently using static JSON files in `public/` folder.

## Integration with FL (S2)

The frontend displays recommendations generated by:
- `federated/task3.py` - Generates recommendations.json
- `federated/flower_server.py` + `flower_client.py` - FL training

To regenerate recommendations:
```bash
cd TrustChain
python3 federated/task3.py
# Output: frontend/public/recommendations.json
```

## Integration with Blockchain (S1)

**Pending**: S3 backend will connect:
- Check-in events → Smart contract token mint
- Review submissions → PoR contract

```javascript
// Future: When backend connected
POST /api/checkin
{
  "poiId": "...",
  "userId": "...",
  "profileId": "commuter"
}
// Triggers: Smart contract token award
```

## Testing Checklist

- [x] Frontend loads without errors
- [x] POI data loads from public/pois.json
- [x] Recommendations load from recommendations.json
- [x] Profile switching updates recommendations
- [x] Map renders with 220 POIs
- [x] Markers show correct colors (green/amber/blue)
- [x] Click POI → popup appears
- [x] Click "Check in" → token awarded (+1)
- [x] Check-in history displays correctly
- [x] "View all history" toggle works
- [x] Wallet button shows modal
- [x] Wallet displays transaction list
- [x] Review form modal opens
- [x] Explanation modal shows recommendation breakdown
- [x] Topbar has history, wallet, and token buttons
- [x] Responsive design works on mobile

## Known Issues & Future Work

### Task 4 Enhancements
- [ ] Review form submission to backend
- [ ] Explanation factors dynamically calculated
- [ ] User profile management
- [ ] Persist wallet across page reloads (localStorage)
- [ ] Real-time recommendation updates
- [ ] Search POIs by name/category
- [ ] Filter POIs by distance

### Performance
- [ ] Virtualize long history lists (1000+ items)
- [ ] Optimize map rendering for 1000s of POIs
- [ ] Add marker clustering

### Accessibility
- [ ] Keyboard navigation for map
- [ ] Screen reader labels for modals
- [ ] High contrast theme option

## Developer Notes

### Adding a New Feature
1. Add state in `App.jsx`: `const [feature, setFeature] = useState(false)`
2. Create handler function: `const handleFeature = () => { ... }`
3. Add UI in JSX: `{feature && <FeatureComponent />}`
4. Add styles in `App.css`: `.feature-class { ... }`
5. Test: `npm run dev` and interact with feature
6. Build: `npm run build` and verify

### Common Patterns
```javascript
// Load data on mount
useEffect(() => {
  fetch('/path/to/data.json')
    .then(r => r.json())
    .then(data => setState(data))
}, [])

// Update derived state when dependency changes
useEffect(() => {
  if (!selectedProfile) return
  setDerivedValue(calculateValue(selectedProfile))
}, [selectedProfile])

// Modal pattern
{showModal && (
  <div className="modal-overlay" onClick={() => setShowModal(false)}>
    <div className="modal" onClick={e => e.stopPropagation()}>
      {/* Modal content */}
    </div>
  </div>
)}
```

## References

- [React Documentation](https://react.dev)
- [Leaflet.js](https://leafletjs.com)
- [Vite](https://vitejs.dev)
- [TailwindCSS](https://tailwindcss.com) (for design inspiration)
