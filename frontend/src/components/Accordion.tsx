import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface AccordionProps {
  title: string;
  children: React.ReactNode;
  highlighted?: boolean;
}

export const Accordion: React.FC<AccordionProps> = ({
  title,
  children,
  highlighted = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const containerStyle: React.CSSProperties = highlighted
    ? {
        borderBottom: '1px solid var(--color-primary)',
        marginBottom: '8px',
        borderRadius: 8,
        boxShadow: '0 0 0 2px rgba(75, 175, 121, 0.18)',
        background: '#f3fff8',
      }
    : {
        borderBottom: '1px solid var(--color-border)',
        marginBottom: '8px',
      };

  return (
    <div style={containerStyle}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          background: 'none',
          border: 'none',
          padding: '16px 16px',
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--color-text)',
          textAlign: 'left',
        }}
      >
        {title}
        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {isOpen && (
        <div
          style={{
            paddingBottom: '16px',
            color: 'var(--color-text-light)',
            fontSize: '15px',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

