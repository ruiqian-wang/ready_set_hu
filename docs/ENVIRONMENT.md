# Environment Setup

This project contains:
- **Backend**: FastAPI (`backend/`)
- **Frontend**: React + Vite (`frontend/`)

This document lists all supported environment variables and recommended local setup.

---

## Backend

### 1) Python Dependencies

From repository root:

```bash
pip install -r requirements.txt
```

### 2) Run Server

```bash
uvicorn backend.main:app --reload
```

Default configuration:
- API base path: `/api`
- Server: `http://localhost:8000`
- Swagger documentation: `http://localhost:8000/docs`

### 3) Environment Variables

The backend reads environment variables from a `.env` file in the `backend/` directory.  
You can also export them in your shell, or use a `.env` loader in your process manager.

**Supported environment variables:**

- **`GEMINI_API_KEY`** (optional): API key for Google Gemini. Required for enhanced Q&A functionality.
  - Get your API key from: https://aistudio.google.com/apikey
  - If not configured, the Q&A feature will show setup instructions.

- **`GEMINI_MODEL`** (optional): Gemini model to use. Defaults to `gemini-2.5-flash` if not specified.

**Setup:**

1. Copy the example file:
   ```bash
   cp backend/env.example backend/.env
   ```

2. Edit `backend/.env` and add your API key:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.0-flash-exp
   ```

---

## Frontend

### 1) Node Dependencies

From repository root:

```bash
cd frontend
npm install
```

### 2) Run Development Server

```bash
npm run dev
```

Default configuration:
- App: `http://localhost:5173`
- API proxy: Vite proxy routes `/api` to backend (`http://localhost:8000`)

### 3) Environment Variables

The frontend currently uses Vite proxy with `/api` base URL and does **not** require environment variables for local development.

If you want to point the frontend to a different API base URL (for production), you can add a Vite environment variable (optional):
- **`VITE_API_BASE_URL`** (optional): Custom API base URL. You would need to implement this in `frontend/src/api/client.ts`.

---

## Environment File Templates

See `backend/env.example` for a template of backend environment variables.


