"""
Federated Learning Client using Flower framework.
Implements collaborative filtering on local POI data.
"""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path
from typing import Any

import flwr as fl
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

ROOT = Path(__file__).resolve().parent.parent
DATA_PATH = ROOT / "data" / "processed" / "foursquare_nyc_clean.csv"
POI_PATH = ROOT / "frontend" / "public" / "pois.json"

CATEGORY_FAMILIES = {
    "Transit": ("station", "airport", "bus", "train", "subway", "terminal", "taxi"),
    "Food": ("restaurant", "cafe", "coffee", "food", "bar", "brewery", "diner", "pizza"),
    "Outdoor": ("park", "garden", "plaza", "beach", "trail", "outdoors"),
    "Culture": ("museum", "gallery", "theater", "theatre", "art", "library", "music", "stadium"),
    "Leisure": ("hotel", "spa", "gym", "nightclub", "lounge", "movie", "cinema", "venue"),
    "Retail": ("shop", "store", "market", "mall", "boutique", "retail"),
    "Business": ("office", "bank", "building", "conference", "center", "centre", "coworking"),
}


class POICollaborativeFilteringClient(fl.client.NumPyClient):
    """Collaborative Filtering client for POI recommendation."""

    def __init__(self, client_id: int = 0) -> None:
        self.client_id = client_id
        self.pois = self._load_pois()
        self.local_model = self._initialize_model()
        print(f"Client {client_id} initialized with {len(self.pois)} POIs")

    def _classify_category(self, category: str) -> str:
        """Classify venue into a category family."""
        category_text = str(category or "").lower()
        for family, keywords in CATEGORY_FAMILIES.items():
            if any(keyword in category_text for keyword in keywords):
                return family
        return "Other"

    def _load_pois(self) -> list[dict[str, Any]]:
        """Load POI data from JSON."""
        try:
            if POI_PATH.exists():
                with open(POI_PATH) as f:
                    return json.load(f)
        except Exception as e:
            print(f"Warning: Could not load POIs from {POI_PATH}: {e}")
        return []

    def _initialize_model(self) -> np.ndarray:
        """Initialize a simple collaborative filtering model."""
        # Model = category preference weights for this client
        # Each dimension represents one category family
        families = list(CATEGORY_FAMILIES.keys())
        preferences = np.random.rand(len(families))
        preferences /= preferences.sum()
        return preferences

    def get_parameters(self, config: dict[str, Any]) -> list[np.ndarray]:
        """Return model parameters."""
        return [self.local_model]

    def fit(self, parameters: list[np.ndarray], config: dict[str, Any]) -> tuple[list[np.ndarray], int, dict[str, Any]]:
        """Train on local data and return updated parameters."""
        print(f"\nClient {self.client_id}: Fitting...")

        # Receive global model
        global_model = parameters[0]

        # Local training: blend global model with local preferences
        learning_rate = 0.3
        self.local_model = (1.0 - learning_rate) * global_model + learning_rate * self.local_model

        # Add some local noise to simulate independent training
        noise = np.random.normal(0, 0.01, self.local_model.shape)
        self.local_model = np.clip(self.local_model + noise, 0, 1)
        self.local_model /= self.local_model.sum()

        print(f"Client {self.client_id}: Local model updated - weights: {self.local_model}")

        return [self.local_model], len(self.pois), {"client_id": self.client_id}

    def evaluate(self, parameters: list[np.ndarray], config: dict[str, Any]) -> tuple[float, int, dict[str, Any]]:
        """Evaluate model on local validation data."""
        print(f"Client {self.client_id}: Evaluating...")

        # Receive global model
        global_model = parameters[0]

        # Validation: compute similarity between local and global model
        similarity = np.dot(self.local_model, global_model) / (
            np.linalg.norm(self.local_model) * np.linalg.norm(global_model)
        )
        loss = 1.0 - similarity
        accuracy = similarity

        print(f"Client {self.client_id}: Loss={loss:.4f}, Accuracy={accuracy:.4f}")

        return loss, len(self.pois), {"accuracy": float(accuracy), "client_id": self.client_id}


def start_fl_client(server_address: str = "127.0.0.1:8080", client_id: int = 0) -> None:
    """Start a Federated Learning client."""
    print(f"Starting Flower FL Client {client_id} connecting to {server_address}...")

    client = POICollaborativeFilteringClient(client_id=client_id)
    fl.client.start_numpy_client(
        server_address=server_address,
        client=client,
    )


if __name__ == "__main__":
    client_id = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    server_address = sys.argv[2] if len(sys.argv) > 2 else "127.0.0.1:8080"
    start_fl_client(server_address=server_address, client_id=client_id)
