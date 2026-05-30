import React, { useState } from 'react';
import './SongStructure.css';

const SECTIONS = [
  { id: 'intro',   label: 'Intro',   bars: 4,  color: '#06B6D4' },
  { id: 'verse',   label: 'Verse 1', bars: 8,  color: '#8B5CF6' },
  { id: 'chorus',  label: 'Chorus',  bars: 8,  color: '#FF3D6E' },
  { id: 'verse2',  label: 'Verse 2', bars: 8,  color: '#8B5CF6' },
  { id: 'chorus2', label: 'Chorus',  bars: 8,  color: '#FF3D6E' },
  { id: 'bridge',  label: 'Bridge',  bars: 4,  color: '#F59E0B' },
  { id: 'outro',   label: 'Outro',   bars: 4,  color: '#10B981' },
];

const TOTAL_BARS = SECTIONS.reduce((s, x) => s + x.bars, 0);

export default function SongStructure({ currentBar = 0, isPlaying }) {
  const [sections, setSections] = useState(SECTIONS);
  const [active, setActive] = useState(null);

  let offset = 0;
  const laid = sections.map(s => {
    const r = { ...s, offset, pct: (s.bars / TOTAL_BARS) * 100 };
    offset += s.bars;
    return r;
  });

  return (
    <div className="song-structure">
      <div className="ss-title">🎼 Song Structure</div>
      <div className="ss-track">
        {laid.map(s => (
          <div
            key={s.id}
            className={`ss-block ${active === s.id ? 'selected' : ''}`}
            style={{ width: `${s.pct}%`, '--blk-color': s.color }}
            onClick={() => setActive(active === s.id ? null : s.id)}
            title={`${s.label} — ${s.bars} bars`}
          >
            <span className="ss-blk-label">{s.label}</span>
            <span className="ss-blk-bars">{s.bars}b</span>
          </div>
        ))}
        {isPlaying && (
          <div className="ss-playhead" style={{ left: `${(currentBar / TOTAL_BARS) * 100}%` }} />
        )}
      </div>
      <div className="ss-legend">
        {laid.map(s => (
          <div key={s.id} className="ss-leg-item">
            <span className="ss-leg-dot" style={{ background: s.color }} />
            <span>{s.label}</span>
            <span className="ss-leg-bars">{s.bars} bars</span>
          </div>
        ))}
      </div>
    </div>
  );
}
