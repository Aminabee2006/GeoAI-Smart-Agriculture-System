import numpy as np


def generate_ndvi_grid(rows: int = 12, cols: int = 12, seed: int = 42):
    rng = np.random.default_rng(seed)
    base = rng.uniform(0.2, 0.9, size=(rows, cols))
    stress_patch = rng.uniform(0.05, 0.35, size=(rows // 3, cols // 3))
    base[2 : 2 + stress_patch.shape[0], 7 : 7 + stress_patch.shape[1]] = stress_patch
    return np.round(base, 2)
