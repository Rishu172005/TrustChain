# TrustChain S4 - Week 2 Completion Report

## 1. Summary

Week 2 completed the S4 scope for research, frontend setup, and dataset preparation. The team now has a consistent stack, an agreed dataset, and a map-based frontend shell ready for later integration.

## 2. Team Roles

| Student | Role | Focus | Status |
| --- | --- | --- | --- |
| priyadharshini (S1) | Blockchain Lead | Smart contracts, chain architecture | Confirmed |
| Amber (S2) | ML/AI Lead | Federated learning, recommendation model | Confirmed |
| Siddhartha (S3) | Backend Lead | APIs, data pipeline, integration | Confirmed |
| Rishu Kishan (S4) | Frontend/Research Lead | Dataset exploration, map UI, feasibility/research documentation | Completed |

## 3. Repository and Platform Setup

The repository is organized into isolated work areas for each team member:

- `contracts`
- `federated`
- `backend`
- `frontend`
- `data`
- `docs`
- `notebooks`

Planned platforms and APIs:

- Blockchain development on a local Hardhat testnet
- Smart contract calls via `ethers.js`
- Backend service with Node.js or FastAPI and MongoDB
- Frontend deployment on Vercel or Netlify
- Backend deployment on Render or Railway
- Federated learning simulation with Flower and Python
- Leaflet map rendering with OpenStreetMap tiles

## 4. Feasibility Study Status

The detailed feasibility writeup is available in `docs/week2/feasibility_study.md` and now captures:

- dataset choice and size
- stack selection for each module
- deployment candidates
- architecture boundaries
- research gaps for the next phase

## 5. Research Gaps Identified

- Cold-start recommendations for new users and new venues
- Sparse interaction handling for POI recommendation
- Privacy trade-offs between local learning and shared updates
- Later integration of on-chain trust events with off-chain recommendation logic

## 6. S4 Deliverable Completion

### Completed items

- Foursquare NYC dataset selected and explored
- Cleaning and preprocessing workflow documented
- React frontend shell implemented with a Leaflet map and POI markers
- Check-in action and token balance display added to the UI
- Notes prepared for the broader team on feasibility and stack selection

### Current artifacts

- `data/preprocess.py`
- `data/raw/dataset_TSMC2014_NYC.txt`
- `data/processed/foursquare_nyc_clean.csv`
- `frontend/src/App.jsx`
- `frontend/src/PoiMap.jsx`
- `frontend/src/pois.json`
- `notebooks/S4_EDA.ipynb`
- `docs/week1/TrustChain.md`
- `docs/week1/S4_week1_overview.md`
- `docs/week2/feasibility_study.md`

## 7. Validation Notes

- The frontend reads the local POI JSON sample and renders markers on the map.
- The docs now reference the actual filenames present in the workspace.
- The week 2 report no longer points to missing component filenames.

## 8. Conclusion

S4 Week 2 is complete and cleaned up. The documentation now reflects the actual project structure and the current frontend/dataset state, which makes the folder easier to maintain for the integration phase.