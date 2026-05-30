import React, { useState, useEffect, useRef } from 'react';
import * as Tone from 'tone';
import './EffectsRack.css';

export default function EffectsRack() {
  const [effects, setEffects] = useState({
    reverb:  { on: false, wet: 40, label: 'Reverb',  emoji: '🌊', color: '#06B6D4' },
    delay:   { on: false, wet: 30, label: 'Delay',   emoji: '🔁', color: '#8B5CF6' },
    distort: { on: false, wet: 50, label: 'Distort', emoji: '⚡', color: '#EF4444' },
    chorus:  { on: false, wet: 35, label: 'Chorus',  emoji: '🎙', color: '#10B981' },
    phaser:  { on: false, wet: 45, label: 'Phaser',  emoji: '🌀', color: '#F59E0B' },
    compressor: { on: true, wet: 60, label: 'Compressor', emoji: '🗜', color: '#FF3D6E' },
  });

  const fxRef = useRef({});

  useEffect(() => {
    fxRef.current = {
      reverb:  new Tone.Reverb({ decay: 3, wet: 0 }).toDestination(),
      delay:   new Tone.FeedbackDelay('8n', 0.3),
      distort: new Tone.Distortion({ distortion: 0.5, wet: 0 }).toDestination(),
      chorus:  new Tone.Chorus(4, 2.5, 0.5).toDestination(),
      phaser:  new Tone.Phaser({ frequency: 15, octaves: 5, wet: 0 }).toDestination(),
    };
    return () => Object.values(fxRef.current).forEach(f => { try { f.dispose(); } catch(e){} });
  }, []);

  const toggle = (id) => {
    setEffects(prev => {
      const next = { ...prev, [id]: { ...prev[id], on: !prev[id].on } };
      const fx = fxRef.current[id];
      if (fx && fx.wet) fx.wet.value = next[id].on ? next[id].wet / 100 : 0;
      return next;
    });
  };

  const setWet = (id, val) => {
    setEffects(prev => {
      const next = { ...prev, [id]: { ...prev[id], wet: val } };
      const fx = fxRef.current[id];
      if (fx && fx.wet && next[id].on) fx.wet.value = val / 100;
      return next;
    });
  };

  return (
    <div className="effects-rack">
      <div className="er-title">🎛 Effects Rack</div>
      <div className="er-grid">
        {Object.entries(effects).map(([id, fx]) => (
          <div key={id} className={`er-unit ${fx.on ? 'active' : ''}`} style={{ '--fx-color': fx.color }}>
            <button className="er-toggle" onClick={() => toggle(id)}>
              <span className="er-emoji">{fx.emoji}</span>
              <span className={`er-led ${fx.on ? 'on' : ''}`} />
            </button>
            <div className="er-label">{fx.label}</div>
            <input
              type="range" min="0" max="100" value={fx.wet}
              className="er-knob"
              onChange={e => setWet(id, +e.target.value)}
              disabled={!fx.on}
            />
            <div className="er-val">{fx.wet}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}
