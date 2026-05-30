import os
import io
import json
import tempfile
import numpy as np
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ─── Audio Analysis ───────────────────────────────────────────────────────────

def analyze_audio(audio_bytes, sr=22050):
    """Analyze uploaded voice note and extract musical features."""
    try:
        import librosa
        import soundfile as sf
        
        # Load audio from bytes
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        
        y, sr = librosa.load(tmp_path, sr=sr)
        os.unlink(tmp_path)
        
        # Tempo detection
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
        tempo = float(tempo[0]) if hasattr(tempo, '__len__') else float(tempo)
        if tempo < 60: tempo = 90.0
        if tempo > 180: tempo = 120.0
        
        # Key/pitch detection
        chromagram = librosa.feature.chroma_cqt(y=y, sr=sr)
        chroma_mean = np.mean(chromagram, axis=1)
        key_idx = int(np.argmax(chroma_mean))
        keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        detected_key = keys[key_idx]
        
        # Energy / mood detection
        rms = librosa.feature.rms(y=y)[0]
        energy = float(np.mean(rms))
        spectral_centroid = float(np.mean(librosa.feature.spectral_centroid(y=y, sr=sr)))
        
        # Mood classification
        if energy > 0.05 and spectral_centroid > 2000:
            mood = "energetic"
            genre = "afrobeats"
        elif energy > 0.03:
            mood = "groovy"
            genre = "amapiano"
        else:
            mood = "mellow"
            genre = "afro-soul"
        
        # Duration
        duration = float(len(y) / sr)
        
        # Pitch contour (for melody generation)
        f0, voiced_flag, voiced_probs = librosa.pyin(
            y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7'),
            sr=sr
        )
        f0_clean = f0[~np.isnan(f0)] if f0 is not None else np.array([261.63])
        avg_pitch = float(np.mean(f0_clean)) if len(f0_clean) > 0 else 261.63
        
        # Convert average pitch to note
        if avg_pitch > 0:
            midi_note = int(librosa.hz_to_midi(avg_pitch))
        else:
            midi_note = 60
        
        return {
            "tempo": round(tempo, 1),
            "key": detected_key,
            "mood": mood,
            "genre": genre,
            "energy": round(energy * 100, 2),
            "duration": round(duration, 2),
            "avg_midi_note": midi_note,
            "status": "success"
        }
    except Exception as e:
        return {
            "tempo": 105.0,
            "key": "F",
            "mood": "groovy",
            "genre": "amapiano",
            "energy": 45.0,
            "duration": 4.0,
            "avg_midi_note": 65,
            "status": "fallback",
            "note": str(e)
        }


# ─── Song Generation Logic ────────────────────────────────────────────────────

