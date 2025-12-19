from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from .config import settings
from .models import (
    Tile,
    Rule,
    BasicRule,
    CheckHandRequest,
    CheckHandResponse,
    QARequest,
    QAResponse,
    RuleBasedScoreRoundRequest,
    RuleBasedScoreRoundResponse,
    RuleSearchRequest,
    RuleSearchResponse,
)
from .tiles import ALL_TILES
from .rules import get_rules as get_all_rules, search_rules_simple, get_basic_rules
from .hand_checker import check_hand
from .scoring import calculate_rule_based_scores
from .qa import get_answer
from .ruleset import get_ruleset

app = FastAPI(title=settings.PROJECT_NAME)

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Welcome to Ready, Set, Hu! API"}

@app.get(f"{settings.API_V1_STR}/tiles", response_model=List[Tile])
def get_tiles():
    """Returns a list of all tiles with metadata."""
    return ALL_TILES

@app.get(f"{settings.API_V1_STR}/rules", response_model=List[Rule])
def get_rules_endpoint():
    """Returns the current set of scoring rules."""
    return get_all_rules()


@app.get(f"{settings.API_V1_STR}/rules/basics", response_model=List[BasicRule])
def get_basic_rules_endpoint():
    """Returns non-scoring basic rules (flow / etiquette / hard rules) for Learn UI."""
    return get_basic_rules()


@app.post(f"{settings.API_V1_STR}/rules/search", response_model=RuleSearchResponse)
def search_rules_endpoint(request: RuleSearchRequest):
    """
    Search rules by natural language query.

    It returns only rule IDs, ordered by a naive relevance score, so that
    the frontend can sort / highlight matching items.
    """

    rule_ids = search_rules_simple(request.query)
    return RuleSearchResponse(rule_ids=rule_ids)


@app.get(f"{settings.API_V1_STR}/ruleset")
def get_ruleset_endpoint():
    """Returns the full ruleset JSON (single source of truth)."""
    return get_ruleset()

@app.post(f"{settings.API_V1_STR}/check_hand", response_model=CheckHandResponse)
def check_hand_endpoint(request: CheckHandRequest):
    """Checks if the provided tiles form a winning hand."""
    return check_hand(request.tiles)



@app.post(
    f"{settings.API_V1_STR}/score_round_rule_based",
    response_model=RuleBasedScoreRoundResponse,
)
def score_round_rule_based_endpoint(request: RuleBasedScoreRoundRequest):
    """
    Rule-based scoring endpoint.

    For each player, send one of:
    - one hand_type_id (平胡 / 大对子 / 清一色 / 七对 ...),
    - zero or more extra_rule_ids,
    - zero or more special / penalty rule ids.
    All of these map to the rule configuration, and the engine sums their points into a per-player delta.
    """

    return calculate_rule_based_scores(request)

@app.post(f"{settings.API_V1_STR}/qa", response_model=QAResponse)
def qa_endpoint(request: QARequest):
    """Answers a natural language question."""
    return get_answer(request.question)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

