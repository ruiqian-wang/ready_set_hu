import React, { useEffect, useState } from 'react';
import {
  getTiles,
  getRuleset,
  getBasicRules,
  searchRules,
  Tile,
  Ruleset,
  BasicRule,
} from '../api/client';
import { TileCard } from '../components/TileCard';
import { Accordion } from '../components/Accordion';

type LearnTab = 'tiles' | 'rules';

export const LearnScreen: React.FC = () => {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [loadingTiles, setLoadingTiles] = useState(true);
  const [loadingRuleset, setLoadingRuleset] = useState(true);
  const [ruleset, setRuleset] = useState<Ruleset | null>(null);
  const [basicRules, setBasicRules] = useState<BasicRule[]>([]);
  const [loadingBasics, setLoadingBasics] = useState(true);
  const [activeTab, setActiveTab] = useState<LearnTab>('tiles');
  const [ruleQuery, setRuleQuery] = useState('');
  const [matchedRuleIds, setMatchedRuleIds] = useState<string[]>([]);
  const [searchingRules, setSearchingRules] = useState(false);

  useEffect(() => {
    getTiles().then(data => {
      setTiles(data);
      setLoadingTiles(false);
    });

    getRuleset()
      .then(data => setRuleset(data))
      .finally(() => setLoadingRuleset(false));

    getBasicRules()
      .then(data => setBasicRules(data))
      .finally(() => setLoadingBasics(false));
  }, []);

  // Debounced rules search (backed by /rules/search)
  useEffect(() => {
    const q = ruleQuery.trim();
    if (!q) {
      setMatchedRuleIds([]);
      setSearchingRules(false);
      return;
    }

    setSearchingRules(true);
    let cancelled = false;
    const handle = setTimeout(() => {
      searchRules(q)
        .then(ids => {
          if (!cancelled) {
            setMatchedRuleIds(ids || []);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setMatchedRuleIds([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setSearchingRules(false);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [ruleQuery]);

  if (loadingTiles) {
    return (
      <div className="screen-container flex-center" style={{ minHeight: '60vh' }}>
        <div style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Loading tiles...</div>
      </div>
    );
  }

  const groupedTiles = tiles.reduce((acc, tile) => {
    if (!acc[tile.suit]) acc[tile.suit] = [];
    acc[tile.suit].push(tile);
    return acc;
  }, {} as Record<string, Tile[]>);

  const sections: Array<{
    key: string;
    suit: string;
    label: string;
    borderColor: string;
    chipColor: string;
  }> = [
    {
      key: 'Wan',
      suit: 'Wan',
      label: 'Characters',
      borderColor: '#E86969',
      chipColor: '#E86969'
    },
    {
      key: 'Tong',
      suit: 'Tong',
      label: 'Dots',
      borderColor: '#45B67C',
      chipColor: '#45B67C'
    },
    {
      key: 'Tiao',
      suit: 'Tiao',
      label: 'Bamboo',
      borderColor: '#4D8BFF',
      chipColor: '#4D8BFF'
    }
  ];

  const basicBefore = basicRules.filter(r => r.section === 'before_game');
  const basicDuring = basicRules.filter(r => r.section === 'during_turn');
  const basicWinning = basicRules.filter(r => r.section === 'winning_scoring');

  const isMatched = (id?: string | null) =>
    !!id && matchedRuleIds.includes(id);

  const sortByMatch = <T extends { id?: string }>(items: T[]): T[] => {
    if (!matchedRuleIds.length) return items;
    const index = new Map<string, number>();
    matchedRuleIds.forEach((id, i) => index.set(id, i));
    return [...items].sort((a, b) => {
      const aIdx = index.has(a.id || '') ? index.get(a.id || '')! : Number.MAX_SAFE_INTEGER;
      const bIdx = index.has(b.id || '') ? index.get(b.id || '')! : Number.MAX_SAFE_INTEGER;
      if (aIdx === bIdx) return 0;
      return aIdx - bIdx;
    });
  };

  return (
    <div className="screen-container">
      <div className="learn-main-card">
        <div className="screen-header">
          <h1>麻将基本 / Learning Mahjong</h1>
        </div>

        {/* Tabs */}
        <div className="learn-tabs">
          <button
            className={
              activeTab === 'tiles'
                ? 'learn-tab learn-tab-active'
                : 'learn-tab'
            }
            onClick={() => setActiveTab('tiles')}
          >
            Tile Recognition
          </button>
          <button
            className={
              activeTab === 'rules'
                ? 'learn-tab learn-tab-active'
                : 'learn-tab'
            }
            onClick={() => setActiveTab('rules')}
          >
            Basic Rules
          </button>
        </div>

        {activeTab === 'tiles' && (
          <div className="learn-sections">
            {sections.map(section => {
              const suitTiles = groupedTiles[section.suit] || [];
              const englishSuit =
                section.label.endsWith('s')
                  ? section.label.slice(0, -1)
                  : section.label;
              return (
                <div
                  key={section.key}
                  className="learn-tile-section"
                  style={{ borderColor: section.borderColor }}
                >
                  <div
                    className="learn-tile-section-chip"
                    style={{ backgroundColor: section.chipColor }}
                  >
                    {section.label}
                  </div>
                  <div className="learn-tile-row">
                    {suitTiles.map(tile => (
                      <div key={tile.id} className="learn-tile-row-item">
                        <TileCard tile={tile} size="lg" />
                        <div className="learn-tile-label">
                          <div className="learn-tile-label-en">
                            {tile.rank} {englishSuit}
                          </div>
                          <div className="learn-tile-label-cn">
                            {tile.name_cn}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="learn-rules">
            <div className="rules-search">
              <label className="rules-search-label">
                Ask about a rule
              </label>
              <input
                className="rules-search-input"
                type="text"
                value={ruleQuery}
                onChange={(e) => setRuleQuery(e.target.value)}
                placeholder='e.g. "Can I chow?" or "什么是缺门？"'
              />
              <div className="rules-search-hint">
                We&apos;ll match your question to the most relevant basic rules, winning hands, and multipliers.
              </div>
              {searchingRules && ruleQuery.trim() && (
                <div className="rules-search-status">
                  Searching rules...
                </div>
              )}
            </div>

            {/* Before the game */}
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">Before the game</div>
              {loadingBasics && (
                <div style={{ color: 'var(--color-text-light)' }}>
                  Loading basic rules...
                </div>
              )}
              {!loadingBasics &&
                basicBefore.map(rule => (
                  <Accordion
                    key={rule.id}
                    title={`${rule.name_cn || rule.name_en}${rule.name_cn && rule.name_en ? ` / ${rule.name_en}` : ''}`}
                    highlighted={isMatched(rule.id)}
                  >
                    <div className="rule-description-content">
                      {rule.description_cn && (
                        <div style={{ marginBottom: 8 }}>{rule.description_cn}</div>
                      )}
                      {rule.description_en && (
                        <div>{rule.description_en}</div>
                      )}
                    </div>
                  </Accordion>
                ))}
            </div>

            {/* During a turn */}
            <div className="card" style={{ marginBottom: '16px' }}>
              <div className="card-title">During a turn</div>
              {loadingBasics && (
                <div style={{ color: 'var(--color-text-light)' }}>
                  Loading basic rules...
                </div>
              )}
              {!loadingBasics &&
                basicDuring.map(rule => (
                  <Accordion
                    key={rule.id}
                    title={`${rule.name_cn || rule.name_en}${rule.name_cn && rule.name_en ? ` / ${rule.name_en}` : ''}`}
                    highlighted={isMatched(rule.id)}
                  >
                    <div className="rule-description-content">
                      {rule.description_cn && (
                        <div style={{ marginBottom: 8 }}>{rule.description_cn}</div>
                      )}
                      {rule.description_en && (
                        <div>{rule.description_en}</div>
                      )}
                    </div>
                  </Accordion>
                ))}
            </div>

            {/* Scoring */}
            <div className="card">
              <div className="card-title">Winning &amp; scoring</div>

              {loadingBasics && (
                <div style={{ color: 'var(--color-text-light)' }}>
                  Loading basic rules...
                </div>
              )}
              {!loadingBasics &&
                basicWinning.map(rule => (
                  <Accordion
                    key={rule.id}
                    title={`${rule.name_cn || rule.name_en}${rule.name_cn && rule.name_en ? ` / ${rule.name_en}` : ''}`}
                    highlighted={isMatched(rule.id)}
                  >
                    <div className="rule-description-content">
                      {rule.description_cn && (
                        <div style={{ marginBottom: 8 }}>{rule.description_cn}</div>
                      )}
                      {rule.description_en && (
                        <div>{rule.description_en}</div>
                      )}
                    </div>
                  </Accordion>
                ))}

              {loadingRuleset && (
                <div style={{ color: 'var(--color-text-light)', marginTop: 8 }}>
                  Loading winning hands and multipliers...
                </div>
              )}
              {!loadingRuleset && ruleset && (
                <>
                  <div className="learn-hand-section-title">Winning hands</div>
                  <div className="learn-hand-list">
                    {sortByMatch((ruleset.hands || []) as any[]).map((hand: any) => {
                      const nameCn = hand?.name?.zh || '';
                      const nameEn = hand?.name?.en || hand?.name || 'Unnamed';
                      const displayName = nameCn ? `${nameCn} / ${nameEn}` : nameEn;
                      const desc =
                        hand?.description_one_line?.zh ||
                        hand?.description_one_line?.en ||
                        hand?.description_one_line ||
                        '';
                      const base =
                        (hand?.scoring && hand.scoring.base_multiplier) ?? '?';
                      const id = hand?.id || '';
                      const highlighted = isMatched(id);
                      return (
                        <div
                          key={id}
                          className={
                            highlighted
                              ? 'learn-hand-item learn-hand-item-highlighted'
                              : 'learn-hand-item'
                          }
                        >
                          <div className="learn-hand-header">
                            <div className="learn-hand-name">{displayName}</div>
                            <div className="learn-hand-multiplier">Base ×{base}</div>
                          </div>
                          <div className="learn-hand-desc">{desc}</div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="learn-hand-section-title">Multipliers</div>
                  <div className="learn-hand-list">
                    {sortByMatch(((ruleset.multipliers?.factors as any[]) || [])).map((f: any) => {
                      const nameCn = f?.name?.zh || '';
                      const nameEn = f?.name?.en || f?.name || 'Unnamed';
                      const displayName = nameCn ? `${nameCn} / ${nameEn}` : nameEn;
                      const desc =
                        f?.description?.zh ||
                        f?.description?.en ||
                        f?.description ||
                        '';
                      const id = f?.id || '';
                      const highlighted = isMatched(id);
                      return (
                        <div
                          key={id || nameEn}
                          className={
                            highlighted
                              ? 'learn-hand-item learn-hand-item-highlighted'
                              : 'learn-hand-item'
                          }
                        >
                          <div className="learn-hand-header">
                            <div className="learn-hand-name">{displayName}</div>
                          </div>
                          <div className="learn-hand-desc">{desc}</div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              {!loadingRuleset && !ruleset && (
                <div style={{ color: 'var(--color-error)' }}>
                  Failed to load ruleset. Please retry later.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
