# TrustChain

TrustChain is a team project combining blockchain, federated learning, backend APIs, and a map-driven frontend for trust-aware POI recommendation.

## S4 Deliverables Index

### Week 1 (1 June to 5 June)

- Overview report: docs/week1/S4_week1_overview.md
- Detailed S4 notes: docs/week1/TrustChain.md

### Week 2 (8 June to 12 June)

- Completion report: docs/week2/S4_week2_completion_report.md
- Feasibility study (markdown): docs/week2/feasibility_study.md

## S4 Technical Outputs

- Frontend app: frontend/
- Preprocessing script: data/preprocess.py
- Cleaned dataset: data/processed/foursquare_nyc_clean.csv
- POI map data: frontend/src/pois.json
- EDA notebook: notebooks/S4_EDA.ipynb

## Quick Validation

From frontend folder:

```bash
npm install
npm run build
```

From project root:

```bash
python3 data/preprocess.py
```