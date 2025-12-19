from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import json


JsonDict = Dict[str, Any]
FactorValue = Union[bool, int]


class RulesetError(ValueError):
    pass


@lru_cache(maxsize=1)
def get_ruleset(path: str = "backend/data/rules_winning.json") -> JsonDict:
    """
    Load the Sichuan ruleset JSON as the single source of truth.

    """
    p = Path(path)
    if not p.exists():
        raise RulesetError(f"Ruleset JSON not found: {path}")
    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        raise RulesetError(f"Failed to parse ruleset JSON: {e}") from e

    # structural validation
    if not isinstance(raw, dict):
        raise RulesetError("Ruleset JSON must be an object")
    if "hands" not in raw or not isinstance(raw.get("hands"), list):
        raise RulesetError("Ruleset JSON must include hands[]")
    multipliers = raw.get("multipliers") or {}
    if "factors" not in multipliers or not isinstance(multipliers.get("factors"), list):
        raise RulesetError("Ruleset JSON must include multipliers.factors[]")
    if "settlement" not in raw or not isinstance(raw.get("settlement"), dict):
        raise RulesetError("Ruleset JSON must include settlement{}")

    return raw


def _index_by_id(items: List[JsonDict]) -> Dict[str, JsonDict]:
    out: Dict[str, JsonDict] = {}
    for item in items:
        iid = item.get("id")
        if isinstance(iid, str) and iid:
            out[iid] = item
    return out


@lru_cache(maxsize=1)
def get_ruleset_indexed(
    path: str = "backend/data/rules_winning.json",
) -> Tuple[JsonDict, Dict[str, JsonDict], Dict[str, JsonDict], Dict[str, JsonDict]]:
    ruleset = get_ruleset(path)
    hands: List[JsonDict] = ruleset.get("hands") or []
    factors: List[JsonDict] = (ruleset.get("multipliers") or {}).get("factors") or []
    events: List[JsonDict] = ruleset.get("events") or []
    return ruleset, _index_by_id(hands), _index_by_id(factors), _index_by_id(events)


@dataclass(frozen=True)
class SettlementBreakdown:
    hand_id: str
    hand_base_multiplier: int
    enabled_factors: List[Dict[str, Any]]  # each: {id, type, value, applied_multiplier}
    extras_total: int
    total_multiplier: int


def compute_total_multiplier(
    *,
    is_win: bool,
    hand_id: Optional[str],
    factors: Optional[Dict[str, FactorValue]] = None,
    ruleset_path: str = "backend/data/rules_winning.json",
) -> SettlementBreakdown:
    """
    Strictly follow settlement flow from ruleset JSON:

    - if not win => multiplier = 0 (no hand)
    - if win => choose exactly one base hand => base_multiplier
    - apply extra multipliers:
      - boolean: multiply once if enabled
      - countable: multiply (multiplier_each ^ count)
    """
    if not is_win:
        raise RulesetError("settlement.compute requires is_win=true (non-win settlement is not scored)")
    if not hand_id:
        raise RulesetError("hand_id is required when is_win=true")

    ruleset, hands_by_id, factors_by_id, _events_by_id = get_ruleset_indexed(ruleset_path)

    hand = hands_by_id.get(hand_id)
    if not hand:
        raise RulesetError(f"Unknown hand_id: {hand_id}")

    base_multiplier = int(((hand.get("scoring") or {}).get("base_multiplier")) or 0)
    if base_multiplier <= 0:
        raise RulesetError(f"Invalid base_multiplier for hand_id={hand_id}")

    factors = factors or {}
    enabled_factors: List[Dict[str, Any]] = []
    extras_total = 1

    for fid, raw_value in factors.items():
        factor = factors_by_id.get(fid)
        if not factor:
            raise RulesetError(f"Unknown factor id: {fid}")

        ftype = factor.get("type")
        apply_cfg = factor.get("apply") or {}
        mode = apply_cfg.get("mode")

        if ftype == "boolean":
            enabled = bool(raw_value)
            if enabled:
                m = int(apply_cfg.get("multiplier") or 1)
                if m < 1:
                    raise RulesetError(f"Invalid multiplier for factor {fid}")
                extras_total *= m
                enabled_factors.append(
                    {"id": fid, "type": "boolean", "value": True, "applied_multiplier": m}
                )
        elif ftype == "countable":
            if mode != "repeat":
                raise RulesetError(f"Countable factor {fid} must use apply.mode='repeat'")
            try:
                count = int(raw_value or 0)
            except Exception:
                raise RulesetError(f"Invalid count for factor {fid}: {raw_value}")
            if count < 0:
                raise RulesetError(f"Invalid count for factor {fid}: {count}")
            each = int(apply_cfg.get("multiplier_each") or 1)
            if each < 1:
                raise RulesetError(f"Invalid multiplier_each for factor {fid}")
            if count > 0:
                applied = each ** count
                extras_total *= applied
                enabled_factors.append(
                    {
                        "id": fid,
                        "type": "countable",
                        "value": count,
                        "applied_multiplier": applied,
                        "multiplier_each": each,
                    }
                )
        else:
            raise RulesetError(f"Unsupported factor type for {fid}: {ftype}")

    total = base_multiplier * extras_total
    return SettlementBreakdown(
        hand_id=hand_id,
        hand_base_multiplier=base_multiplier,
        enabled_factors=enabled_factors,
        extras_total=extras_total,
        total_multiplier=total,
    )


