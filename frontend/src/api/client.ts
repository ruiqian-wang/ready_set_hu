import axios from 'axios';

// Create an axios instance with base URL
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Tile {
  id: string;
  suit: string;
  rank: number;
  name_cn: string;
  name_en: string;
  image_url: string;
}

export type RuleCategory = 'hand_type' | 'extra' | 'special' | 'penalty' | null;

export interface Rule {
  id: string;
  name: string;
  name_cn?: string;
  description: string;
  points: number;
  category?: RuleCategory;
}

// --- Non-scoring basic rules (from rules_basics.json) ---

export type BasicRuleSection =
  | 'before_game'
  | 'during_turn'
  | 'winning_scoring';

export interface BasicRule {
  id: string;
  name_en: string;
  name_cn?: string;
  description_en: string;
  description_cn?: string;
  section: BasicRuleSection;
}

export interface CheckHandResponse {
  is_win: boolean;
  message: string;
  detail?: {
    melds: string[][];
    pair: string[];
  };
}

export interface Player {
  name: string;
  score: number;
}

export const getTiles = async (): Promise<Tile[]> => {
  const response = await api.get<Tile[]>('/tiles');
  return response.data;
};

export const getRules = async (): Promise<Rule[]> => {
  const response = await api.get<Rule[]>('/rules');
  return response.data;
};

// -------- Ruleset-driven API (single source of truth) --------

export interface Ruleset {
  meta: Record<string, any>;
  tile_encoding: Record<string, any>;
  hands: any[];
  multipliers: Record<string, any>;
  settlement: Record<string, any>;
}

export const getRuleset = async (): Promise<Ruleset> => {
  const response = await api.get<Ruleset>('/ruleset');
  return response.data;
};

// -------- Rules search (for Learn / Basic Rules tab) --------

export const searchRules = async (query: string): Promise<string[]> => {
  if (!query.trim()) {
    return [];
  }

  const response = await api.post<{ rule_ids: string[] }>('/rules/search', {
    query,
  });
  return response.data.rule_ids;
};

export const getBasicRules = async (): Promise<BasicRule[]> => {
  const response = await api.get<BasicRule[]>('/rules/basics');
  return response.data;
};

export const checkHand = async (tiles: string[]): Promise<CheckHandResponse> => {
  const response = await api.post<CheckHandResponse>('/check_hand', { tiles });
  return response.data;
};

// -------- Rule-based scoring types & API --------

export type WinType = 'none' | 'zimo' | 'dianpao';

export type KongEventType = 'dian_gang' | 'bu_gang' | 'an_gang';

export interface KongEventInput {
  type: KongEventType;
  payer_name?: string | null; // only for dian_gang
  payer_names?: string[]; // for bu_gang / an_gang (multi-select)
}

export interface PlayerRoundInput {
  name: string;
  // Deprecated: kept for backward compatibility. Scoring is driven by hand_type_id + payer_name.
  win_type: WinType;
  // Who pays for this player's win (selected from the other 3 players).
  payer_name?: string | null;
  // Multi-payer version (e.g. 自摸：其余三家都赔). If provided, it takes precedence over payer_name.
  payer_names?: string[];
  hand_type_id?: string | null;
  // Ruleset factor values (boolean + countable). Used for things like 根(可多个).
  factor_values?: Record<string, boolean | number>;
  // Kong events (fixed points, independent from win multipliers)
  kong_events?: KongEventInput[];
  // Manual adjustment
  manual_delta?: number;
  extra_rule_ids: string[];
  special_rule_ids: string[];
  penalty_rule_ids: string[];
}

export interface PlayerRoundScore {
  name: string;
  win_score: number;
  kong_score: number;
  manual_score: number;
  delta: number;
  applied_rule_ids: string[];
}

export interface RuleBasedScoreRoundRequest {
  players: Player[];
  player_rounds: PlayerRoundInput[];
}

export interface RuleBasedScoreRoundResponse {
  players: Player[];
  player_scores: PlayerRoundScore[];
}

export const scoreRoundRuleBased = async (
  payload: RuleBasedScoreRoundRequest
): Promise<RuleBasedScoreRoundResponse> => {
  const response = await api.post<RuleBasedScoreRoundResponse>(
    '/score_round_rule_based',
    payload
  );
  return response.data;
};

export const askQA = async (question: string): Promise<{ answer: string }> => {
  const response = await api.post<{ answer: string }>('/qa', { question });
  return response.data;
};

