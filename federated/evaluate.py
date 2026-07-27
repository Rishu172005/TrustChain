import json
import math
from pathlib import Path

def calculate_metrics(actual_categories, predicted_venues, k=10):
    top_k_preds = predicted_venues[:k]
    
    # 1. Map out structural category hits
    hits = [1 if item.get("category") in actual_categories else 0 for item in top_k_preds]
    num_hits = sum(hits)
    
    # Precision@K: Proportion of recommended items that match target categories
    precision = num_hits / k
    
    # 2. Bounded Recall@K: Unique categories discovered vs total categories available
    predicted_categories = set([item.get("category") for item in top_k_preds if item.get("category") in actual_categories])
    recall = len(predicted_categories) / len(actual_categories) if actual_categories else 0.0
    
    # 3. NDCG@K Matrix Math
    dcg = 0.0
    for idx, hit in enumerate(hits):
        if hit == 1:
            dcg += 1.0 / math.log2(idx + 2)
            
    ideal_hits = sorted(hits, reverse=True)
    idcg = sum([1.0 / math.log2(idx + 2) for idx, hit in enumerate(ideal_hits) if hit == 1])
    ndcg = dcg / idcg if idcg > 0 else 0.0
    
    return precision, recall, ndcg

def run_evaluation():
    ROOT = Path(__file__).resolve().parent.parent
    rec_path = ROOT / "frontend" / "src" / "recommendations.json"
    
    if not rec_path.exists():
        print(f"❌ Error: Missing generated data file at {rec_path}")
        return

    with open(rec_path, "r", encoding="utf-8") as f:
        rec_data = json.load(f)

    profiles = rec_data.get("profiles", [])
    if not profiles:
        print("⚠ No profiles found inside recommendations.json.")
        return
        
    all_p5, all_p10, all_r10, all_n10 = [], [], [], []
    
    print("\nProcessing authentic profile matrices...")
    for prof in profiles:
        actual_categories = prof.get("topCategories", [])
        predicted_venues = prof.get("recommendations", [])
        
        if not actual_categories or not predicted_venues:
            continue
            
        p5, _, _ = calculate_metrics(actual_categories, predicted_venues, k=5)
        p10, r10, n10 = calculate_metrics(actual_categories, predicted_venues, k=10)
        
        all_p5.append(p5)
        all_p10.append(p10)
        all_r10.append(r10)
        all_n10.append(n10)
        
    if not all_p5:
        print("⚠ Could not calculate metrics—verify profile structural keys.")
        return
        
    print("\n=========================================")
    print("   AUTHENTIC PIPELINE EVALUATION METRICS   ")
    print("=========================================")
    print(f"Total Evaluated Clusters: {len(all_p5)}")
    print(f"Precision@5:             {sum(all_p5)/len(all_p5):.4f}")
    print(f"Precision@10:            {sum(all_p10)/len(all_p10):.4f}")
    print(f"Recall@10:               {sum(all_r10)/len(all_r10):.4f}")
    print(f"NDCG@10:                 {sum(all_n10)/len(all_n10):.4f}")
    print("=========================================\n")

if __name__ == "__main__":
    run_evaluation()