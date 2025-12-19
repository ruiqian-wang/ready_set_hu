from typing import Any, Dict, List, Tuple
from pathlib import Path
import json
from .models import Rule, RuleCategory, BasicRule, BasicRuleSection
from .ruleset import get_ruleset, RulesetError

# Scoring rules loaded from rules_winning.json (single source of truth)
RULES_DB: Dict[str, Rule] = {}

# Non-scoring basic rules loaded from backend/data/rules_basics.json
BASIC_RULES_DB: Dict[str, Rule] = {}
BASIC_RULES: List[BasicRule] = []


def load_basic_rules_from_json(path: str = "backend/data/rules_basics.json") -> None:
    """
    Load non-scoring basic rules (flow / etiquette / hard rules) from JSON.

    These are *only* used for Learn / search, not for scoring.
    File format: a list of objects with at least:
      - id: string
      - name: {zh?, en?} or string
      - description: {zh?, en?} or string
    """

    p = Path(path)
    if not p.exists():
        return

    try:
        data = json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return

    if not isinstance(data, list):
        return

    global BASIC_RULES_DB, BASIC_RULES
    BASIC_RULES_DB = {}
    BASIC_RULES = []

    for item in data:
        if not isinstance(item, dict):
            continue
        rid = item.get("id")
        if not isinstance(rid, str) or not rid:
            continue

        name_en = _text(item.get("name"), "en") or rid
        name_cn = _text(item.get("name"), "zh") or None
        desc_en = _text(item.get("description"), "en") or ""
        desc_cn = _text(item.get("description"), "zh") or ""
        section_raw = (item.get("section") or "").strip().lower() or "winning_scoring"
        try:
            section = BasicRuleSection(section_raw)
        except ValueError:
            section = BasicRuleSection.WINNING_SCORING

        # For search: keep a lightweight Rule instance.
        BASIC_RULES_DB[rid] = Rule(
            id=rid,
            name=name_en,
            name_cn=name_cn,
            description=desc_cn or desc_en,
            points=0,
            category=None,
        )

        # For LearnScreen: keep full bilingual, structured basic rules.
        BASIC_RULES.append(
            BasicRule(
                id=rid,
                name_en=name_en,
                name_cn=name_cn,
                description_en=desc_en,
                description_cn=desc_cn or None,
                section=section,
            )
        )


def get_basic_rules() -> List[BasicRule]:
    """Return non-scoring basic rules loaded from rules_basics.json."""

    return BASIC_RULES




def get_rules() -> List[Rule]:
    """Return all currently loaded rules."""
    return list(RULES_DB.values())


def search_rules_simple(query: str, limit: int = 20) -> List[str]:
    """
    NLP helper: keyword-based search.

    - Matches against id / name / name_cn / description (case-insensitive).
    - Returns a list of rule_ids ordered by a naive relevance score.
    """

    q = (query or "").strip().lower()
    if not q:
        return []

    scored: List[Tuple[int, str]] = []

    def score_collection(collection: Dict[str, Rule]) -> None:
        for rid, rule in collection.items():
            # Collect searchable text fields
            parts = [
                rid,
                getattr(rule, "name", "") or "",
                getattr(rule, "name_cn", "") or "",
                getattr(rule, "description", "") or "",
            ]
            haystack = " ".join(str(p) for p in parts).lower()
            if not haystack:
                continue
            if q in haystack:
                score = haystack.count(q)
                scored.append((score, rid))

    # Scoring rules from rules_winning.json
    score_collection(RULES_DB)
    # Non-scoring basics from rules_basics.json
    score_collection(BASIC_RULES_DB)
    scored.sort(key=lambda item: (-item[0], item[1]))
    return [rid for _score, rid in scored[:limit]]


def _text(v: Any, lang: str) -> str:
    if isinstance(v, dict):
        return str(v.get(lang) or v.get("zh") or v.get("en") or "")
    return str(v or "")


def load_rules_from_ruleset_json(json_path: str = "backend/data/rules_winning.json") -> None:
    """
    Load rules for UI listing from the *ruleset schema* JSON (single source of truth).

    Note:
    - This is only a *projection* for the existing /rules endpoint and legacy UI.
    - Real scoring MUST use `backend/ruleset.py` settlement computation, not `Rule.points`.
    """
    ruleset = get_ruleset(json_path)
    hands = ruleset.get("hands") or []
    factors = (ruleset.get("multipliers") or {}).get("factors") or []

    global RULES_DB
    RULES_DB = {}

    # hands -> hand_type rules (points=base_multiplier for display)
    for h in hands:
        hid = h.get("id")
        if not isinstance(hid, str) or not hid:
            continue
        base = int(((h.get("scoring") or {}).get("base_multiplier")) or 0)
        RULES_DB[hid] = Rule(
            id=hid,
            name=_text(h.get("name"), "en") or hid,
            name_cn=_text(h.get("name"), "zh") or None,
            description=_text(h.get("description_one_line"), "zh") or "",
            points=base,
            category=RuleCategory.HAND_TYPE,
        )

    # factors -> extra rules (points = multiplier or multiplier_each, for display only)
    for f in factors:
        fid = f.get("id")
        if not isinstance(fid, str) or not fid:
            continue
        ftype = f.get("type")
        apply_cfg = f.get("apply") or {}
        if ftype == "boolean":
            pts = int(apply_cfg.get("multiplier") or 1)
        elif ftype == "countable":
            pts = int(apply_cfg.get("multiplier_each") or 1)
        else:
            pts = 0

        desc = _text(f.get("description"), "zh") or ""
        if ftype == "countable":
            desc = f"{desc}（可重复）"

        RULES_DB[fid] = Rule(
            id=fid,
            name=_text(f.get("name"), "en") or fid,
            name_cn=_text(f.get("name"), "zh") or None,
            description=desc,
            points=pts,
            category=RuleCategory.EXTRA,
        )


# Load scoring rules from the ruleset JSON (single source of truth)
load_rules_from_ruleset_json("backend/data/rules_winning.json")

# Load non-scoring basics for search / learn UI.
load_basic_rules_from_json("backend/data/rules_basics.json")
