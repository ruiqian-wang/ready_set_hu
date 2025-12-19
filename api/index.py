"""
Vercel serverless function entry point for FastAPI backend.
This file is required by Vercel to locate the FastAPI application.
"""
import sys
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))

# Import the FastAPI app from backend.main
try:
    from backend.main import app
except ImportError as e:
    # Fallback: try importing directly
    import os
    os.chdir(project_root)
    from backend.main import app

# Export the app for Vercel
__all__ = ["app"]

