# 🎵 MrNtando & Sbuda AI Music Studio

> Turn your voice into a full Afro track — powered by AI, totally free.

## What it does

1. **Record** a voice note in your browser (sing, hum, rap, or beatbox)
2. **Analyze** — AI detects your BPM, musical key, mood, and best genre
3. **Generate** — Full song arrangement with 8 virtual instruments
4. **Mix** — Live drum machine, mixer faders, instrument pads

## Instruments

| Instrument | Type | Style |
|---|---|---|
| 🥁 Kick Drum | MembraneSynth | All genres |
| 🪘 Snare | NoiseSynth | All genres |
| ✨ Hi-Hat | MetalSynth | All genres |
| 🪵 Log Drum | MembraneSynth | Amapiano |
| 🎸 Bass | FMSynth | Groovy basslines |
| 🎹 Keys / Piano | AMSynth | Chord progressions |
| 🎺 Lead Synth | Sawtooth Synth | Melody lines |
| 🌊 Atmosphere Pad | PolySynth | Ambient textures |

## Supported Genres

- 🎹 **Amapiano** (South Africa) — log drum, deep bass, log piano
- 🥁 **Afrobeats** (West Africa) — complex poly-rhythms, percussive
- 🎷 **Afro Soul** (Pan-Africa) — smooth, soulful, melodic
- ⚡ **Gqom** (Durban, SA) — minimal, dark, hypnotic

## Tech Stack

- **Frontend**: React 18, Tone.js (Web Audio), Framer Motion
- **Backend**: Python Flask, Librosa (audio analysis), NumPy, SciPy
- **Deployment**: Render (free tier)
- **Cost**: $0

## Deploy to Render

1. Fork or push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Blueprint
3. Connect your repo — Render reads `render.yaml` automatically
4. Both services deploy automatically (backend API + frontend static site)

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend
```bash
cd frontend
npm install
REACT_APP_API_URL=http://localhost:5000 npm start
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/analyze` | Analyze voice note → musical features |
| POST | `/api/generate` | Generate full song arrangement |
| GET | `/api/genres` | List available genres |
| GET | `/api/instruments` | List instruments + Tone.js configs |

---

**Powered by MrNtando & Sbuda** · Free & Open Source · Built with ❤️
