import React, { useEffect, useRef, useState } from 'react';
import { checkHand, getTiles, Tile, CheckHandResponse } from '../api/client';
import { ActionButton } from '../components/ActionButton';
import { TileCard } from '../components/TileCard';
import { X, Trophy, AlertCircle } from 'lucide-react';

export const QAScreen: React.FC = () => {
  // Hand checker state
  const [allTiles, setAllTiles] = useState<Tile[]>([]);
  const [selectedTiles, setSelectedTiles] = useState<Tile[]>([]);
  const [result, setResult] = useState<CheckHandResponse | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getTiles().then(setAllTiles);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [selectedTiles]);

  const addTile = (tile: Tile) => {
    if (selectedTiles.length < 14) {
      setSelectedTiles([...selectedTiles, tile]);
      setResult(null);
    }
  };

  const removeTile = (index: number) => {
    const newTiles = [...selectedTiles];
    newTiles.splice(index, 1);
    setSelectedTiles(newTiles);
    setResult(null);
  };

  const handleCheck = async () => {
    const tileIds = selectedTiles.map(t => t.id);
    try {
      const res = await checkHand(tileIds);
      setResult(res);
    } catch (err) {
      alert("Error checking hand");
    }
  };

  const clearHand = () => {
    setSelectedTiles([]);
    setResult(null);
  };

  return (
    <div className="screen-container">
      <div className="screen-header">
        <h1>手牌检测 / Hand Checker</h1>
      </div>
      
      {/* Hand Checker Section */}
      <div className="card">
        <h2 style={{ marginBottom: 'var(--spacing-sm)' }}>Check Your Hand</h2>
        <p style={{ marginTop: 0, marginBottom: 'var(--spacing-md)', fontSize: '14px', color: 'var(--color-text-light)' }}>
          Tap tiles below to build a 14-tile hand and see if it can win.
        </p>

        {/* Selected Hand */}
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-light)' }}>
              Selected: {selectedTiles.length}/14
            </span>
            {selectedTiles.length > 0 && (
              <button 
                onClick={clearHand}
                style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontSize: '12px' }}
              >
                Clear All
              </button>
            )}
          </div>

          {selectedTiles.length === 0 ? (
            <div style={{ 
              height: '90px', 
              border: '2px dashed var(--color-border)', 
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-light)',
              fontSize: '14px'
            }}>
              Select tiles below to start
            </div>
          ) : (
            <div 
              ref={scrollRef}
              style={{ 
                display: 'flex', 
                gap: '8px', 
                overflowX: 'auto', 
                paddingBottom: '4px',
                scrollBehavior: 'smooth'
              }}
            >
              {selectedTiles.map((tile, idx) => (
                <div key={`${tile.id}-${idx}`} style={{ position: 'relative', flexShrink: 0 }}>
                  <TileCard tile={tile} size="sm" />
                  <button 
                    onClick={() => removeTile(idx)}
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      background: 'var(--color-text)',
                      color: 'white',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 'none',
                      padding: 0,
                      zIndex: 2
                    }}
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action button */}
        <div style={{ marginBottom: 'var(--spacing-md)' }}>
          <ActionButton 
            onClick={handleCheck} 
            disabled={selectedTiles.length === 0}
            fullWidth
          >
            Check Hand
          </ActionButton>
        </div>

        {/* Result */}
        {result && (
          <div className="card" style={{ 
            backgroundColor: result.is_win ? '#E8F5E9' : '#FFEBEE', 
            borderColor: result.is_win ? 'var(--color-primary)' : 'var(--color-accent)',
            borderWidth: '2px',
            marginBottom: 'var(--spacing-md)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              {result.is_win ? <Trophy color="var(--color-primary)" /> : <AlertCircle color="var(--color-accent)" />}
              <h3 style={{ marginBottom: 0, color: result.is_win ? 'var(--color-primary-dark)' : 'var(--color-accent)' }}>
                {result.is_win ? "Winning Hand!" : "Not a winning hand"}
              </h3>
            </div>
            <p style={{ margin: 0, fontSize: '14px' }}>{result.message}</p>
            
            {result.detail && (
              <div style={{ marginTop: '12px', fontSize: '14px' }}>
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>Melds found:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                   {result.detail.melds.map((m, i) => (
                     <span key={i} style={{ background: 'white', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.1)' }}>
                       {m.join(' ')}
                     </span>
                   ))}
                </div>
                <div style={{ marginTop: '8px' }}>
                  <span style={{ fontWeight: 600 }}>Pair: </span> 
                  {result.detail.pair.join(' ')}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tile Picker */}
        <h3 style={{ marginTop: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)' }}>Add Tiles</h3>
        <div className="grid-4" style={{ gap: '8px' }}>
          {allTiles.map(tile => (
            <TileCard 
              key={tile.id} 
              tile={tile} 
              onClick={() => addTile(tile)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
