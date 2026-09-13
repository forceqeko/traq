import React from 'react';

/**
 * Animated Wave Bars Loader
 * Uiverse.io by Donewenfu with dynamic theme color support.
 */
export default function Loader({ color }) {
  return (
    <div className="loader-wrapper">
      <div
        className="jimu-primary-loading"
        style={color ? { background: color } : {}}
      />
    </div>
  );
}
