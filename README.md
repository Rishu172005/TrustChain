# TrustChain

TrustChain is a project that combines several technologies into one working system:
- blockchain smart contracts for trust and token tracking
- federated learning for personalized recommendations
- backend APIs for user actions and data flow
- a map-based React frontend for interaction
- dataset processing and research notes to support the design

This repository is organized so that each part can be understood and run separately, while still working together as a complete recommendation system.

## What This Project Does

TrustChain simulates a location-based recommendation system where users can:
- explore points of interest (POIs) on a map
- check in at a location and earn tokens
- submit reviews for extra rewards
- receive personalized suggestions from a federated learning model
- inspect why a POI was recommended using a transparency panel

The system also includes defense logic for detecting fake activity and applying privacy protections.

## Who Should Read This

This README is written for someone who knows basic programming, but may not be an expert in blockchain, machine learning, or React. It explains:
- the main components of the project
- how they fit together
- how to run the system locally
- what each API does

## Setup Guide

### Prerequisites
Install the following before running TrustChain:
- Node.js 18+ and npm
- Python 3.11+
- MongoDB (local or cloud)
- Go
- Git

### 1. Frontend Setup
The frontend shows the map and recommendation UI.

```bash
cd /Users/rishukishan/Documents/9th/internship/TrustChain/frontend
npm install
npm run dev
```

Open the browser at `http://localhost:5173` to see the frontend.

> Runtime note: The frontend is configured to run locally from the `frontend/` folder with `npm install` and `npm run dev`. It loads POI and recommendation assets from `frontend/public/pois.json` and `frontend/public/recommendations.json`.

### 2. Backend Setup
The backend runs server APIs used by the frontend.

```bash
cd /Users/rishukishan/Documents/9th/internship/TrustChain/backend
go mod tidy
go run ./cmd/server
```

This starts the backend service. It handles actions like check-ins, reviews, and token balance.

### 3. Federated Learning Setup
The `federated/` folder runs the recommendation model and defense logic.

```bash
cd /Users/rishukishan/Documents/9th/internship/TrustChain/federated
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python flower_server.py
```

This will start the federated learning server that generates recommendations and defense metadata.

### 4. Data Setup
The data folder contains the raw dataset and the cleaned version used by the project.

Files to know:
- `data/raw/dataset_TSMC2014_NYC.txt`
- `data/processed/foursquare_nyc_clean.csv`
- `data/preprocess.py`

Run the preprocessing script to clean and prepare the dataset before training or generating recommendations.

### 5. Defense Integration
The file `S4_DEFENSE_INTEGRATION.py` contains helper code for bot detection and differential privacy. It is used to make the recommendation pipeline safer and more robust.

## High-Level Architecture

The project is split into five main parts. Each part has a clear role:

1. **Frontend** (`frontend/`)
   - React application with a Leaflet map
   - displays POI markers and recommended items
   - supports check-ins, wallet view, reviews, and explanation panels

2. **Backend** (`backend/`)
   - serves REST APIs for frontend actions
   - connects to data and optionally to the smart contract layer
   - handles requests like `/checkin`, `/review`, `/recommend`, and `/token-balance`

3. **Contracts** (`contracts/`)
   - smart contract code for token tracking and recommendation proof
   - intended for blockchain trust and geofencing logic

4. **Federated** (`federated/`)
   - runs a federated learning simulation
   - generates recommendation scores for different user profiles
   - includes defense logic for fake activity and privacy

5. **Data** (`data/`)
   - raw dataset files and cleaned POI/check-in records
   - used by model training and the frontend dataset

### How the system works together

- The frontend asks the backend for recommendations and user status.
- The backend may query the federated learning service or read pre-generated recommendation data.
- The frontend presents results on a map and allows the user to perform actions.
- Check-ins and reviews are recorded, and token balance is updated.
- The explanation panel shows why the model recommended a specific POI.

## Walkthrough: What a user sees

1. The user opens the app and sees a map of NYC points of interest.
2. The UI highlights recommended POIs for the active profile.
3. The user clicks a POI and can check in to earn tokens.
4. The user can also submit a review and earn additional reward tokens.
5. The user can open the recommendation explanation panel to see:
   - proximity score
   - community rating
   - model score

This makes the system easy to understand and builds trust in the recommendation engine.

## API Documentation

These are the main backend routes. They let the frontend and other services interact with TrustChain.

### `POST /checkin`
Simulates a user checking in at a location.

Request body example:
```json
{
  "userId": "user123",
  "poiId": "poi_abc",
  "timestamp": "2026-07-13T12:34:56Z"
}
```

Response example:
```json
{
  "success": true,
  "tokensAwarded": 1,
  "newBalance": 121
}
```

### `POST /review`
Records a user review and grants reward tokens.

Request body example:
```json
{
  "userId": "user123",
  "poiId": "poi_abc",
  "rating": 5,
  "comment": "Great place!"
}
```

Response example:
```json
{
  "success": true,
  "tokensAwarded": 5,
  "reviewId": "review_001"
}
```

### `GET /recommend`
Returns recommended places for the user profile.

Response example:
```json
{
  "profileId": "commuter",
  "recommendations": [
    {"id":"poi_001","name":"Station","score":0.92},
    {"id":"poi_002","name":"Cafe","score":0.86}
  ]
}
```

### `GET /token-balance?userId=user123`
Returns the user's current token balance.

Response example:
```json
{
  "userId": "user123",
  "balance": 125
}
```

## Extra Features

### Transparency explanation
The frontend includes a panel that explains why a POI was recommended, showing:
- proximity score
- community rating
- model score

This helps a non-technical user understand the recommendation logic.

### Defense metadata
The system can also attach a defense shield summary to recommendations:
```json
{
  "defenseShield": {
    "flaggedBots": 4,
    "retentionRate": 84.3
  }
}
```
This shows how many suspicious bot actions were filtered out.

### Mock oracle and geo-fencing
A Task 5 extension introduces a mock oracle service that:
- accepts geolocation requests
- calls the federated model for POI scores
- signs and forwards results to the geo recommendation contract

This is a simplified version of how a real system could connect geo queries to blockchain-based ranking.

## What to read first

If you want to understand the project quickly, start here:
1. `README.md` — overall project explanation and setup
2. `frontend/` — user-facing app and UI flow
3. `backend/` — API logic and data routing
4. `federated/` — recommendation model and defense logic
5. `contracts/` — blockchain trust and recommendation contracts
6. `data/` — raw and processed datasets used by the system

## Notes

This README is designed so that someone new to the project can understand the purpose, the pieces, and how to run it locally. The code contains the working implementation when run alongside the frontend, backend, federated model, and data files.
