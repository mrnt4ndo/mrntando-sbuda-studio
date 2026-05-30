import React, { useState } from 'react';
import * as Tone from 'tone';
import './InstrumentPad.css';

const midiToNote = (midi) => {
  const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const oct = Math.floor(midi / 12) - 1;
  return notes[midi % 12] + oct;
};

const PADS = [
  { id: 'kick',  label: 'Kick',  emoji: '🥁', color: '#EF4444',
    play: (synths) => synths.kick?.triggerAttackRelease('C1','8n') },
  { id: 'snare', label: 'Snare', emoji: '🪘', color: '#F97316',
    play: (synths) => synths.snare?.triggerAttackRelease('16n') },
  { id: 'hihat', label: 'HiHat', emoji: '✨', color: '#FBBF24',
    play: (synths) => synths.hihat?.triggerAttackRelease(0.02) },
  { id: 'log',   label: 'Log',   emoji: '🪵', color: '#D97706',
    play: (synths) => synths.log?.triggerAttackRelease('G2','8n') },
  { id: 'bass',  label: 'Bass',  emoji: '🎸', color: '#8B5CF6',
    play: (synths, arr) => {
      const note = arr?.chords?.[0] ? midiToNote(arr.chords[0].root - 12) : 'F2';
      synths.bass?.triggerAttackRelease(note, '4n');
    }
  },
  { id: 'piano', label: 'Keys',  emoji: '🎹', color: '#F59E0B',
    play: (synths, arr) => {
      const note = arr?.chords?.[0] ? midiToNote(arr.chords[0].root) : 'F3';
      synths.piano?.triggerAttackRelease(note, '4n');
    }
  },
  { id: 'lead',  label: 'Lead',  emoji: '🎺', color: '#10B981',
    play: (synths, arr) => {
      const note = arr?.chords?.[0] ? midiToNote(arr.chords[0].root + 12) : 'F4';
      synths.lead?.triggerAttackRelease(note, '4n');
    }
  },
  { id: 'pad',   label: 'Pad',   emoji: '🌊', color: '#06B6D4',
    play: (synths, arr) => {
      const notes = arr?.chords?.[0] ? [
        midiToNote(arr.chords[0].root + 12),
        midiToNote(arr.chords[0].third + 12)
      ] : ['F4','A4'];
      synths.pad?.triggerAttackRelease(notes, '2n');
    }
  },
];

export default function InstrumentPad({ synths, arrangement }) {
  const [active, setActive] = useState({});

  const handlePad = async (pad) => {
    await Tone.start();
    try { pad.play(synths, arrangement); } catch(e) {}
    setActive(prev => ({ ...prev, [pad.id]: true }));
    setTimeout(() => setActive(prev => ({ ...prev, [pad.id]: false })), 150);
  };

  return (
    <div className="inst-pad">
      {PADS.map(pad => (
        <button
          key={pad.id}
          className={`pad-btn ${active[pad.id] ? 'hit' : ''}`}
          style={{ '--pad-color': pad.color }}
          onMouseDown={() => handlePad(pad)}
          onTouchStart={(e) => { e.preventDefault(); handlePad(pad); }}>
          <span className="pad-emoji">{pad.emoji}</span>
          <span className="pad-label">{pad.label}</span>
          {active[pad.id] && <span className="pad-ripple" />}
        </button>
      ))}
    </div>
  );
}
