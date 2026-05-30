import React, { useState, useRef, useEffect } from 'react';
import './Recorder.css';

export default function Recorder({ onRecordingComplete }) {
  const [state, setState] = useState('idle'); // idle | recording | done
  const [duration, setDuration] = useState(0);
  const [audioURL, setAudioURL] = useState(null);
  const [bars, setBars] = useState(Array(32).fill(2));
  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const analyserRef = useRef(null);
  const animRef = useRef(null);
  const streamRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup visualizer
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const drawBars = () => {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        const mapped = Array.from({length: 32}, (_, i) => {
          const val = data[Math.floor(i * data.length / 32)] / 255;
          return Math.max(2, val * 80);
        });
        setBars(mapped);
        animRef.current = requestAnimationFrame(drawBars);
      };
      drawBars();

      // MediaRecorder
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        setState('done');
        onRecordingComplete(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setState('recording');
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch(e) {
      alert('Microphone access denied. Please allow microphone permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRef.current?.state === 'recording') {
      mediaRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setBars(Array(32).fill(2));
  };

  const resetRecording = () => {
    setState('idle');
    setAudioURL(null);
    setDuration(0);
    setBars(Array(32).fill(2));
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  return (
    <div className="recorder">
      {/* Waveform visualizer */}
      <div className="rec-visualizer">
        {bars.map((h, i) => (
          <div key={i} className={`rec-bar ${state === 'recording' ? 'active' : ''}`}
            style={{ height: `${h}px`, animationDelay: `${i * 0.03}s` }} />
        ))}
      </div>

      {/* Timer */}
      <div className={`rec-timer ${state === 'recording' ? 'blinking' : ''}`}>
        {state === 'recording' && <span className="rec-dot" />}
        {fmt(duration)}
        {state === 'recording' && <span className="rec-label">REC</span>}
      </div>

      {/* Controls */}
      <div className="rec-controls">
        {state === 'idle' && (
          <button className="rec-btn rec-btn-start" onClick={startRecording}>
            <span className="rec-icon">🎙</span>
            Start Recording
          </button>
        )}
        {state === 'recording' && (
          <button className="rec-btn rec-btn-stop" onClick={stopRecording}>
            <span className="stop-sq" />
            Stop Recording
          </button>
        )}
        {state === 'done' && (
          <div className="rec-done">
            <div className="rec-success">
              <span>✅</span> Voice note captured ({fmt(duration)})
            </div>
            {audioURL && (
              <audio controls src={audioURL} className="rec-playback" />
            )}
            <button className="rec-btn rec-btn-reset" onClick={resetRecording}>
              🔄 Re-record
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
