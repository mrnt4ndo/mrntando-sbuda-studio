import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import Recorder from './components/Recorder';
import InstrumentPad from './components/InstrumentPad';
import TrackTimeline from './components/TrackTimeline';
import AnalysisPanel from './components/AnalysisPanel';
import MixerPanel from './components/MixerPanel';
import WaveVisualizer from './components/WaveVisualizer';
import LyricsPanel from './components/LyricsPanel';
import EffectsRack from './components/EffectsRack';
import SongStructure from './components/SongStructure';
import './App.css';

const API = process.env.REACT_APP_API_URL || '';

export default function App() {
  const [step, setStep] = useState('record'); // record | analyze | studio | playing
  const [recording, setRecording] = useState(null); // blob
  const [analysis, setAnalysis] = useState(null);
  const [arrangement, setArrangement] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [trackTitle, setTrackTitle] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('');
  const [volumes, setVolumes] = useState({ kick:0, snare:0, hihat:0, bass:0, piano:0, lead:0, pad:0, log:0 });
  const [muted, setMuted] = useState({});
  const [bpm, setBpm] = useState(105);
  const [activeBeats, setActiveBeats] = useState({});
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [currentBar, setCurrentBar] = useState(0);
  const [toast, setToast] = useState(null);
  const [drumsCustom, setDrumsCustom] = useState(null);
  const [studioTab, setStudioTab] = useState('mix'); // mix | effects | lyrics | structure
  const barCountRef = useRef(0);
  
  const synthsRef = useRef({});
  const seqRef = useRef(null);

  const showToast = (msg, type='info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Initialize Tone.js instruments ────────────────────────────────────────
  const initSynths = useCallback(() => {
    // Cleanup
    Object.values(synthsRef.current).forEach(s => {
      try { s.dispose(); } catch(e) {}
    });

    const reverb = new Tone.Reverb({ decay: 1.5, wet: 0.2 }).toDestination();
    const delay  = new Tone.FeedbackDelay("8n", 0.15).toDestination();
    const limiter = new Tone.Limiter(-3).toDestination();

    synthsRef.current = {
      kick: new Tone.MembraneSynth({ pitchDecay: 0.05, octaves: 10,
        envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 }
      }).connect(limiter),

      snare: new Tone.NoiseSynth({
        noise: { type: 'white' },
        envelope: { attack: 0.001, decay: 0.13, sustain: 0, release: 0.05 }
      }).connect(limiter),

      hihat: new Tone.MetalSynth({
        frequency: 400, envelope: { attack: 0.001, decay: 0.08, release: 0.01 },
        harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5
      }).connect(limiter),

      log: new Tone.MembraneSynth({ pitchDecay: 0.2, octaves: 4,
        envelope: { attack: 0.001, decay: 0.4, sustain: 0, release: 0.1 }
      }).connect(reverb),

      bass: new Tone.FMSynth({
        harmonicity: 1, modulationIndex: 2,
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.8, release: 0.4 },
        modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.5, release: 0.4 }
      }).connect(reverb),

      piano: new Tone.AMSynth({
        harmonicity: 3.999,
        oscillator: { type: 'square' },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.4, release: 0.8 },
        modulation: { type: 'square' },
        modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }
      }).connect(reverb),

      lead: new Tone.Synth({
        oscillator: { type: 'sawtooth' },
        envelope: { attack: 0.05, decay: 0.3, sustain: 0.6, release: 1 }
      }).connect(delay),

      pad: new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'sine' },
        envelope: { attack: 0.5, decay: 0.5, sustain: 0.8, release: 2 }
      }).connect(reverb),
    };
  }, []);

  useEffect(() => {
    initSynths();
    return () => {
      Object.values(synthsRef.current).forEach(s => { try { s.dispose(); } catch(e) {} });
      if (seqRef.current) seqRef.current.dispose();
    };
  }, [initSynths]);

  // ── Volume / mute control ─────────────────────────────────────────────────
  useEffect(() => {
    Object.entries(synthsRef.current).forEach(([id, synth]) => {
      if (!synth) return;
      const vol = volumes[id] ?? 0;
      const isMuted = muted[id] ?? false;
      if (synth.volume) synth.volume.value = isMuted ? -Infinity : vol;
    });
  }, [volumes, muted]);

  // ── Stop everything ───────────────────────────────────────────────────────
  const stopAll = useCallback(() => {
    if (seqRef.current) {
      seqRef.current.stop();
      seqRef.current.dispose();
      seqRef.current = null;
    }
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    setIsPlaying(false);
    setCurrentBeat(-1);
  }, []);

  // ── Play song ─────────────────────────────────────────────────────────────
  const playSong = useCallback(async () => {
    if (!arrangement) return;
    await Tone.start();
    stopAll();

    const { tempo, chords, bassline, melody, drums } = arrangement;
    const drumPattern = drumsCustom || drums;
    Tone.getTransport().bpm.value = bpm || tempo;

    let beat = 0;
    const totalSteps = 16;

    // Map midi number to Tone note string
    const midiToNote = (midi) => {
      const notes = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
      const oct = Math.floor(midi / 12) - 1;
      return notes[midi % 12] + oct;
    };

    const seq = new Tone.Sequence((time, step) => {
      setCurrentBeat(step);

      // Drums
      const drumTypes = ['kick','snare','hihat','log'];
      drumTypes.forEach(type => {
        if (drumPattern[type]?.[step] && !muted[type]) {
          try {
            if (type === 'snare') synthsRef.current.snare?.triggerAttackRelease('16n', time);
            else if (type === 'hihat') synthsRef.current.hihat?.triggerAttackRelease(0.02, time);
            else if (type === 'kick') synthsRef.current.kick?.triggerAttackRelease('C1', '8n', time);
            else if (type === 'log') synthsRef.current.log?.triggerAttackRelease('G2', '8n', time);
          } catch(e) {}
        }
      });

      // Chord index (4 chords, 4 steps each)
      const chordIdx = Math.floor(step / 4) % chords.length;
      const chord = chords[chordIdx];

      // Piano chords - on beat 1 and 3
      if ((step % 4 === 0 || step % 4 === 2) && !muted.piano && chord) {
        try {
          const notes = [midiToNote(chord.root), midiToNote(chord.third), midiToNote(chord.fifth)];
          synthsRef.current.piano?.triggerAttackRelease(notes[0], '4n', time);
        } catch(e) {}
      }

      // Bass - follows chord root
      if (step % 2 === 0 && !muted.bass && chord) {
        try {
          synthsRef.current.bass?.triggerAttackRelease(midiToNote(chord.root - 12), '4n', time);
        } catch(e) {}
      }

      // Lead melody
      if (!muted.lead && melody) {
        const melNote = melody.find(m => m.step === step);
        if (melNote) {
          try {
            synthsRef.current.lead?.triggerAttackRelease(midiToNote(melNote.note), '8n', time);
          } catch(e) {}
        }
      }

      // Pad - long sustained chord every 8 steps
      if (step % 8 === 0 && !muted.pad && chord) {
        try {
          const notes = [midiToNote(chord.root + 12), midiToNote(chord.third + 12)];
          synthsRef.current.pad?.triggerAttackRelease(notes, '2n', time);
        } catch(e) {}
      }

      beat = (beat + 1) % totalSteps;
      if (beat === 0) {
        barCountRef.current = (barCountRef.current + 1) % 44;
        setCurrentBar(barCountRef.current);
      }
    }, Array.from({length: totalSteps}, (_, i) => i), '16n');

    seq.loop = true;
    seqRef.current = seq;
    seq.start(0);
    Tone.getTransport().start();
    setIsPlaying(true);
  }, [arrangement, bpm, drumsCustom, muted, stopAll]);

  // ── Analyze voice note ────────────────────────────────────────────────────
  const handleAnalyze = async (audioBlob) => {
    setRecording(audioBlob);
    setIsLoading(true);
    setStep('analyze');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice.wav');
      const res = await fetch(`${API}/api/analyze`, { method: 'POST', body: formData });
      const data = await res.json();
      setAnalysis(data);
      setBpm(data.tempo);
      showToast('Voice analyzed! Ready to generate your track 🎵', 'success');
    } catch(e) {
      showToast('Analysis failed - using default settings', 'warn');
      setAnalysis({ tempo: 105, key: 'F', mood: 'groovy', genre: 'amapiano', energy: 50 });
      setBpm(105);
    }
    setIsLoading(false);
  };

  // ── Generate full arrangement ─────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!recording) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('audio', recording, 'voice.wav');
      formData.append('title', trackTitle || 'My Track');
      if (selectedGenre) formData.append('genre', selectedGenre);
      const res = await fetch(`${API}/api/generate`, { method: 'POST', body: formData });
      const data = await res.json();
      setArrangement(data.arrangement);
      setBpm(data.arrangement.tempo);
      setDrumsCustom(data.arrangement.drums);
      setStep('studio');
      showToast('Track generated! Hit play to hear it 🔥', 'success');
    } catch(e) {
      showToast('Generation failed - check connection', 'error');
    }
    setIsLoading(false);
  };

  // ── Update drum pattern cell ──────────────────────────────────────────────
  const toggleDrumCell = (type, idx) => {
    setDrumsCustom(prev => {
      const p = prev ? { ...prev } : { ...(arrangement?.drums || {}) };
      const row = [...(p[type] || Array(16).fill(0))];
      row[idx] = row[idx] ? 0 : 1;
      return { ...p, [type]: row };
    });
  };

  const genres = [
    { id: 'amapiano', name: 'Amapiano', emoji: '🎹' },
    { id: 'afrobeats', name: 'Afrobeats', emoji: '🥁' },
    { id: 'afro-soul', name: 'Afro Soul', emoji: '🎷' },
    { id: 'gqom', name: 'Gqom', emoji: '⚡' },
  ];

  return (
    <div className="app">
      {/* Animated background */}
      <div className="bg-grid" />
      <div className="bg-orbs">
        <div className="orb orb1" />
        <div className="orb orb2" />
        <div className="orb orb3" />
      </div>

      {/* Header */}
      <header className="app-header">
        <div className="header-logo">
          <div className="logo-icon">🎵</div>
          <div className="logo-text">
            <span className="logo-main">MrNtando & Sbuda</span>
            <span className="logo-sub">AI Music Studio</span>
          </div>
        </div>
        <nav className="header-steps">
          {['record','analyze','studio'].map((s, i) => (
            <div key={s} className={`step-dot ${step === s ? 'active' : ''} ${
              (step === 'analyze' && i === 0) || (step === 'studio' && i <= 1) ? 'done' : ''
            }`}>
              <span className="step-num">{i+1}</span>
              <span className="step-label">{s === 'record' ? 'Record' : s === 'analyze' ? 'Analyze' : 'Studio'}</span>
            </div>
          ))}
        </nav>
        <div className="header-badge">FREE • OPEN SOURCE</div>
      </header>

      <main className="app-main">
        {/* ── STEP 1: RECORD ── */}
        {step === 'record' && (
          <div className="page-record slide-up">
            <div className="record-hero">
              <h1 className="hero-title">
                <span className="gradient-text">Sing it.</span><br/>
                We'll build the beat.
              </h1>
              <p className="hero-sub">Record a voice note — hum, sing, rap, or beatbox. Our AI turns it into a full Afro track with live instruments.</p>
            </div>
            <div className="record-card">
              <Recorder onRecordingComplete={handleAnalyze} />
              <div className="genre-select-row">
                <span className="genre-label">Genre (optional):</span>
                <div className="genre-chips">
                  {genres.map(g => (
                    <button key={g.id}
                      className={`genre-chip ${selectedGenre === g.id ? 'selected' : ''}`}
                      onClick={() => setSelectedGenre(selectedGenre === g.id ? '' : g.id)}>
                      {g.emoji} {g.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="record-instruments-preview">
              <div className="instruments-title">Instruments in your studio</div>
              <div className="instruments-grid-preview">
                {[
                  {e:'🥁',n:'Kick'},{e:'🪘',n:'Snare'},{e:'✨',n:'Hi-Hat'},{e:'🪵',n:'Log Drum'},
                  {e:'🎸',n:'Bass'},{e:'🎹',n:'Keys'},{e:'🎺',n:'Lead'},{e:'🌊',n:'Pad'}
                ].map(({e,n}) => (
                  <div key={n} className="inst-preview-chip">{e} <span>{n}</span></div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: ANALYZE ── */}
        {step === 'analyze' && (
          <div className="page-analyze slide-up">
            <h2 className="page-title">Analyzing Your Voice</h2>
            {isLoading ? (
              <div className="loading-screen">
                <WaveVisualizer active={true} />
                <div className="loading-steps">
                  {['Detecting tempo & BPM','Identifying musical key','Reading energy & mood','Choosing genre style','Mapping pitch contour'].map((s,i) => (
                    <div key={i} className="loading-step" style={{animationDelay: `${i*0.4}s`}}>
                      <span className="step-spinner" />
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            ) : analysis && (
              <div className="analyze-results">
                <AnalysisPanel analysis={analysis} />
                <div className="track-setup">
                  <div className="input-group">
                    <label>Track Title</label>
                    <input type="text" placeholder="e.g. Midnight Amapiano" value={trackTitle}
                      onChange={e => setTrackTitle(e.target.value)} className="text-input" />
                  </div>
                  <div className="genre-select-row">
                    <span className="genre-label">Override Genre:</span>
                    <div className="genre-chips">
                      {genres.map(g => (
                        <button key={g.id}
                          className={`genre-chip ${selectedGenre === g.id ? 'selected' : ''}`}
                          onClick={() => setSelectedGenre(selectedGenre === g.id ? '' : g.id)}>
                          {g.emoji} {g.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button className="btn-primary btn-xl" onClick={handleGenerate} disabled={isLoading}>
                    {isLoading ? '⏳ Generating...' : '🎹 Generate Full Track'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: STUDIO ── */}
        {step === 'studio' && arrangement && (
          <div className="page-studio slide-up">
            {/* Studio Header */}
            <div className="studio-topbar">
              <div className="studio-title">
                <span className="track-title-display">{trackTitle || 'Untitled Track'}</span>
                <span className="track-meta">{arrangement.key} • {arrangement.genre} • {arrangement.tempo} BPM</span>
              </div>
              <div className="transport-controls">
                <div className="bpm-ctrl">
                  <label>BPM</label>
                  <input type="number" min="60" max="180" value={bpm}
                    onChange={e => { setBpm(+e.target.value); if(isPlaying) Tone.getTransport().bpm.value = +e.target.value; }}
                    className="bpm-input" />
                </div>
                {!isPlaying ? (
                  <button className="btn-play" onClick={playSong}>▶ PLAY</button>
                ) : (
                  <button className="btn-stop" onClick={stopAll}>⏹ STOP</button>
                )}
                <button className="btn-secondary" onClick={() => { stopAll(); setStep('record'); setRecording(null); setAnalysis(null); setArrangement(null); }}>
                  ↩ New Track
                </button>
              </div>
            </div>

            {/* Studio Layout */}
            <div className="studio-layout">
              {/* LEFT: Drum machine */}
              <div className="studio-drums">
                <div className="panel-title">🥁 Drum Machine</div>
                <TrackTimeline
                  drums={drumsCustom || arrangement.drums}
                  currentBeat={currentBeat}
                  onToggle={toggleDrumCell}
                  muted={muted}
                  onMute={(type) => setMuted(prev => ({...prev, [type]: !prev[type]}))}
                />
              </div>

              {/* RIGHT: Tabbed panel */}
              <div className="studio-right">
                <div className="studio-tabs">
                  {[
                    {id:'mix',      label:'🎚 Mix'},
                    {id:'effects',  label:'🎛 FX'},
                    {id:'lyrics',   label:'📝 Lyrics'},
                    {id:'pads',     label:'🎹 Pads'},
                  ].map(t => (
                    <button key={t.id}
                      className={`studio-tab ${studioTab === t.id ? 'active' : ''}`}
                      onClick={() => setStudioTab(t.id)}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {studioTab === 'mix' && (
                  <MixerPanel
                    volumes={volumes}
                    muted={muted}
                    onVolume={(id, val) => setVolumes(prev => ({...prev, [id]: val}))}
                    onMute={(id) => setMuted(prev => ({...prev, [id]: !prev[id]}))}
                    isPlaying={isPlaying}
                  />
                )}
                {studioTab === 'effects' && <EffectsRack />}
                {studioTab === 'lyrics' && (
                  <LyricsPanel genre={arrangement.genre} trackTitle={trackTitle} />
                )}
                {studioTab === 'pads' && (
                  <InstrumentPad synths={synthsRef.current} arrangement={arrangement} />
                )}
              </div>
            </div>

            {/* Song Structure */}
            <SongStructure currentBar={currentBar} isPlaying={isPlaying} />

            {/* Chord / Key info */}
            <div className="chord-strip">
              <div className="chord-strip-label">Chord Progression</div>
              <div className="chords-row">
                {arrangement.chords.map((c, i) => (
                  <div key={i} className={`chord-pill ${c.minor ? 'minor' : 'major'}`}>
                    {c.name}
                  </div>
                ))}
              </div>
              <div className="key-info">
                Key of <strong>{arrangement.key}</strong> &nbsp;|&nbsp; Genre: <strong>{arrangement.genre}</strong> &nbsp;|&nbsp; Mood: <strong>{arrangement.mood}</strong>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✅' : toast.type === 'warn' ? '⚠️' : toast.type === 'error' ? '❌' : 'ℹ️'} {toast.msg}
        </div>
      )}

      <footer className="app-footer">
        <span>MrNtando & Sbuda AI Music Studio</span>
        <span className="footer-sep">•</span>
        <span>Powered by Tone.js + Librosa</span>
        <span className="footer-sep">•</span>
        <span>100% Free & Open Source</span>
      </footer>
    </div>
  );
}
