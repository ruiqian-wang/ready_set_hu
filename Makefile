# Environment
PYTHON ?= python3
UVICORN ?= uvicorn
PORT ?= 8000

ENV_FILE := backend/.env
REQUIREMENTS := requirements.txt

.PHONY: help install dev qa

help:
	@echo "Targets:"
	@echo "  install   Install Python dependencies"
	@echo "  dev       Run FastAPI in reload mode"
	@echo "  qa        Call the QA endpoint with sample questions"

install:
	$(PYTHON) -m pip install -r $(REQUIREMENTS)

dev:
	$(UVICORN) backend.main:app --reload --port $(PORT)

qa:
	@echo "Asking: 什么是清一色？"
	@curl -s -X POST "http://localhost:$(PORT)/api/qa" \
	  -H "Content-Type: application/json" \
	  -d '{"question": "什么是清一色？"}' | $(PYTHON) -m json.tool
	@echo
	@echo "Asking: 四川麻将有什么特点？ (Gemini fallback if configured)"
	@curl -s -X POST "http://localhost:$(PORT)/api/qa" \
	  -H "Content-Type: application/json" \
	  -d '{"question": "四川麻将有什么特点？"}' | $(PYTHON) -m json.tool

