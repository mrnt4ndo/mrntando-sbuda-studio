import React, { useState } from 'react';
import './LyricsPanel.css';

const TEMPLATES = {
  amapiano: [
    "Woza nami, dance with me tonight 🌙",
    "Piano calling, feel the keys in your soul",
    "Log drum speaking, ancestors calling back",
    "Joburg nights, we moving to the groove",
  ],
  afrobeats: [
    "Afrobeats got me moving, can't stop now 🔥",
    "From Lagos to the world, we taking over",
    "She dey dance, I dey watch, my heart dey jump",
    "Jollof and afrobeats, the perfect combo",
  ],
  'afro-soul': [
    "Hold me close, let the music speak for us 💫",
    "Soul to soul, heartbeat to heartbeat we flow",
    "Africa in my veins, music in my blood",
    "Gentle rain, gentle rhythm, gentle love",
  ],
  gqom: [
    "Durban in the building, feel the bass drop ⚡",
    "Dark and heavy, moving through the night",
    "Warehouse vibes, strobe lights, we alive",
    "Deep underground, Gqom nation rise up",
  ],
};

export default function LyricsPanel({ genre, trackTitle }) {
  const [lines, setLines] = useState(TEMPLATES[genre] || TEMPLATES.afrobeats);
  const [editIdx, setEditIdx] = useState(null);
  const [editVal, setEditVal] = useState('');
  const [showAll, setShowAll] = useState(false);

  const startEdit = (i) => { setEditIdx(i); setEditVal(lines[i]); };
  const saveEdit = () => {
    if (editVal.trim()) {
      const next = [...lines]; next[editIdx] = editVal.trim();
      setLines(next);
    }
    setEditIdx(null);
  };
  const addLine = () => { setLines(prev => [...prev, 'New line...']); setEditIdx(lines.length); setEditVal('New line...'); };
  const deleteLine = (i) => setLines(prev => prev.filter((_,j) => j !== i));
  const shuffle = () => {
    const pool = Object.values(TEMPLATES).flat();
    setLines([...lines].sort(() => Math.random() - 0.5).slice(0,4)
      .concat(pool[Math.floor(Math.random()*pool.length)]));
  };

  const visible = showAll ? lines : lines.slice(0, 4);

  return (
    <div className="lyrics-panel">
      <div className="lp-header">
        <span className="lp-title">📝 Lyrics Sheet</span>
        <div className="lp-actions">
          <button className="lp-btn" onClick={shuffle} title="Shuffle inspiration">🎲</button>
          <button className="lp-btn" onClick={addLine} title="Add line">＋</button>
        </div>
      </div>
      <div className="lp-track-name">{trackTitle || 'Untitled Track'}</div>
      <div className="lp-lines">
        {visible.map((line, i) => (
          <div key={i} className="lp-line">
            {editIdx === i ? (
              <input
                className="lp-input"
                value={editVal}
                autoFocus
                onChange={e => setEditVal(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={e => e.key === 'Enter' && saveEdit()}
              />
            ) : (
              <span className="lp-text" onClick={() => startEdit(i)}>{line}</span>
            )}
            <button className="lp-del" onClick={() => deleteLine(i)}>×</button>
          </div>
        ))}
      </div>
      {lines.length > 4 && (
        <button className="lp-more" onClick={() => setShowAll(v => !v)}>
          {showAll ? '▲ Show less' : `▼ +${lines.length - 4} more lines`}
        </button>
      )}
    </div>
  );
}
