import React from 'react';
import './MixerPanel.css';

const CHANNELS = [
  { id: 'kick',  label: 'Kick',  emoji: '🥁', color: '#EF4444' },
  { id: 'snare', label: 'Snare', emoji: '🪘', color: '#F97316' },
  { id: 'hihat', label: 'HiHat', emoji: '✨', color: '#FBBF24' },
  { id: 'log',   label: 'Log',   emoji: '🪵', color: '#D97706' },
  { id: 'bass',  label: 'Bass',  emoji: '🎸', color: '#8B5CF6' },
  { id: 'piano', label: 'Keys',  emoji: '🎹', color: '#F59E0B' },
  { id: 'lead',  label: 'Lead',  emoji: '🎺', color: '#10B981' },
  { id: 'pad',   label: 'Pad',   emoji: '🌊', color: '#06B6D4' },
];

export default function MixerPanel({ volumes, muted, onVolume, onMute, isPlaying }) {
  return (
    <div className="mixer">
      {CHANNELS.map(({ id, label, emoji, color }) => {
        const vol = volumes[id] ?? 0;
        const isMuted = muted[id] ?? false;
        // Convert dB to 0-100 for slider: range is -40 to +6
        const sliderVal = Math.round(((vol + 40) / 46) * 100);
        const handleSlider = (val) => {
          const db = ((val / 100) * 46) - 40;
          onVolume(id, Math.round(db));
        };
        return (
          <div key={id} className={`mixer-ch ${isMuted ? 'muted' : ''}`}>
            <button
              className={`mixer-mute ${isMuted ? 'is-muted' : ''}`}
              style={{ '--ch-color': color }}
              onClick={() => onMute(id)}
              title="Mute">
              {isMuted ? '🔇' : emoji}
            </button>
            <div className="mixer-fader-wrap">
              <input
                type="range" min="0" max="100" value={sliderVal}
                className="mixer-fader"
                style={{ '--ch-color': color }}
                onChange={e => handleSlider(+e.target.value)}
              />
              {isPlaying && !isMuted && (
                <div className="vu-bar" style={{ '--ch-color': color, '--vu': `${sliderVal}%` }} />
              )}
            </div>
            <div className="mixer-label">{label}</div>
            <div className="mixer-db">{vol > 0 ? `+${vol}` : vol}dB</div>
          </div>
        );
      })}
    </div>
  );
}
