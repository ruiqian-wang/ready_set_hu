from typing import List, Optional
from pydantic import BaseModel
from enum import Enum
from typing import Dict, Union

# --- Common Enums ---

class Suit(str, Enum):
    MAN = "Wan"  # Characters
    PIN = "Tong"  # Dots/Circles
    SOU = "Tiao"  # Bamboo
    

# --- Domain Models ---

class Tile(BaseModel):
    id: str
    suit: Suit
    rank: int
    name_cn: str
    name_en: str
    image_url: str

class RuleCategory(str, Enum):
    """High-level category for a scoring rule. Useful for UI grouping."""

    HAND_TYPE = "hand_type"      # e.g. 平胡 / 大对子 / 清一色 / 七对 ...
    EXTRA = "extra"              # e.g. 带根 ...
    SPECIAL = "special"          # e.g. 抢杠胡、杠上炮、海底捞月 ...
    PENALTY = "penalty"          # e.g. 花猪、相公 ...


class Rule(BaseModel):
    id: str
    name: str                    
    description: str
    points: int                  # Positive (reward) or negative (penalty)
    name_cn: Optional[str] = None
    category: Optional[RuleCategory] = None


class BasicRuleSection(str, Enum):
    """Section for non-scoring basic rules used in Learn / tutorial UI."""

    BEFORE_GAME = "before_game"
    DURING_TURN = "during_turn"
    WINNING_SCORING = "winning_scoring"


class BasicRule(BaseModel):
    """Non-scoring basic rule (flow / etiquette / hard rules for teaching)."""

    id: str
    name_en: str
    name_cn: Optional[str] = None
    description_en: str
    description_cn: Optional[str] = None
    section: BasicRuleSection

class Player(BaseModel):
    name: str
    score: int

# --- API Request/Response Models ---

# Hand Checker
class CheckHandRequest(BaseModel):
    tiles: List[str]  # List of tile IDs, e.g., ["1wan", "2wan", "3tiao", ...]

class HandDetail(BaseModel):
    melds: List[List[str]]
    pair: List[str]

class CheckHandResponse(BaseModel):
    is_win: bool
    message: str
    detail: Optional[HandDetail] = None

# --- Rule-based, multi-player / multi-event scoring ---

class WinType(str, Enum):
    """How this player ended the round."""

    NONE = "none"       # 没胡 / 普通输家
    ZIMO = "zimo"       # 自摸
    DIANPAO = "dianpao" # 点炮胡（放炮的人本身是输家）


class KongEventType(str, Enum):
    DIAN_GANG = "dian_gang"  # 点杠
    BU_GANG = "bu_gang"      # 补杠
    AN_GANG = "an_gang"      # 暗杠


class KongEventInput(BaseModel):
    """
    A single kong event. This is independent from win multipliers.
    - dian_gang: requires payer_name (discarder) -> pays fixed points to kongger
    - bu_gang / an_gang: payers are all non-winners (computed by engine)
    """

    type: KongEventType
    payer_name: Optional[str] = None  # only for dian_gang
    payer_names: List[str] = []       # for bu_gang / an_gang (multi-select)


class PlayerRoundInput(BaseModel):
    """
    Per-player round description.

    - hand_type_id: exactly ONE main hand pattern rule (平胡 / 大对子 / 清一色 / 七对 ...),
      or None if the player did not win.
    - extra_rule_ids: additional scoring rules that stack on top of the base hand
      (e.g. 清一色带一根、将对、幺九、金钩钓 ...).
    - special_rule_ids: special situation
      These can be encoded as rules in the rules json.
    - penalty_rule_ids: explicit penalty-only rules
    """

    name: str
    win_type: WinType = WinType.NONE
    # Who pays this player's win (点炮/包赔等). If set, settlement becomes a transfer:
    # winner +M, payer -M.
    payer_name: Optional[str] = None
    # Multi-payer version (e.g. 自摸：其余三家都赔). If provided, it takes precedence over payer_name.
    payer_names: List[str] = []
    hand_type_id: Optional[str] = None
    # Ruleset factor values:
    # - boolean factors: true/false
    # - countable factors: integer count (e.g. 根)
    factor_values: Dict[str, Union[bool, int]] = {}
    # Kong events (fixed points, independent from win multipliers)
    kong_events: List[KongEventInput] = []
    # Manual adjustment
    manual_delta: int = 0
    extra_rule_ids: List[str] = []
    special_rule_ids: List[str] = []
    penalty_rule_ids: List[str] = []


class PlayerRoundScore(BaseModel):
    """Scoring breakdown for a single player in one round."""

    name: str
    # Breakdown: win_score + kong_score (+ manual) => delta
    win_score: int = 0
    kong_score: int = 0
    manual_score: int = 0
    delta: int = 0                # Total score change this round (can be negative)
    applied_rule_ids: List[str]   # All rules that contributed


class RuleBasedScoreRoundRequest(BaseModel):
    """
    Rule-based scoring

    - players: current scoreboard before this round.
    - player_rounds: description of what happened to each player in this round.

    Engine behaviour:
    - For each player_round, we look up all referenced rules and sum their points.
    - The sum becomes that player's delta for this round.
    - Updated scores = original score + delta.

    """

    players: List[Player]
    player_rounds: List[PlayerRoundInput]


class RuleBasedScoreRoundResponse(BaseModel):
    players: List[Player]               # Updated scoreboard after this round
    player_scores: List[PlayerRoundScore]

# QA
class QARequest(BaseModel):
    question: str

class QAResponse(BaseModel):
    answer: str


# --- Rules search (for Learn / Basic Rules tab) ---


class RuleSearchRequest(BaseModel):
    """Natural language rule search request."""

    query: str


class RuleSearchResponse(BaseModel):
    """Search result: list of matching rule IDs ordered by relevance."""

    rule_ids: List[str]


