import React from 'react';
import { Tile } from '../api/client';

interface TileCardProps {
  tile: Tile;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const TileCard: React.FC<TileCardProps> = ({ 
  tile, 
  isSelected = false, 
  onClick,
  size = 'md',
  showLabel = false 
}) => {
  const sizeMap = {
    sm: { width: '40px', fontSize: '12px' },
    md: { width: '100%', fontSize: '14px' }, // Responsive in grid
    lg: { width: '60px', fontSize: '16px' }
  };

  const style: React.CSSProperties = {
    aspectRatio: '3/4',
    backgroundColor: 'white',
    borderRadius: 'var(--radius-sm)',
    border: isSelected ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
    boxShadow: isSelected ? '0 0 0 2px var(--color-primary-soft)' : 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: onClick ? 'pointer' : 'default',
    position: 'relative',
    transition: 'transform 0.1s ease',
    transform: isSelected ? 'scale(1.05)' : 'none',
    overflow: 'hidden',
    ...((size !== 'md') ? { width: sizeMap[size].width } : {})
  };

  return (
    <div 
      style={style} 
      onClick={onClick}
      className="tile-card"
    >
      <img 
        src={tile.image_url} 
        alt={tile.name_en} 
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block'
        }}
        onError={(e) => {
          // Fallback to text if image fails loading
          (e.target as HTMLImageElement).style.display = 'none';
          (e.currentTarget.parentElement?.querySelector('.fallback-text') as HTMLElement).style.display = 'flex';
        }}
      />
      
      {/* Fallback Text (hidden by default) */}
      <div 
        className="fallback-text"
        style={{ 
          display: 'none',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: size === 'sm' ? '14px' : '20px', 
          fontWeight: 'bold',
          color: tile.suit === 'Wan' ? '#D32F2F' : 
                 tile.suit === 'Tiao' ? '#388E3C' : '#1976D2'
        }}
      >
        {tile.name_cn}
      </div>
      
      {showLabel && (
        <div style={{ 
          position: 'absolute',
          bottom: '2px',
          fontSize: '10px', 
          color: 'var(--color-text-light)', 
          backgroundColor: 'rgba(255,255,255,0.8)',
          padding: '0 2px',
          borderRadius: '2px'
        }}>
          {tile.rank}
        </div>
      )}
    </div>
  );
};

