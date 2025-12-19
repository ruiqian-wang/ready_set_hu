import React, { useEffect, useState } from 'react';
import {
  getRules,
  Rule,
  Player,
  PlayerRoundInput,
  PlayerRoundScore,
  RuleBasedScoreRoundResponse,
  scoreRoundRuleBased,
} from '../api/client';
import { ActionButton } from '../components/ActionButton';
import { Trophy, History } from 'lucide-react';

export const ScoreboardScreen: React.FC = () => {
  const bi = (zh: string, en: string) => `${zh} / ${en}`;
  const ALL_PAY_HAND_IDS = new Set(['hand.tianhu', 'hand.dihu']);

  const [rules, setRules] = useState<Rule[]>([]);
  const [players, setPlayers] = useState<Player[]>([
    { name: 'A', score: 0 },
    { name: 'B', score: 0 },
    { name: 'C', score: 0 },
    { name: 'D', score: 0 },
  ]);
  // Per-player round inputs (indexed by player name)
  const [roundInputs, setRoundInputs] = useState<Record<string, PlayerRoundInput>>({});
  const [roundHistory, setRoundHistory] = useState<PlayerRoundScore[][]>([]);

  useEffect(() => {
    getRules().then(setRules);
  }, []);

  // Initialize roundInputs whenever players change (e.g. on first render)
  useEffect(() => {
    setRoundInputs(prev => {
      const next: Record<string, PlayerRoundInput> = { ...prev };
      players.forEach(p => {
        if (!next[p.name]) {
          next[p.name] = {
            name: p.name,
            win_type: 'none', // deprecated, kept for compatibility
            payer_name: undefined,
            payer_names: [],
            hand_type_id: undefined,
            factor_values: {},
            kong_events: [],
            manual_delta: 0,
            extra_rule_ids: [],
            special_rule_ids: [],
            penalty_rule_ids: [],
          };
        }
      });
      return next;
    });
  }, [players]);

  const groupedRules = {
    hand_type: rules.filter(r => r.category === 'hand_type'),
    // 'factor.zimo' becomes implicit when selecting 自摸/多人赔, so hide it from extra toggles.
    extra: rules.filter(r => r.category === 'extra' && r.id !== 'factor.zimo'),
    special: rules.filter(r => r.category === 'special'),
    penalty: rules.filter(r => r.category === 'penalty'),
  };

  const updateRoundInput = (playerName: string, patch: Partial<PlayerRoundInput>) => {
    setRoundInputs(prev => {
      const current: PlayerRoundInput =
        prev[playerName] ||
        ({
          name: playerName,
          win_type: 'none',
          payer_name: undefined,
          payer_names: [],
          hand_type_id: undefined,
          factor_values: {},
          kong_events: [],
          manual_delta: 0,
          extra_rule_ids: [],
          special_rule_ids: [],
          penalty_rule_ids: [],
        } as PlayerRoundInput);

      const next: PlayerRoundInput = {
        ...current,
        ...patch,
        factor_values: {
          ...(current.factor_values || {}),
          ...(patch.factor_values || {}),
      },
      };
      return { ...prev, [playerName]: next };
    });
  };

  const toggleRuleForPlayer = (
    playerName: string,
    field: keyof Pick<PlayerRoundInput, 'extra_rule_ids' | 'special_rule_ids' | 'penalty_rule_ids'>,
    ruleId: string
  ) => {
    setRoundInputs(prev => {
      const current = prev[playerName] || {
        name: playerName,
        win_type: 'none',
        payer_name: undefined,
        payer_names: [],
        hand_type_id: undefined,
        factor_values: {},
        kong_events: [],
        manual_delta: 0,
        extra_rule_ids: [],
        special_rule_ids: [],
        penalty_rule_ids: [],
      };
      const currentList = current[field] || [];
      const nextList = currentList.includes(ruleId)
        ? currentList.filter(id => id !== ruleId)
        : [...currentList, ruleId];
      return {
        ...prev,
        [playerName]: {
          ...current,
          [field]: nextList,
        },
      };
    });
  };

  const handleScore = async () => {
    try {
      const payload = {
        players,
        player_rounds: players.map(p => {
          const input = roundInputs[p.name];
          return {
            name: p.name,
            win_type: 'none',
            payer_name: input?.payer_name || null,
            payer_names: input?.payer_names ?? [],
            hand_type_id: input?.hand_type_id || null,
            factor_values: input?.factor_values ?? {},
            kong_events: input?.kong_events ?? [],
            manual_delta: input?.manual_delta ?? 0,
            extra_rule_ids: input?.extra_rule_ids ?? [],
            special_rule_ids: input?.special_rule_ids ?? [],
            penalty_rule_ids: input?.penalty_rule_ids ?? [],
          } as PlayerRoundInput;
        }),
      };
      const res: RuleBasedScoreRoundResponse = await scoreRoundRuleBased(payload);
      setPlayers(res.players);
      setRoundHistory([res.player_scores, ...roundHistory]);

      // Clear selections after recording a round
      const cleared: Record<string, PlayerRoundInput> = {};
      res.players.forEach(p => {
        cleared[p.name] = {
          name: p.name,
          win_type: 'none',
          payer_name: undefined,
          payer_names: [],
          hand_type_id: undefined,
          factor_values: {},
          kong_events: [],
          manual_delta: 0,
          extra_rule_ids: [],
          special_rule_ids: [],
          penalty_rule_ids: [],
        };
      });
      setRoundInputs(cleared);
    } catch (err) {
      alert(bi("记分失败，请重试", "Error scoring round. Please try again."));
    }
  };

  return (
    <div className="screen-container">
      <div className="screen-header">
        <h1>{bi("记分板", "Scoreboard")}</h1>
      </div>
      
      {/* Player Scores */}
      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
        {players.map(p => (
          <div key={p.name} className="card" style={{ marginBottom: 0, textAlign: 'center', padding: 'var(--spacing-sm)' }}>
            <div style={{ fontSize: '14px', color: 'var(--color-text-light)' }}>{p.name}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary)' }}>{p.score}</div>
          </div>
        ))}
      </div>
      
      {/* Round Input: per-player rule-based configuration */}
      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {players.map(player => {
            const input = roundInputs[player.name];
            const isAllPayHand = !!input?.hand_type_id && ALL_PAY_HAND_IDS.has(input.hand_type_id);
            return (
              <div
                key={player.name}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: '#fafafa',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{player.name}</div>
                </div>

                {/* Win type & hand type */}
                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    marginBottom: '8px',
                    flexWrap: 'wrap',
                  }}
                >
                  <select
                    value={input?.hand_type_id ?? ''}
                    onChange={e =>
                      (() => {
                        const handId = e.target.value || undefined;
                        if (!handId) {
                          updateRoundInput(player.name, {
                            hand_type_id: undefined,
                            payer_name: undefined,
                            payer_names: [],
                            factor_values: { 'factor.zimo': false },
                          });
                          return;
                        }

                        if (ALL_PAY_HAND_IDS.has(handId)) {
                          const others = players.filter(p => p.name !== player.name).map(p => p.name);
                          updateRoundInput(player.name, {
                            hand_type_id: handId,
                            payer_name: undefined,
                            payer_names: others,
                            // 天胡/地胡不是自摸，不自动×2
                            factor_values: { 'factor.zimo': false },
                          });
                          return;
                        }

                      updateRoundInput(player.name, {
                          hand_type_id: handId,
                          payer_name: input?.payer_name,
                          payer_names: input?.payer_names ?? [],
                        });
                      })()
                    }
                    style={{
                      flex: '1',
                      minWidth: '140px',
                      padding: '6px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    <option value="">{bi("牌型", "Hand type")}</option>
                    {groupedRules.hand_type.map(rule => (
                      <option key={rule.id} value={rule.id}>
                        {rule.name_cn || rule.name} ({bi("倍数", "Base")} +{rule.points})
                      </option>
                    ))}
                  </select>

                  <select
                    value={
                      (input?.payer_names && input.payer_names.length > 0)
                        ? '__multi__'
                        : (input?.payer_name ?? '')
                    }
                    onChange={e => {
                      const v = e.target.value;
                      if (!v) {
                        updateRoundInput(player.name, {
                          payer_name: undefined,
                          payer_names: [],
                          factor_values: { 'factor.zimo': false },
                        });
                        return;
                      }
                      if (v === '__multi__') {
                        const others = players.filter(p => p.name !== player.name).map(p => p.name);
                        updateRoundInput(player.name, {
                          payer_name: undefined,
                          payer_names: others,
                          factor_values: { 'factor.zimo': true },
                        });
                        return;
                      }
                      updateRoundInput(player.name, {
                        payer_name: v,
                        payer_names: [],
                        factor_values: { 'factor.zimo': false },
                      });
                    }}
                    disabled={!input?.hand_type_id || isAllPayHand}
                    style={{
                      flex: '0 0 140px',
                      padding: '6px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-border)',
                      opacity: input?.hand_type_id && !isAllPayHand ? 1 : 0.6,
                    }}
                  >
                    <option value="">{bi("选择扣分玩家", "Select payer")}</option>
                    <option value="__multi__">{bi("自摸", "Self-draw")}</option>
                    {players
                      .filter(p => p.name !== player.name)
                      .map(p => (
                        <option key={p.name} value={p.name}>
                          {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Multi-payer selector (e.g. 自摸时：未胡的玩家才赔) */}
                {(input?.hand_type_id && (input?.payer_names?.length ?? 0) > 0) && (
                  <div
                    style={{
                      marginBottom: '8px',
                      padding: '8px',
                      borderRadius: '8px',
                      border: '1px solid var(--color-border)',
                      background: 'white',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '6px',
                      }}
                    >
                      <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>
                        {bi("勾选需要赔的玩家", "Select who pays")}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>

                      </div>
                    </div>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {players
                        .filter(p => p.name !== player.name)
                        .map(p => {
                          const checked = (input?.payer_names || []).includes(p.name);
                          return (
                            <label
                              key={p.name}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isAllPayHand}
                                onChange={() => {
                                  if (isAllPayHand) return;
                                  const current = input?.payer_names || [];
                                  const next = checked
                                    ? current.filter(x => x !== p.name)
                                    : [...current, p.name];
                                  updateRoundInput(player.name, {
                                    payer_names: next,
                                    payer_name: undefined,
                                    factor_values: { 'factor.zimo': next.length > 0 },
                                  });
                                }}
                              />
                              {p.name}
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Extra rules (combined extra + special + penalty for now) */}
                <div style={{ fontSize: '12px', marginBottom: '4px', color: 'var(--color-text-light)' }}>
                  {bi("额外番", "Extra factors")}：
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                  }}
                >
                  {groupedRules.extra.map(rule => {
                    if (rule.id === 'factor.gen') {
                      const count = Number((input?.factor_values || {})['factor.gen'] ?? 0);
                      const safeCount = Number.isFinite(count) ? Math.max(0, Math.min(4, count)) : 0;
                      return (
                        <div
                          key={rule.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '2px 8px',
                            borderRadius: '999px',
                            border: '1px solid var(--color-border)',
                            backgroundColor: 'white',
                            fontSize: '11px',
                          }}
                        >
                          <span>{rule.name_cn || rule.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateRoundInput(player.name, {
                                factor_values: { 'factor.gen': Math.max(0, safeCount - 1) },
                              })
                            }
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '6px',
                              border: '1px solid var(--color-border)',
                              background: safeCount > 0 ? 'white' : '#f2f2f2',
                              cursor: safeCount > 0 ? 'pointer' : 'not-allowed',
                              padding: 0,
                            }}
                            disabled={safeCount <= 0}
                          >
                            -
                          </button>
                          <span style={{ minWidth: '14px', textAlign: 'center' }}>{safeCount}</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateRoundInput(player.name, {
                                factor_values: { 'factor.gen': Math.min(4, safeCount + 1) },
                              })
                            }
                            style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '6px',
                              border: '1px solid var(--color-border)',
                              background: safeCount < 4 ? 'white' : '#f2f2f2',
                              cursor: safeCount < 4 ? 'pointer' : 'not-allowed',
                              padding: 0,
                            }}
                            disabled={safeCount >= 4}
                          >
                            +
                          </button>
                        </div>
                      );
                    }

                    return (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() => toggleRuleForPlayer(player.name, 'extra_rule_ids', rule.id)}
                      style={{
                        padding: '2px 6px',
                        borderRadius: '999px',
                        border: '1px solid var(--color-border)',
                        backgroundColor: input?.extra_rule_ids?.includes(rule.id)
                          ? 'var(--color-primary)'
                          : 'white',
                        color: input?.extra_rule_ids?.includes(rule.id) ? 'white' : 'var(--color-text)',
                        fontSize: '11px',
                      }}
                    >
                      {rule.name_cn || rule.name}
                    </button>
                    );
                  })}
                  {groupedRules.special.map(rule => (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() => toggleRuleForPlayer(player.name, 'special_rule_ids', rule.id)}
                      style={{
                        padding: '2px 6px',
                        borderRadius: '999px',
                        border: '1px solid var(--color-border)',
                        backgroundColor: input?.special_rule_ids?.includes(rule.id)
                          ? 'var(--color-primary)'
                          : 'white',
                        color: input?.special_rule_ids?.includes(rule.id) ? 'white' : 'var(--color-text)',
                        fontSize: '11px',
                      }}
                    >
                      {rule.name_cn || rule.name}
                    </button>
                  ))}
                  {groupedRules.penalty.map(rule => (
                    <button
                      key={rule.id}
                      type="button"
                      onClick={() => toggleRuleForPlayer(player.name, 'penalty_rule_ids', rule.id)}
                      style={{
                        padding: '2px 6px',
                        borderRadius: '999px',
                        border: '1px solid var(--color-border)',
                        backgroundColor: input?.penalty_rule_ids?.includes(rule.id)
                          ? 'var(--color-accent)'
                          : 'white',
                        color: input?.penalty_rule_ids?.includes(rule.id)
                          ? 'white'
                          : 'var(--color-text)',
                        fontSize: '11px',
                      }}
                    >
                      {rule.name_cn || rule.name}
                    </button>
                  ))}
                </div>

                {/* Kong events & manual adjustment */}
                <div style={{ marginTop: '10px' }}>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr',
                      gap: '8px',
                    }}
                  >
                    {/* Kong events list */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '12px', minWidth: '120px' }}>
                        {bi("杠", "Kong events")}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          updateRoundInput(player.name, {
                            kong_events: [...(input?.kong_events ?? []), { type: 'dian_gang', payer_name: null }],
                          })
                        }
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          border: '1px solid var(--color-border)',
                          background: 'white',
                        }}
                      >
                        {bi("添加杠", "Add kong")}
                      </button>
                    </div>

                    {(input?.kong_events ?? []).map((ev, idx) => {
                      const type = (ev as any)?.type || 'dian_gang';
                      const payer = (ev as any)?.payer_name || '';
                      const showPayer = type === 'dian_gang';
                      const showMultiPayers = type === 'bu_gang' || type === 'an_gang';
                      const selectedPayers: string[] = (ev as any)?.payer_names || [];
                      const otherPlayers = players.filter(p => p.name !== player.name).map(p => p.name);
                      const normalizedSelected = selectedPayers.filter(n => n && n !== player.name);
                      const payersLabel = showMultiPayers
                        ? `${bi("赔付", "Payers")}: ${normalizedSelected.length}/${otherPlayers.length}`
                        : '';
                      return (
                        <div
                          key={idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                            padding: '6px',
                            borderRadius: '8px',
                            border: '1px solid var(--color-border)',
                            background: 'white',
                            maxWidth: '100%',
                          }}
                        >
                          <select
                            value={type}
                            onChange={e => {
                              const nextType = e.target.value as any;
                              const next = [...(input?.kong_events ?? [])];
                              if (nextType === 'dian_gang') {
                                next[idx] = { type: nextType, payer_name: (next[idx] as any)?.payer_name ?? null, payer_names: [] };
                              } else {
                                // For bu/an, default payers = all other players (user can uncheck those who already won)
                                next[idx] = { type: nextType, payer_name: null, payer_names: otherPlayers };
                              }
                              updateRoundInput(player.name, { kong_events: next });
                            }}
                            style={{
                              flex: '1 1 240px',
                              minWidth: '180px',
                              padding: '6px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--color-border)',
                              maxWidth: '100%',
                            }}
                          >
                            <option value="dian_gang">{bi("点杠", "Point kong")}</option>
                            <option value="bu_gang">{bi("补杠", "Added kong")}</option>
                            <option value="an_gang">{bi("暗杠", "Concealed kong")}</option>
                          </select>

                          {showPayer && (
                            <select
                              value={payer}
                              onChange={e => {
                                const next = [...(input?.kong_events ?? [])];
                                next[idx] = { ...(next[idx] as any), payer_name: e.target.value || null };
                                updateRoundInput(player.name, { kong_events: next });
                              }}
                              style={{
                                flex: '1 1 160px',
                                minWidth: '140px',
                                padding: '6px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--color-border)',
                                maxWidth: '100%',
                              }}
                            >
                              <option value="">{bi("选择放杠人", "Select payer")}</option>
                              {players
                                .filter(p => p.name !== player.name)
                                .map(p => (
                                  <option key={p.name} value={p.name}>
                                    {p.name}
                                  </option>
                                ))}
                            </select>
                          )}

                          {showMultiPayers && (
                            <div style={{ flex: '1 1 100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ fontSize: '12px', color: 'var(--color-text-light)' }}>{payersLabel}</div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {otherPlayers.map(pn => {
                                  const checked = normalizedSelected.includes(pn);
                                  return (
                                    <label
                                      key={pn}
                                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => {
                                          const next = [...(input?.kong_events ?? [])];
                                          const cur = (next[idx] as any)?.payer_names || [];
                                          const nextList = checked ? cur.filter((x: string) => x !== pn) : [...cur, pn];
                                          next[idx] = { ...(next[idx] as any), payer_names: nextList };
                                          updateRoundInput(player.name, { kong_events: next });
                                        }}
                                      />
                                      {pn}
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const next = [...(input?.kong_events ?? [])];
                              next.splice(idx, 1);
                              updateRoundInput(player.name, { kong_events: next });
                            }}
                            style={{
                              marginLeft: 'auto',
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              border: '1px solid var(--color-border)',
                              background: 'white',
                              color: 'var(--color-accent)',
                              flex: '0 0 auto',
                            }}
                          >
                            {bi("删除", "Remove")}
                          </button>
                        </div>
                      );
                    })}

                    {/* Manual delta */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '12px', minWidth: '120px' }}>
                        {bi("手动调整", "Manual adjust")}
                      </div>
                      <input
                        type="number"
                        value={Number(input?.manual_delta ?? 0)}
                        onChange={e => updateRoundInput(player.name, { manual_delta: Number(e.target.value) || 0 })}
                        style={{
                          width: '120px',
                          padding: '6px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 'var(--spacing-lg)' }}>
          <ActionButton onClick={handleScore} fullWidth>
            {bi("记录本局", "Record round")}
          </ActionButton>
        </div>
      </div>
      
      {/* History */}
      {roundHistory.length > 0 && (
        <div style={{ marginTop: 'var(--spacing-xl)' }}>
          <h3 style={{ marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <History size={18} /> {bi("历史", "History")}
          </h3>
          {roundHistory.map((roundScores, idx) => (
            <div key={idx} className="card" style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
              <div style={{ fontSize: '12px', color: 'var(--color-text-light)', marginBottom: '4px' }}>
                {bi("第", "Round")} {roundHistory.length - idx} {bi("局", "")}
              </div>
              {roundScores.map(score => (
                <div
                  key={score.name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '14px',
                    marginBottom: '2px',
                  }}
                >
                  <span>{score.name}</span>
                  <span style={{ color: score.delta >= 0 ? 'var(--color-primary)' : 'var(--color-accent)' }}>
                    {score.delta >= 0 ? '+' : ''}
                    {score.delta}
                  </span>
                </div>
              ))}
              {roundScores.map(score => {
                const show =
                  (score.win_score || 0) !== 0 ||
                  (score.kong_score || 0) !== 0 ||
                  (score.manual_score || 0) !== 0;
                if (!show) return null;
                return (
                  <div
                    key={`${score.name}-breakdown`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                      color: 'var(--color-text-light)',
                      marginBottom: '6px',
                    }}
                  >
                    <span style={{ paddingLeft: '0px' }}>
                      {bi("分项", "Breakdown")}: {bi("胡", "Win")} {score.win_score ?? 0},{" "}
                      {bi("杠", "Kong")} {score.kong_score ?? 0},{" "}
                      {bi("手动", "Manual")} {score.manual_score ?? 0}
                    </span>
                    <span />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