def generate_song_arrangement(analysis: dict) -> dict:
    """Generate a complete song arrangement from audio analysis."""
    
    tempo = analysis['tempo']
    key = analysis['key']
    mood = analysis['mood']
    genre = analysis['genre']
    midi_root = analysis['avg_midi_note'] % 12  # normalize to octave 0-11
    
    # Scale patterns per genre
    scales = {
        "amapiano": [0, 2, 3, 5, 7, 8, 10],   # minor pentatonic extended
        "afrobeats": [0, 2, 4, 5, 7, 9, 11],   # major
        "afro-soul": [0, 2, 3, 5, 7, 8, 10],   # natural minor
        "gqom":      [0, 2, 3, 5, 7, 8, 10],
    }
    scale = scales.get(genre, scales["afrobeats"])
    
    # Build chord progression in key
    chord_maps = {
        "amapiano": ["i", "VI", "III", "VII"],
        "afrobeats": ["I", "IV", "V", "vi"],
        "afro-soul": ["i", "iv", "i", "V"],
    }
    progression_names = chord_maps.get(genre, chord_maps["afrobeats"])
    
    # Roman numeral to scale degree
    roman_to_degree = {
        "I": 0, "II": 1, "III": 2, "IV": 3, "V": 4, "VI": 5, "VII": 6,
        "i": 0, "ii": 1, "iii": 2, "iv": 3, "v": 4, "vi": 5, "vii": 6
    }
    
    def is_minor_chord(r):
        return r.islower() or r in ["II", "III", "VI", "VII"]
    
    # Generate actual MIDI note numbers for chords
    base_midi = 48 + midi_root  # around C3 + key offset
    chords = []
    for r in progression_names:
        degree = roman_to_degree.get(r, 0)
        root = base_midi + scale[degree % len(scale)]
        minor = is_minor_chord(r)
        third = root + (3 if minor else 4)
        fifth = root + 7
        chords.append({
            "root": root,
            "third": third,
            "fifth": fifth,
            "minor": minor,
            "name": r
        })
    
    # Drum pattern based on genre
    drum_patterns = {
        "amapiano": {
            "kick":  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
            "snare": [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
            "hihat": [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
            "log":   [0,0,1,0, 0,0,1,0, 0,1,0,0, 0,0,1,0],
        },
        "afrobeats": {
            "kick":  [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,0,0,0],
            "snare": [0,0,1,0, 0,0,1,0, 0,0,1,0, 0,1,0,1],
            "hihat": [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,1],
            "log":   [0,1,0,0, 1,0,0,1, 0,0,1,0, 1,0,0,0],
        },
        "afro-soul": {
            "kick":  [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,0,0],
            "snare": [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
            "hihat": [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
            "log":   [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
        }
    }
    drums = drum_patterns.get(genre, drum_patterns["afrobeats"])
    
    # Bassline - follows chord roots
    bassline = []
    for i, chord in enumerate(chords):
        bassline.append({
            "note": chord["root"] - 12,  # one octave down
            "duration": 1.0,
            "velocity": 90
        })
        # Sub-beat fills
        if genre == "amapiano":
            bassline.append({"note": chord["root"] - 12, "duration": 0.5, "velocity": 70})
            bassline.append({"note": chord["fifth"] - 12, "duration": 0.5, "velocity": 80})
    
    # Melody line based on scale + voice analysis
    melody_notes = []
    scale_notes = [base_midi + 12 + s for s in scale]  # one octave up
    num_measures = 4
    steps_per_measure = 8
    for step in range(num_measures * steps_per_measure):
        if step % 3 == 0 or step % 5 == 0:
            note_idx = (step * 3 + midi_root) % len(scale_notes)
            melody_notes.append({
                "note": scale_notes[note_idx],
                "duration": 0.5,
                "velocity": 75 + (step % 4) * 5,
                "step": step
            })
    
    # Instrument configuration
    instruments = {
        "piano": {
            "type": "AMSynth",
            "color": "#F59E0B",
            "enabled": True,
            "volume": -6,
            "pattern": chords
        },
        "bass": {
            "type": "FMSynth",
            "color": "#8B5CF6",
            "enabled": True,
            "volume": -4,
            "pattern": bassline
        },
        "lead_synth": {
            "type": "PolySynth",
            "color": "#10B981",
            "enabled": True,
            "volume": -8,
            "pattern": melody_notes
        },
        "drums": {
            "type": "MembraneSynth",
            "color": "#EF4444",
            "enabled": True,
            "volume": -6,
            "pattern": drums
        }
    }
    
    # Song structure
    structure = {
        "intro": {"bars": 4, "instruments": ["drums", "bass"]},
        "verse": {"bars": 8, "instruments": ["drums", "bass", "piano"]},
        "chorus": {"bars": 8, "instruments": ["drums", "bass", "piano", "lead_synth"]},
        "outro": {"bars": 4, "instruments": ["drums", "bass"]}
    }
    
    return {
        "analysis": analysis,
        "arrangement": {
            "tempo": tempo,
            "key": key,
            "genre": genre,
            "mood": mood,
            "chords": chords,
            "bassline": bassline,
            "melody": melody_notes,
            "drums": drums,
            "instruments": instruments,
            "structure": structure,
            "total_bars": 24,
            "beats_per_bar": 4
        }
    }


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "studio": "MrNtando & Sbuda AI Music Studio", "version": "1.0.0"})


@app.route('/api/analyze', methods=['POST'])
def analyze():
    """Analyze a voice recording and return musical features."""
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files['audio']
    audio_bytes = audio_file.read()
    
    if len(audio_bytes) < 100:
        return jsonify({"error": "Audio file too small"}), 400
    
    analysis = analyze_audio(audio_bytes)
    return jsonify(analysis)


@app.route('/api/generate', methods=['POST'])
def generate():
    """Generate a full song arrangement from voice recording."""
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400
    
    audio_file = request.files['audio']
    audio_bytes = audio_file.read()
    
    # Get optional params
    genre_override = request.form.get('genre')
    title = request.form.get('title', 'Untitled Track')
    
    analysis = analyze_audio(audio_bytes)
    
    if genre_override:
        analysis['genre'] = genre_override
    
    song = generate_song_arrangement(analysis)
    song['title'] = title
    song['credits'] = {
        "powered_by": "MrNtando & Sbuda AI Music Studio",
        "engine": "Tone.js + Librosa",
        "created": "Free & Open Source"
    }
    
    return jsonify(song)


@app.route('/api/genres', methods=['GET'])
def genres():
    """List available genres."""
    return jsonify({
        "genres": [
            {"id": "amapiano", "name": "Amapiano", "emoji": "🎹", "origin": "South Africa"},
            {"id": "afrobeats", "name": "Afrobeats", "emoji": "🥁", "origin": "West Africa"},
            {"id": "afro-soul", "name": "Afro Soul", "emoji": "🎷", "origin": "Pan-Africa"},
            {"id": "gqom", "name": "Gqom", "emoji": "⚡", "origin": "Durban, SA"},
        ]
    })


@app.route('/api/instruments', methods=['GET'])
def instruments():
    """List available instruments and their Tone.js configs."""
    return jsonify({
        "instruments": [
            {
                "id": "kick",
                "name": "Kick Drum",
                "emoji": "🥁",
                "synth": "MembraneSynth",
                "options": {"pitchDecay": 0.05, "octaves": 10},
                "note": "C1",
                "color": "#EF4444"
            },
            {
                "id": "snare",
                "name": "Snare",
                "emoji": "🪘",
                "synth": "NoiseSynth",
                "options": {"noise": {"type": "white"}, "envelope": {"attack": 0.005, "decay": 0.1, "sustain": 0}},
                "color": "#F97316"
            },
            {
                "id": "hihat",
                "name": "Hi-Hat",
                "emoji": "✨",
                "synth": "MetalSynth",
                "options": {"frequency": 400, "envelope": {"attack": 0.001, "decay": 0.1, "release": 0.01}, "harmonicity": 5.1, "modulationIndex": 32, "resonance": 4000, "octaves": 1.5},
                "color": "#FBBF24"
            },
            {
                "id": "bass",
                "name": "Bass Synth",
                "emoji": "🎸",
                "synth": "FMSynth",
                "options": {"harmonicity": 1, "modulationIndex": 2, "oscillator": {"type": "triangle"}, "envelope": {"attack": 0.01, "decay": 0.1, "sustain": 0.8, "release": 0.5}},
                "color": "#8B5CF6"
            },
            {
                "id": "piano",
                "name": "Piano / Keys",
                "emoji": "🎹",
                "synth": "AMSynth",
                "options": {"harmonicity": 3.999, "oscillator": {"type": "square"}, "envelope": {"attack": 0.01, "decay": 0.3, "sustain": 0.4, "release": 0.8}},
                "color": "#F59E0B"
            },
            {
                "id": "lead",
                "name": "Lead Synth",
                "emoji": "🎺",
                "synth": "Synth",
                "options": {"oscillator": {"type": "sawtooth"}, "envelope": {"attack": 0.05, "decay": 0.3, "sustain": 0.6, "release": 1}},
                "color": "#10B981"
            },
            {
                "id": "pad",
                "name": "Atmosphere Pad",
                "emoji": "🌊",
                "synth": "PolySynth",
                "options": {"oscillator": {"type": "sine"}, "envelope": {"attack": 0.5, "decay": 0.5, "sustain": 0.8, "release": 2}},
                "color": "#06B6D4"
            },
            {
                "id": "log",
                "name": "Log Drum (Amapiano)",
                "emoji": "🪵",
                "synth": "MembraneSynth",
                "options": {"pitchDecay": 0.2, "octaves": 4},
                "note": "G2",
                "color": "#D97706"
            }
        ]
    })


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
