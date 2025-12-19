from typing import List, Dict
from .models import (
    Player,
    RuleBasedScoreRoundRequest,
    RuleBasedScoreRoundResponse,
    PlayerRoundScore,
)
from .ruleset import compute_total_multiplier, RulesetError
from .ruleset import get_ruleset_indexed


def calculate_rule_based_scores(
    request: RuleBasedScoreRoundRequest,
) -> RuleBasedScoreRoundResponse:
    """
    Rule-based scoring engine.

    Core ideas:
    - No single "winner" field.
    - Each player can have:
        - one main hand type rule (平胡 / 大对子 / 清一色 / 七对 ...),
        - multiple extra rules,
        - multiple special / penalty rules.
    - all rule IDs and their points (including penalties) defined in rules.py
    - this function:
        1. looks up all referenced rules for each player.
        2. sums points (positive or negative) into a delta.
        3. applies delta to that player's current score.
    """

    # Index players by name so we can apply transfer deltas.
    players_by_name: Dict[str, Player] = {p.name: p for p in request.players}
    win_deltas: Dict[str, int] = {p.name: 0 for p in request.players}
    kong_deltas: Dict[str, int] = {p.name: 0 for p in request.players}
    manual_deltas: Dict[str, int] = {p.name: 0 for p in request.players}
    applied_by_player: Dict[str, List[str]] = {p.name: [] for p in request.players}

    ALL_PAY_HAND_IDS = {"hand.tianhu", "hand.dihu"}  # 天胡/地胡：其余所有玩家都赔

    winners = {ri.name for ri in request.player_rounds if getattr(ri, "hand_type_id", None)}

    ruleset, _, _, events_by_id = get_ruleset_indexed()
    _ = ruleset  # reserved for future use

    def get_event_amount(event_id: str) -> int:
        ev = events_by_id.get(event_id) or {}
        return int(ev.get("amount_per_payer") or 0)

    for round_input in request.player_rounds:
        if round_input.name not in players_by_name:
            continue

        actor = round_input.name

        is_win = (round_input.win_type is not None and round_input.win_type != "none") or bool(
            round_input.hand_type_id
        )
        if is_win:
            # Determine payer(s) for win settlement.
            winner = actor
            explicit_multi_payers = list(getattr(round_input, "payer_names", []) or [])
            payer_names = list(explicit_multi_payers)
            payer_single = getattr(round_input, "payer_name", None)
            if not payer_names and payer_single:
                payer_names = [payer_single]
            # Validate and normalize payer list
            payer_names = [p for p in payer_names if p in players_by_name and p != winner]

            # Special settlement: 天胡/地胡 => all other active players pay
            hand_id = getattr(round_input, "hand_type_id", None)
            if hand_id in ALL_PAY_HAND_IDS:
                payer_names = [p.name for p in request.players if p.name != winner]

            # Start with explicit factor values (supports boolean + countable).
            factors: Dict[str, object] = dict(getattr(round_input, "factor_values", {}) or {})
            # Backward-compatible: treat legacy selected ids as boolean=true unless already specified.
            for fid in (round_input.extra_rule_ids or []):
                factors.setdefault(fid, True)
            for fid in (round_input.special_rule_ids or []):
                factors.setdefault(fid, True)
            for fid in (round_input.penalty_rule_ids or []):
                factors.setdefault(fid, True)

            # UX rule: selecting explicit multi-payer (自摸) implies 自摸 ×2.
            if explicit_multi_payers and hand_id not in ALL_PAY_HAND_IDS:
                factors.setdefault("factor.zimo", True)
            if hand_id in ALL_PAY_HAND_IDS:
                # Ensure not treated as 自摸 even if frontend sends it.
                factors["factor.zimo"] = False

            try:
                breakdown = compute_total_multiplier(
                    is_win=True,
                    hand_id=hand_id,
                    factors=factors,
                )
            except RulesetError:
                breakdown = None

            if breakdown:
                amount = breakdown.total_multiplier
                applied_ids = [breakdown.hand_id] + [f["id"] for f in breakdown.enabled_factors]

                if payer_names:
                    # Transfer settlement: winner +M*len(payers), each payer -M
                    win_deltas[winner] += amount * len(payer_names)
                    applied_by_player[winner].extend(applied_ids + [f"payers:{','.join(payer_names)}"])
                    for payer in payer_names:
                        win_deltas[payer] -= amount
                        applied_by_player[payer].extend([f"paid_for:{winner}"] + applied_ids)
                else:
                    # Fallback: apply to self only (legacy behaviour)
                    win_deltas[winner] += amount
                    applied_by_player[winner].extend(applied_ids)

        # ---- Kong events (fixed-point transfers, independent from win multipliers) ----
        kong_events = list(getattr(round_input, "kong_events", []) or [])
        for ev in kong_events:
            etype = getattr(ev, "type", None)
            payer_name = getattr(ev, "payer_name", None)
            payer_names = list(getattr(ev, "payer_names", []) or [])

            if etype == "dian_gang":
                per = get_event_amount("event.dian_gang") or 2
                if isinstance(payer_name, str) and payer_name in players_by_name and payer_name != actor:
                    kong_deltas[actor] += per
                    kong_deltas[payer_name] -= per
                    applied_by_player[actor].extend([f"event.dian_gang", "count:1", f"payer:{payer_name}"])
                    applied_by_player[payer_name].extend([f"event.dian_gang", f"paid_for:{actor}", "count:1"])
            elif etype == "bu_gang":
                per = get_event_amount("event.bu_gang") or 1
                payers = [p for p in payer_names if p in players_by_name and p != actor]
                if not payers:
                    payers = [p.name for p in request.players if p.name not in winners and p.name != actor]
                if payers:
                    kong_deltas[actor] += per * len(payers)
                    applied_by_player[actor].extend([f"event.bu_gang", "count:1", f"payers:{','.join(payers)}"])
                    for payer in payers:
                        kong_deltas[payer] -= per
                        applied_by_player[payer].extend([f"event.bu_gang", f"paid_for:{actor}", "count:1"])
            elif etype == "an_gang":
                per = get_event_amount("event.an_gang") or 2
                payers = [p for p in payer_names if p in players_by_name and p != actor]
                if not payers:
                    payers = [p.name for p in request.players if p.name not in winners and p.name != actor]
                if payers:
                    kong_deltas[actor] += per * len(payers)
                    applied_by_player[actor].extend([f"event.an_gang", "count:1", f"payers:{','.join(payers)}"])
                    for payer in payers:
                        kong_deltas[payer] -= per
                        applied_by_player[payer].extend([f"event.an_gang", f"paid_for:{actor}", "count:1"])

        # ---- Manual adjustment ----
        manual_delta = int(getattr(round_input, "manual_delta", 0) or 0)
        if manual_delta != 0:
            manual_deltas[actor] += manual_delta
            applied_by_player[actor].append(f"manual_delta:{manual_delta}")

    # Apply deltas and return per-player breakdown in stable order
    player_scores: List[PlayerRoundScore] = []
    updated_players: List[Player] = []
    for p in request.players:
        player = players_by_name[p.name]
        total_delta = win_deltas[p.name] + kong_deltas[p.name] + manual_deltas[p.name]
        player.score += total_delta
        updated_players.append(player)
        player_scores.append(
            PlayerRoundScore(
                name=p.name,
                win_score=win_deltas[p.name],
                kong_score=kong_deltas[p.name],
                manual_score=manual_deltas[p.name],
                delta=total_delta,
                applied_rule_ids=applied_by_player[p.name],
            )
        )

    return RuleBasedScoreRoundResponse(players=updated_players, player_scores=player_scores)

