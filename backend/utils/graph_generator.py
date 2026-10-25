import os
import matplotlib.pyplot as plt
import numpy as np
import uuid

# Ensure backend static folder exists for serving graphs
GRAPH_DIR = "backend/static/graphs"
os.makedirs(GRAPH_DIR, exist_ok=True)

def generate_physics_vt_graph(u: float, v: float, t: float) -> str:
    """Generates a Velocity-Time graph for motion problems and returns the saved file path."""
    plt.figure(figsize=(5, 3))
    time_points = [0, t]
    velocity_points = [u, v]
    
    plt.plot(time_points, velocity_points, marker='o', color='b', linewidth=2)
    plt.title("Velocity-Time Graph")
    plt.xlabel("Time (s)")
    plt.ylabel("Velocity (m/s)")
    plt.grid(True, linestyle='--', alpha=0.6)
    plt.xlim(left=0)
    plt.ylim(bottom=0)
    
    filename = f"vt_graph_{uuid.uuid4().hex[:8]}.png"
    filepath = os.path.join(GRAPH_DIR, filename)
    plt.savefig(filepath, bbox_inches='tight')
    plt.close()
    
    return f"/static/graphs/{filename}"