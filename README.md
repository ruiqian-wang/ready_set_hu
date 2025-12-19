# Ready, Set, Hu!

A Sichuan Mahjong assistant application with a Python FastAPI backend and a React frontend.

## Quick Start

### Step 1: Configure Gemini API (Optional)

To enable AI-enhanced Q&A functionality:

```bash
# 1. Copy the example environment file
cp backend/env.example backend/.env

# 2. Edit backend/.env and add your API key
# Get your API key from: https://aistudio.google.com/apikey
```

**Note:** The application works without Gemini API key! The system will use rule-based matching mode if Gemini is not configured.

### Step 2: Run Backend

Using Makefile (recommended):

```bash
# Install dependencies
make install

# Start server (default port 8000)
make dev
```

Or using native commands:

```bash
pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
```

The backend will be available at:
- API: `http://localhost:8000`
- API Documentation: `http://localhost:8000/docs`

### Step 3: Run Frontend

In a **new terminal window**:

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at: `http://localhost:5173`

### Step 4: Test Q&A Feature

#### Using Browser

Visit `http://localhost:8000/docs`, find the `/api/qa` endpoint, and click "Try it out":

```json
{
  "question": "What is 清一色?"
}
```

#### Using curl

```bash
curl -X POST "http://localhost:8000/api/qa" \
  -H "Content-Type: application/json" \
  -d '{"question": "What is 清一色?"}'
```

#### Using Frontend App

1. Open `http://localhost:5173`
2. Click the "Q&A" tab in the bottom navigation
3. Enter a question, e.g., "How to win with 大对子?"

## Example Questions

Example questions (requires `GEMINI_API_KEY` to be configured):
- "What is 清一色?"
- "What are the characteristics of Sichuan Mahjong?"
- "Can 清一色 and 大对子 be combined?"
- "How to win quickly?"

## Project Structure

```
ready_set_hu/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── qa.py                # Q&A core logic
│   ├── scoring.py           # Scoring engine
│   ├── hand_checker.py      # Hand validation
│   ├── rules.py             # Rules management
│   ├── ruleset.py            # Ruleset computation
│   ├── tiles.py             # Tile definitions
│   ├── models.py            # Data models
│   ├── config.py            # Configuration
│   └── data/
│       ├── rules_winning.json  # Winning rules
│       └── rules_basics.json   # Basic rules
├── frontend/
│   ├── src/
│   │   ├── screens/         # Screen components
│   │   ├── components/       # Reusable components
│   │   ├── api/             # API client
│   │   └── styles/          # CSS files
│   └── public/
│       └── tiles/           # Tile images
├── docs/
│   └── ENVIRONMENT.md       # Environment setup guide
├── Makefile                 # Backend commands
└── requirements.txt         # Python dependencies
```

## Features

- **Learn**: Browse tiles and rules with bilingual support
- **Q&A**: Ask questions about Mahjong using AI-powered or rule-based responses
- **Hand Checker**: Select tiles and check if you have a winning hand
- **Scoreboard**: Track scores and apply Sichuan Mahjong scoring rules

## Q&A System

The Q&A feature uses **Gemini (LLM)** for intelligent responses. It injects context from `backend/data/rules_winning.json` into the prompt and relies on Gemini to provide accurate answers.

- Requires `GEMINI_API_KEY` (see [Environment Setup](docs/ENVIRONMENT.md))
- If Gemini is not configured or fails, you will get a clear error message with setup instructions

## Environment Setup

See [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for detailed environment variable configuration.

### Quick Environment Setup

**Backend environment variables:**

- `GEMINI_API_KEY` (optional): API key for Google Gemini
- `GEMINI_MODEL` (optional): Gemini model to use, defaults to `gemini-2.0-flash-exp`

Create `backend/.env`:
```bash
cp backend/env.example backend/.env
# Edit backend/.env and add your GEMINI_API_KEY
```

## Troubleshooting

### Q: Import errors?

**A:** Make sure dependencies are installed:

```bash
pip install -r requirements.txt
```

### Q: Port already in use?

**A:** Use a different port:

```bash
uvicorn backend.main:app --reload --port 8001
```

### Q: Frontend can't connect to backend?

**A:** 
1. Make sure the backend is running on port 8000
2. Check CORS settings in `backend/config.py`
3. Verify the Vite proxy configuration in `frontend/vite.config.ts`

## Next Steps

- 📖 Read [docs/ENVIRONMENT.md](docs/ENVIRONMENT.md) for detailed environment configuration
- 📚 Explore the API documentation at `http://localhost:8000/docs`
- 🎮 Start using the application and explore all features

## Need Help?

If you encounter issues, check:
1. All dependencies are installed correctly
2. Ports are not in use by other applications
3. Check terminal error messages for specific issues
4. Verify environment variables are set correctly

Enjoy playing! 🀄
# ready_set_hu
