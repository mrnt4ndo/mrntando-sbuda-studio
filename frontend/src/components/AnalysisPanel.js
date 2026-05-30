import React from 'react';
import './AnalysisPanel.css';

const MOOD_COLORS = {
  energetic: '#EF4444',
  groovy: '#F59E0B',
  mellow: '#06B6D4',
};
const GENRE_EMOJIS = {
  amapiano: '🎹',
  afrobeats: '🥁',
  'afro-soul': '🎷',
  gqom: '⚡',
};

export default function AnalysisPanel({ analysis }) {
  if (!analysis) return null;
  const { tempo, key, mood, genre, energy, duration, status } = analysis;
  const moodColor = MOOD_COLORS[mood] || '#10B981';
  const genreEmoji = GENRE_EMOJIS[genre] || '🎵';

  return (
    <div className="analysis-panel">
      <div className="ap-header">
        <div className="ap-title">Voice Analysis Results</div>
        {status === 'fallback' && (
          <div className="ap-badge warn">⚠️ Default values used</div>
        )}
        {status === 'success' && (
          <div className="ap-badge ok">✅ AI Analyzed</div>
        )}
      </div>
      <div className="ap-grid">
        <div className="ap-card">
          <div className="ap-card-icon">🎵</div>
          <div className="ap-card-value">{tempo} <span>BPM</span></div>
          <div className="ap-card-label">Tempo</div>
        </div>
        <div className="ap-card">
          <div className="ap-card-icon">🎹</div>
          <div className="ap-card-value">{key}</div>
          <div className="ap-card-label">Key</div>
        </div>
        <div className="ap-card" style={{ '--mood-color': moodColor }}>
          <div className="ap-card-icon">🌡</div>
          <div className="ap-card-value mood-val">{mood}</div>
          <div className="ap-card-label">Mood</div>
        </div>
        <div className="ap-card">
          <div className="ap-card-icon">{genreEmoji}</div>
          <div className="ap-card-value genre-val">{genre}</div>
          <div className="ap-card-label">Genre Match</div>
        </div>
        <div className="ap-card ap-card-wide">
          <div className="ap-card-label">Energy Level</div>
          <div className="energy-bar-wrap">
            <div className="energy-bar" style={{ width: `${Math.min(energy, 100)}%`, '--energy': energy }}>
              <span className="energy-label">{energy}%</span>
            </div>
          </div>
        </div>
        {duration && (
          <div className="ap-card">
            <div className="ap-card-icon">⏱</div>
            <div className="ap-card-value">{duration}s</div>
            <div className="ap-card-label">Duration</div>
          </div>
        )}
      </div>
    </div>
  );
}
