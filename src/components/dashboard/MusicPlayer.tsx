import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Music,
  ListMusic,
} from "lucide-react";
import { getMusic } from "@/api/hotSearch";

interface Track {
  title: string;
  artist: string;
  src: string;
}

const playerGlassStyle = {
  background: "#ffffff24",
  backdropFilter: "blur(32px) saturate(200%)",
  WebkitBackdropFilter: "blur(32px) saturate(200%)",
  border: "1px solid hsl(0 0% 100% / .22)",
};

export const MusicPlayer = () => {
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showVolume, setShowVolume] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("music-player-collapsed") === "1";
    } catch {
      return false;
    }
  });
  const [trackIdx, setTrackIdx] = useState(0);

  useEffect(() => {
    getMusic().then((res) => {
      const data = res.data?.data || res.data || [];
      setPlaylist(Array.isArray(data) ? data : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("music-player-collapsed", collapsed ? "1" : "0");
    } catch {
      /* ignore storage errors */
    }
  }, [collapsed]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playlistRef = useRef<Track[]>([]);
  const trackIdxRef = useRef(0);

  // Keep refs in sync
  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => { trackIdxRef.current = trackIdx; }, [trackIdx]);

  // Initialize audio
  useEffect(() => {
    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = volume;
    audioRef.current = audio;

    const onLoaded = () => setDuration(audio.duration || 0);
    const onEnded = () => {
      const list = playlistRef.current;
      if (list.length > 0) {
        const next = (trackIdxRef.current + 1) % list.length;
        setTrackIdx(next);
      } else {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }
    };
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDur = () => setDuration(audio.duration || 0);

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("durationchange", onDur);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("durationchange", onDur);
      audioRef.current = null;
    };
  }, []);

  // Load track
  useEffect(() => {
    const audio = audioRef.current;
    const t = playlist[trackIdx];
    if (!audio || !t) return;
    audio.src = t.src;
    audio.load();
    setCurrentTime(0);
    setDuration(0);
    if (playing) {
      audio.play().catch(() => setPlaying(false));
    }
  }, [trackIdx, playlist]);

  // Sync volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  }, [playing]);

  const handlePrev = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !playlist.length) return;
    if (audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    setTrackIdx((prev) => (prev === 0 ? playlist.length - 1 : prev - 1));
  }, [playlist.length]);

  const handleNext = useCallback(() => {
    if (!playlist.length) return;
    setTrackIdx((prev) => (prev + 1) % playlist.length);
  }, [playlist.length]);

  const formatTime = (s: number) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const audio = audioRef.current;
    if (audio && duration > 0) {
      audio.currentTime = ratio * duration;
    }
  };

  // collapsed mode
  if (collapsed) {
    return (
      <div style={{ position: "fixed", top: "32px", right: "150px", zIndex: 40, transform: "scale(0.9)", transition: "all 0.5s cubic-bezier(0.22, 1, 0.36, 1)" }}>
        <button onClick={() => setCollapsed(false)}
          className="w-11 h-11 grid place-items-center"
          style={{
            ...playerGlassStyle,
            borderRadius: "3rem",
            boxShadow: "0 8px 24px -6px rgba(0,0,0,0.3)",
            transition: "all 0.5s cubic-bezier(0.22, 1, 0.36, 1)",
          }}>
          <div className={playing ? "animate-spin-slow" : ""}>
            <Music size={16} className="text-white/70" />
          </div>
        </button>
      </div>
    );
  }

  // Don't render until playlist is loaded
  if (!playlist.length) return null;

  const track = playlist[trackIdx];
  if (!track) return null;

  return (
    <div style={{ position: "fixed", left: "calc(50% - 230px)", top: "32px", zIndex: 40, transform: "scale(0.85)", transition: "all 0.5s cubic-bezier(0.22, 1, 0.36, 1)" }}>
      <div
        className="noise px-5 py-2.5 flex items-center gap-5 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.7)]"
        style={{ ...playerGlassStyle, borderRadius: "3rem" }}
      >
        {/* Album art — click to collapse */}
        <button onClick={() => setCollapsed(true)} className="shrink-0 focus:outline-none">
          <div className="w-9 h-9 rounded-[50%]
bg-gradient-to-br from-neon-purple via-neon-pink to-neon-cyan grid place-items-center shrink-0 shadow-[0_0_20px_-5px_hsl(var(--neon-purple)/0.5)] hover:opacity-80 transition-opacity">
            <div className={playing ? "animate-spin-slow" : ""}>
              <Music size={15} className="text-white/90" />
            </div>
          </div>
        </button>

        {/* Track info + progress */}
        <div className="min-w-0 w-40 flex flex-col justify-center">
          <p className="text-[11px] font-semibold truncate leading-tight">{track.title}</p>
          <p className="text-[9px] text-white/35 truncate leading-tight">{track.artist}</p>
          <div
            className="mt-1 h-[4px] rounded-full bg-white/20 overflow-hidden cursor-pointer group/progress transition-all"
            onClick={seek}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-400 to-amber-300 transition-[width] duration-300 ease-linear shadow-[0_0_6px_rgba(251,146,60,0.4)]"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[8px] text-white/25 tabular-nums">{formatTime(currentTime)}</span>
            <span className="text-[8px] text-white/25 tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            className="w-8 h-8 rounded-[50%]
grid place-items-center text-white/25 hover:text-white/60 hover:bg-white/5 transition-all duration-200"
          >
            <SkipBack size={14} />
          </button>

          <button
            onClick={togglePlay}
            className="w-9 h-9 rounded-full grid place-items-center transition-all duration-200 hover:scale-105 active:scale-95 ring-1 ring-white/10"
            style={{
              background: playing
                ? "linear-gradient(135deg, #7c3aed, #6366f1)"
                : "rgba(255,255,255,0.12)",
              boxShadow: playing
                ? "0 0 25px -5px rgba(124,58,237,0.5)"
                : "none",
            }}
          >
            {playing ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" className="ml-0.5" />}
          </button>

          <button
            onClick={handleNext}
            className="w-8 h-8 rounded-[50%]
grid place-items-center text-white/25 hover:text-white/60 hover:bg-white/5 transition-all duration-200"
          >
            <SkipForward size={14} />
          </button>
        </div>

        {/* Volume */}
        <div
          className="relative flex items-center"
          onMouseEnter={() => setShowVolume(true)}
          onMouseLeave={() => setShowVolume(false)}
        >
          <button
            onClick={() => setMuted(!muted)}
            className="w-8 h-8 rounded-[50%]
grid place-items-center text-white/25 hover:text-white/60 hover:bg-white/5 transition-all duration-200"
          >
            {muted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>

          <div
            className={`overflow-hidden transition-all duration-300 ${
              showVolume ? "w-24 ml-2 opacity-100" : "w-0 opacity-0"
            }`}
          >
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={muted ? 0 : volume}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                setVolume(v);
                if (v > 0) setMuted(false);
              }}
              className="w-full h-1 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-white
                [&::-webkit-slider-thumb]:shadow-[0_0_10px_hsl(var(--neon-purple)/0.6)]
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-runnable-track]:rounded-full"
              style={{
                background: `linear-gradient(to right, hsl(270, 95%, 65%) ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.08) ${(muted ? 0 : volume) * 100}%)`,
              }}
            />
          </div>
        </div>

        {/* Playlist — between Repeat and Volume */}
        <div className="relative">
          <button
            onClick={() => setShowPlaylist(!showPlaylist)}
            className={`w-8 h-8 rounded-[50%]
grid place-items-center transition-all duration-200 ${
              showPlaylist
                ? "text-neon-purple bg-neon-purple/10 shadow-[0_0_12px_-3px_hsl(var(--neon-purple)/0.3)]"
                : "text-white/25 hover:text-white/60 hover:bg-white/5"
            }`}
          >
            <ListMusic size={14} />
          </button>

          {showPlaylist && (
            <div
              className="absolute top-full right-0 mt-2 w-64 rounded-2xl overflow-hidden z-50"
              style={{
                background: "linear-gradient(135deg, rgba(10,10,15,0.75), rgba(10,10,15,0.50))",
                backdropFilter: "blur(48px) saturate(200%)",
                WebkitBackdropFilter: "blur(48px) saturate(200%)",
                border: "1px solid rgba(255,255,255,0.06)",
                boxShadow: "0 24px 64px -12px rgba(0,0,0,0.5)",
                animation: "dropdown-in 0.25s ease-out forwards",
              }}
            >
              <div className="px-4 pt-3 pb-2 border-b border-white/[0.08]">
                <p className="text-[10px] font-semibold text-white/60 uppercase tracking-[0.15em]">Playlist</p>
                <p className="text-[11px] text-white/40 mt-0.5">{playlist.length} tracks</p>
              </div>
              <div className="p-2 max-h-[260px] overflow-y-auto scrollbar-none">
                {playlist.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setTrackIdx(i);
                      if (!playing) {
                        setTimeout(() => {
                          audioRef.current?.play().then(() => setPlaying(true)).catch(() => {});
                        }, 0);
                      }
                      setShowPlaylist(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl
flex items-center gap-3 transition-all duration-200 ${
                      i === trackIdx
                        ? "bg-white/[0.08]"
                        : "hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-[50%]
grid place-items-center shrink-0 text-[10px] font-bold transition-all duration-200 ${
                      i === trackIdx
                        ? "bg-gradient-to-br from-violet-400 to-cyan-400 text-white"
                        : "text-white/40 bg-white/[0.08]"
                    }`}>
                      {i === trackIdx && playing ? (
                        <span className="flex gap-[2px] items-center">
                          <span className="w-0.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms", animationDuration: "0.6s" }} />
                          <span className="w-0.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms", animationDuration: "0.6s" }} />
                          <span className="w-0.5 h-2.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms", animationDuration: "0.6s" }} />
                        </span>
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12px] font-medium truncate leading-tight ${
                        i === trackIdx ? "text-white" : "text-white/70"
                      }`}>
                        {t.title}
                      </p>
                      <p className="text-[9px] text-white/40 truncate mt-0.5">{t.artist}</p>
                    </div>
                    {i === trackIdx && (
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#22d3ee", boxShadow: "0 0 8px rgba(6,182,212,0.6)" }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
