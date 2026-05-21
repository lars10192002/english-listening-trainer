import { useRef, useState, useEffect } from 'react';

interface AudioPlayerProps {
  src: string;
  defaultSpeed?: number;
  rewindSeconds?: number;
}

const SPEEDS = [0.75, 1.0, 1.25, 1.5];

export default function AudioPlayer({ src, defaultSpeed = 1.0, rewindSeconds = 3 }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(defaultSpeed);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const rewind = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - rewindSeconds);
  };

  const forward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + rewindSeconds);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = parseFloat(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div style={styles.container}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onEnded={() => setIsPlaying(false)}
      />

      <div style={styles.controls}>
        <button style={styles.btn} onClick={rewind} title={`-${rewindSeconds}s`}>⏪ {rewindSeconds}s</button>
        <button style={{ ...styles.btn, ...styles.playBtn }} onClick={togglePlay}>
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
        <button style={styles.btn} onClick={forward} title={`+${rewindSeconds}s`}>+{rewindSeconds}s ⏩</button>
      </div>

      <div style={styles.progress}>
        <span style={styles.time}>{formatTime(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          style={styles.slider}
        />
        <span style={styles.time}>{formatTime(duration)}</span>
      </div>

      <div style={styles.speedRow}>
        {SPEEDS.map(s => (
          <button
            key={s}
            style={{ ...styles.speedBtn, ...(speed === s ? styles.speedActive : {}) }}
            onClick={() => setSpeed(s)}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#1e1e2e',
    border: '1px solid #313244',
    borderRadius: 8,
    padding: '16px',
    userSelect: 'none',
  },
  controls: {
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 12,
  },
  btn: {
    background: '#313244',
    color: '#cdd6f4',
    border: 'none',
    borderRadius: 6,
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: 13,
  },
  playBtn: {
    background: '#89b4fa',
    color: '#1e1e2e',
    fontWeight: 700,
    minWidth: 90,
  },
  progress: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  slider: {
    flex: 1,
    accentColor: '#89b4fa',
  },
  time: {
    color: '#a6adc8',
    fontSize: 12,
    minWidth: 36,
    textAlign: 'center',
  },
  speedRow: {
    display: 'flex',
    gap: 6,
    justifyContent: 'center',
  },
  speedBtn: {
    background: '#313244',
    color: '#a6adc8',
    border: '1px solid #45475a',
    borderRadius: 4,
    padding: '3px 10px',
    cursor: 'pointer',
    fontSize: 12,
  },
  speedActive: {
    background: '#89b4fa',
    color: '#1e1e2e',
    borderColor: '#89b4fa',
    fontWeight: 700,
  },
};
