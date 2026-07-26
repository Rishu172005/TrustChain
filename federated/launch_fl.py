#!/usr/bin/env python3
"""
Launcher script for Federated Learning System.
Starts the FL server and coordinates 3 client simulations.
"""

import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run_recommendation_pipeline():
    """Generate recommendations using the task3 pipeline."""
    print("\n" + "="*60)
    print("STEP 1: Generating recommendations via task3 pipeline")
    print("="*60)
    
    try:
        result = subprocess.run(
            [sys.executable, str(ROOT / "federated" / "task3.py")],
            check=True,
            cwd=ROOT
        )
        print("✓ Recommendations generated successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"✗ Failed to generate recommendations: {e}")
        return False


def start_fl_server():
    """Start the Flower FL Server."""
    print("\n" + "="*60)
    print("STEP 2: Starting Flower FL Server")
    print("="*60)
    
    server_cmd = [sys.executable, str(ROOT / "federated" / "flower_server.py")]
    
    print(f"Command: {' '.join(server_cmd)}")
    print("Server starting on 127.0.0.1:8080...")
    
    try:
        server_proc = subprocess.Popen(
            server_cmd,
            cwd=ROOT / "federated"
        )
        time.sleep(2)  # Give server time to start
        return server_proc
    except Exception as e:
        print(f"✗ Failed to start server: {e}")
        return None


def start_fl_clients(num_clients=3, server_address="127.0.0.1:8080"):
    """Start Flower FL Clients."""
    print("\n" + "="*60)
    print(f"STEP 3: Starting {num_clients} Flower FL Clients")
    print("="*60)
    
    client_procs = []
    
    for client_id in range(num_clients):
        client_cmd = [
            sys.executable,
            str(ROOT / "federated" / "flower_client.py"),
            str(client_id),
            server_address
        ]
        
        print(f"\nStarting Client {client_id}...")
        print(f"Command: {' '.join(client_cmd)}")
        
        try:
            proc = subprocess.Popen(
                client_cmd,
                cwd=ROOT / "federated"
            )
            client_procs.append(proc)
            time.sleep(1)  # Stagger client starts
        except Exception as e:
            print(f"✗ Failed to start client {client_id}: {e}")
    
    return client_procs


def main():
    """Main launcher workflow."""
    print("\n" + "="*70)
    print("TrustChain Federated Learning System - Task 3 Integration Launcher")
    print("="*70)
    
    # Step 1: Generate recommendations
    if not run_recommendation_pipeline():
        print("\n✗ Failed to generate recommendations. Exiting.")
        sys.exit(1)
    
    # Step 2: Start FL Server
    server_proc = start_fl_server()
    if not server_proc:
        print("\n✗ Failed to start FL server. Exiting.")
        sys.exit(1)
    
    # Step 3: Start FL Clients
    try:
        client_procs = start_fl_clients(num_clients=3)
        
        if len(client_procs) < 3:
            print(f"\n⚠ Warning: Started only {len(client_procs)}/3 clients")
        
        print("\n" + "="*70)
        print("✓ Federated Learning System Started Successfully")
        print("="*70)
        print("\nSystem Status:")
        print(f"  • FL Server: Running on 127.0.0.1:8080")
        print(f"  • FL Clients: {len(client_procs)} active")
        print(f"  • Recommendations: Generated at {ROOT / 'frontend' / 'public' / 'recommendations.json'}")
        
        print("\nNext steps:")
        print("  1. Start Frontend: cd frontend && npm run dev")
        print("  2. Open: http://localhost:5173")
        print("  3. Select profile and check-in at POIs")
        print("  4. Observe recommendation updates")
        
        print("\nPress Ctrl+C to stop the system...")
        
        # Keep processes running
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n\nShutting down Federated Learning System...")
            server_proc.terminate()
            for proc in client_procs:
                proc.terminate()
            
            # Wait for graceful shutdown
            server_proc.wait(timeout=5)
            for proc in client_procs:
                proc.wait(timeout=5)
            
            print("✓ All processes terminated")
            sys.exit(0)
    
    except Exception as e:
        print(f"\n✗ Error: {e}")
        if server_proc:
            server_proc.terminate()
        for proc in client_procs:
            proc.terminate()
        sys.exit(1)


if __name__ == "__main__":
    main()
