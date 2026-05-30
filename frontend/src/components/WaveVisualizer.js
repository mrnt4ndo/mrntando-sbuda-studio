import React from 'react';
import './WaveVisualizer.css';

export default function WaveVisualizer({ active }) {
  return (
    <div className={`wave-vis ${active ? 'active' : ''}`}>
      {Array.from({length: 40}, (_, i) => (
        <div key={i} className="wave-bar"
          style={{ animationDelay: `${(i * 0.05) % 1.5}s`, animationDuration: `${0.8 + (i % 5) * 0.2}s` }} />
      ))}
    </div>
  );
}
