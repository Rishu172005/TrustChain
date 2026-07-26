# Federated Learning — TrustChain

Privacy-preserving, decentralised model training for POI recommendations using [Flower](https://flower.ai/) (Flwr 1.9) and scikit-learn, with Differential Privacy via Laplacian noise (ε = 1.0).

---

## What This Module Does

1. **Simulates 3 FL clients** (user profiles: Commuter, Foodie, Tourist)
2. Each client trains a **logistic regression model** on its local Gowalla NYC check-in slice
3. Clients exchange **model weights only** — raw check-in data never leaves the device
4. **Differential privacy** is applied to each gradient update before sending (Laplacian noise, ε = 1.0)
5. The **flower_server** aggregates weights using FedAvg and writes the result to `../frontend/src/recommendations.json`
6. The model hash is logged (can optionally be anchored to the `ModelHashRegistry` contract)

---

## Files

| File | Purpose |
|---|---|
| `flower_server.py` | FL aggregation server (FedAvg); writes `recommendations.json` |
| `flower_client.py` | FL client base class — local training + DP noise application |
| `task3.py` | Dataset loader + logistic regression model definition |
| `launch_fl.py` | Launches server + 3 simulated clients in one command |
| `requirements.txt` | Python dependencies |
| `FEDERATED_LEARNING.md` | Deep-dive technical documentation |
| `readme.md` | This file |

---

## Quick Start

### Prerequisites
```bash
python --version   # 3.11+
pip install -r requirements.txt
```

### Run Federated Training
```bash
# From the TrustChain root
cd federated

# Option A — Single command (recommended)
python launch_fl.py
# Starts server on localhost:8080, spawns 3 clients, runs 5 rounds

# Option B — Manual (two terminals)
# Terminal 1:
python flower_server.py
# Terminal 2:
python flower_client.py --profile commuter
python flower_client.py --profile foodie
python flower_client.py --profile tourist
```

### Output
After training completes, `../frontend/src/recommendations.json` is updated with:
```json
{
  "meta": { "rounds": 5, "epsilon": 1.0, "defenseShield": {...} },
  "profiles": [
    {
      "id": "commuter",
      "label": "Commuter",
      "recommendations": [
        { "id": "...", "name": "...", "score": 0.847, "checkins": 1234, ... }
      ]
    }
  ]
}
```

---

## Privacy Guarantee

| Parameter | Value | Meaning |
|---|---|---|
| ε (epsilon) | 1.0 | Moderate privacy (lower = stronger) |
| Noise type | Laplacian | Scale = sensitivity / ε |
| Sensitivity | 1.0 / n_samples | Per-weight gradient sensitivity |
| Rounds | 5 | FedAvg aggregation rounds |

Each client adds `Laplace(0, sensitivity/ε)` noise to its weight vector **before** sending to the server. This prevents the server from recovering individual check-in patterns.

---

## Defence Shield (Bot Detection)

The server applies dual-threshold anomaly detection before model aggregation:

1. **Frequency threshold** — users with > 15 check-ins/hour flagged as bots
2. **Spatial threshold** — check-ins spanning > 50km in < 30min flagged as impossible

Flagged users are excluded from training data. The `defenseShield` field in `recommendations.json` contains counts of filtered users, which the frontend displays in the Defence Shield banner.

---

## Integration with the Rest of TrustChain

```
federated/flower_server.py
    │
    ├── reads:  ../data/processed/   (Gowalla NYC dataset, pre-processed)
    ├── writes: ../frontend/src/recommendations.json
    │           (consumed by Vite dev server, served as static file)
    │
    └── optional: TrustToken.mintModelHash(sha256(weights))
                  (anchors model hash on Hardhat via Go backend)
```

The frontend reads `recommendations.json` as a **static file** from Vite. The Go backend serves the raw POI list from MongoDB.

---

## Requirements

```
flwr==1.9.0
scikit-learn==1.5.0
numpy==1.26.4
pandas==2.0.3
```

Install:
```bash
pip install -r requirements.txt
# or use the project venv:
source ../.venv311/bin/activate
pip install -r requirements.txt
```
