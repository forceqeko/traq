import React from 'react';
import { createPortal } from 'react-dom';
import Loader from './Loader';

/**
 * Fullscreen / Overlay Loader with glassmorphic backdrop and animated cube.
 * Optimized for desktop PC display with generous padding and clear typography.
 * Uses createPortal to ensure absolute centering on document.body.
 */
export default function FullscreenLoader({ visible, message = 'Memproses data...' }) {
  if (!visible) return null;

  return createPortal(
    <div className="dialog-overlay" style={{ zIndex: 100000 }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.5rem',
          backgroundColor: 'var(--surface-1)',
          padding: '2.5rem 3rem',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45), 0 10px 20px -5px rgba(0, 0, 0, 0.2)',
          width: '100%',
          maxWidth: '460px',
          textAlign: 'center',
          animation: 'dialogPopIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          boxSizing: 'border-box',
        }}
      >
        <Loader size={54} />
        <div style={{ marginTop: '0.5rem' }}>
          <div
            style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            {message}
          </div>
          <span
            style={{
              fontSize: '0.845rem',
              color: 'var(--text-muted)',
              display: 'block',
              marginTop: '0.35rem',
            }}
          >
            Mohon tunggu sebentar...
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
