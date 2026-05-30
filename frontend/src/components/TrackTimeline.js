import React from 'react';
import './TrackTimeline.css';

const DRUM_TYPES = [
  { id: 'kick',  label: 'Kick',  emoji: '🥁', color: '#EF4444' },
  { id: 'snare', label: 'Snare', emoji: '🪘', color: '#F97316' },
  { id: 'hihat', label: 'HiHat', emoji: '✨', color: '#FBBF24' },
  { id: 'log',   label: 'Log',   emoji: '🪵', color: '#D97706' },
];

export default function TrackTimeline({ drums, currentBeat, onToggle, muted, onMute }) {
  return (
    <div className="timeline">
      {/* Beat numbers */}
      <div className="tl-header">
        <div className="tl-label-col" />
        <div className="tl-grid-header">
          {Array.from({length: 16}, (_, i) => (
            <div key={i} className={`tl-beat-num ${currentBeat === i ? 'active' : ''} ${i % 4 === 0 ? 'bar-start' : ''}`}>
              {i % 4 === 0 ? (Math.floor(i/4)+1) : '·'}
            </div>
          ))}
        </div>
      </div>

      {/* Drum rows */}
      {DRUM_TYPES.map(({ id, label, emoji, color }) => {
        const pattern = drums?.[id] || Array(16).fill(0);
        const isMuted = muted?.[id];
        return (
          <div key={id} className={`tl-row ${isMuted ? 'muted' : ''}`}>
            <div className="tl-label-col">
              <button className={`tl-mute-btn ${isMuted ? 'is-muted' : ''}`}
                onClick={() => onMute(id)} title="Mute/unmute">
                {isMuted ? '🔇' : '🔊'}
              </button>
              <span className="tl-emoji">{emoji}</span>
              <span className="tl-label">{label}</span>
            </div>
            <div className="tl-cells">
              {pattern.map((on, i) => (
                <button
                  key={i}
                  className={`tl-cell ${on ? 'on' : ''} ${currentBeat === i ? 'current' : ''} ${i % 4 === 0 ? 'bar-start' : ''}`}
                  style={on ? { '--cell-color': color } : {}}
                  onClick={() => onToggle(id, i)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
