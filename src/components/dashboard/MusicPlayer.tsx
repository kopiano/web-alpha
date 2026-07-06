import { memo, useState, useRef, useEffect, useCallback } from "react";
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
import { getMusic } from "@/api/music";

interface Track {
  title: string;
  artist: string;
  file: string;
}

function musicFileUrl(file: string) {
  const base = import.meta.env.VITE_API_URL?.replace(/\/api\/v1\/?$/, "") || "";
  return `${base}/api/v1/music/file/${encodeURIComponent(file)}`;
}

function getMusicPositionKey(trackFile: string) {
  return `music-position:${trackFile}`;
}

const playerGlassStyle = {
  background: "#ffffff24",
  backdropFilter: "blur(32px) saturate(200%)",
  WebkitBackdropFilter: "blur(32px) saturate(200%)",
  border: "1px solid hsl(0 0% 100% / .22)",
};

const playlistPanelStyle = {
  background: "rgba(255,255,255,0.03)",
  backdropFilter: "blur(56px) saturate(220%)",
  WebkitBackdropFilter: "blur(56px) saturate(220%)",
  border: "1px solid rgba(255,255,255,0.14)",
  boxShadow: "0 20px 56px -14px rgba(0,0,0,0.42), inset 0 1px 0 rgba(255,255,255,0.06)",
  isolation: "isolate",
  transform: "translateZ(0)",
  willChange: "transform, opacity",
  backfaceVisibility: "hidden",
  contain: "layout paint style",
} as const;

const playlistHeaderStyle = {
  background: "rgba(255,255,255,0.03)",
} as const;

const playlistToggleStyle = {
  background: "rgba(255,255,255,0.14)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "rgba(255,255,255,0.80)",
} as const;

const playlistToggleIdleStyle = {
  background: "transparent",
  backdropFilter: "none",
  WebkitBackdropFilter: "none",
  border: "none",
  color: "rgba(255,255,255,0.30)",
} as const;

/* ─── Marquee text ─── */
const MarqueeLine = ({ title, artist }: { title: string; artist: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const text = `${title}  ·  ${artist}`;

  useEffect(() => {
    const container = containerRef.current;
    const span = container?.querySelector<HTMLSpanElement>(".marquee-text");
    if (!container || !span) return;
    const overflow = span.scrollWidth - container.clientWidth;
    span.style.setProperty("--scroll-end", overflow > 0 ? `-${overflow + 24}px` : "-22%");
  }, [title, artist]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden whitespace-nowrap"
      title={text}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <style>{`
        @keyframes marquee-scroll {
          0%   { transform: translateX(0); }
          15%  { transform: translateX(0); }
          100% { transform: translateX(var(--scroll-end, -50%)); }
        }
      `}</style>
      <span
        className="marquee-text inline-block text-[11px] font-semibold leading-tight"
        style={{
          whiteSpace: "nowrap",
          animation: hovered ? "marquee-scroll 8s ease-in-out infinite" : "none",
        }}
      >
        <span style={{ color: "rgba(255,255,255,0.9)" }}>{title}</span>
        <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 6px" }}>·</span>
        <span style={{ color: "rgba(255,255,255,0.45)" }}>{artist}</span>
      </span>
    </div>
  );
};

export const MusicPlayer = () => {
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [showVolume, setShowVolume] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("music-player-collapsed") === "1"; } catch { return false; }
  });
  const [trackIdx, setTrackIdx] = useState(() => {
    try { return parseInt(localStorage.getItem("music-track") || "0") || 0; } catch { return 0; }
  });


  useEffect(() => {
    getMusic().then((res) => {
      const data = res.data?.data || res.data || [];
      setPlaylist(Array.isArray(data) ? data : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    try { localStorage.setItem("music-player-collapsed", collapsed ? "1" : "0"); } catch {}
  }, [collapsed]);

  const audioRef = useRef<HTMLAudioElement>(new Audio());
  const playlistRef = useRef<Track[]>([]);
  const trackIdxRef = useRef(0);
  const playRequestRef = useRef(0);
  const skipRestoreRef = useRef(false);

  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => { trackIdxRef.current = trackIdx; try { localStorage.setItem("music-track", String(trackIdx)); } catch {} }, [trackIdx]);

  useEffect(() => {
    const audio = audioRef.current;
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";

    const onLoaded = () => setDuration(audio.duration || 0);
    const onProgress = () => {
      const d = audio.duration;
      if (!d || !isFinite(d)) {
        setBuffered(0);
        return;
      }
      try {
        const ranges = audio.buffered;
        if (!ranges || ranges.length === 0) {
          setBuffered(0);
          return;
        }
        const end = ranges.end(ranges.length - 1);
        setBuffered(Math.max(0, Math.min(1, end / d)));
      } catch {
        setBuffered(0);
      }
    };
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
    const onTime = () => {
      setCurrentTime(audio.currentTime);
      const current = playlistRef.current[trackIdxRef.current];
      if (!current) return;
      try { localStorage.setItem(getMusicPositionKey(current.file), String(Math.floor(audio.currentTime))); } catch {}
    };
    const onDur = () => setDuration(audio.duration || 0);

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("progress", onProgress);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("durationchange", onDur);

    return () => {
      audio.pause();
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("progress", onProgress);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("durationchange", onDur);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    const t = playlist[trackIdx];
    if (!audio || !t) return;
    playRequestRef.current += 1;
    audio.src = musicFileUrl(t.file);
    audio.load();
    setCurrentTime(0);
    setDuration(0);
    setBuffered(0);
    const shouldSkipRestore = skipRestoreRef.current;
    skipRestoreRef.current = false;
    const savedTime = shouldSkipRestore ? 0 : (() => {
      try { return parseInt(localStorage.getItem(getMusicPositionKey(t.file)) || "0") || 0; } catch { return 0; }
    })();
    if (savedTime > 0) {
      const restore = () => {
        try {
          audio.currentTime = Math.min(savedTime, Math.max(0, (audio.duration || 0) - 1));
        } catch {}
      };
      if (audio.readyState >= 1) {
        restore();
      } else {
        audio.addEventListener("loadedmetadata", restore, { once: true });
      }
    }
    if (playing) {
      const requestId = ++playRequestRef.current;
      void audio.play().catch(() => {
        if (requestId === playRequestRef.current) setPlaying(false);
      });
    }
  }, [trackIdx, playlist]);

  useEffect(() => {
    const nextTrack = playlist[(trackIdx + 1) % playlist.length];
    if (!playlist.length || !playing || !nextTrack) return;
    const controller = new AbortController();
    void fetch(musicFileUrl(nextTrack.file), {
      method: "GET",
      signal: controller.signal,
      cache: "force-cache",
      credentials: "include",
      keepalive: true,
    }).catch(() => {});
    return () => controller.abort();
  }, [trackIdx, playing, playlist]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      playRequestRef.current += 1;
      audio.pause();
      setPlaying(false);
      return;
    }
    const requestId = ++playRequestRef.current;
    setPlaying(true);
    const start = async () => {
      try {
        if (requestId !== playRequestRef.current) return;
        await audio.play();
      } catch {
        if (requestId === playRequestRef.current) setPlaying(false);
      }
    };
    void start();
  }, [playing]);

  const handlePrev = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !playlist.length) return;
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    audio.currentTime = 0;
    playRequestRef.current += 1;
    skipRestoreRef.current = true;
    setTrackIdx((prev) => (prev === 0 ? playlist.length - 1 : prev - 1));
  }, [playlist.length]);

  const handleNext = useCallback(() => {
    if (!playlist.length) return;
    const audio = audioRef.current;
    if (audio) audio.currentTime = 0;
    playRequestRef.current += 1;
    skipRestoreRef.current = true;
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
    if (audio && duration > 0) audio.currentTime = ratio * duration;
  };

  /* ─── Apple-style spring animation ─── */
  const spring = "cubic-bezier(0.32, 0.72, 0, 1)";

  const doCollapse = useCallback(() => { setCollapsed(true); }, []);
  const doExpand = useCallback(() => { setCollapsed(false); }, []);
  const togglePlaylist = useCallback(() => { setShowPlaylist((v) => !v); }, []);
  const handleTrackSelect = useCallback((index: number) => {
    setTrackIdx(index);
    setShowPlaylist(false);
  }, []);

  if (!playlist.length) return null;
  const track = playlist[trackIdx];
  if (!track) return null;

  // Unused animation state removed

  const playlistPanel = (
    <PlaylistDropdown
      playlist={playlist}
      trackIdx={trackIdx}
      playing={playing}
      onSelectTrack={handleTrackSelect}
    />
  );

  return (
    <>
      <style>{`@keyframes logo-gradient-shift{0%{background-position:0% 0%}100%{background-position:100% 100%}}`}</style>

      {/* Collapsed button — slides in from right */}
      <div style={{
        position: "fixed", top: "23px", right: collapsed ? "150px" : "16px", zIndex: 5000,
        opacity: collapsed ? 1 : 0,
        pointerEvents: collapsed ? "auto" : "none",
        transition: "right 0.6s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.5s ease 0.1s",
      }}>
        <button onClick={doExpand} className="w-11 h-11 grid place-items-center"
          style={{ ...playerGlassStyle, borderRadius: "3rem", boxShadow: "0 8px 24px -6px rgba(0,0,0,0.3)" }}>
          <div className={playing ? "animate-spin-slow" : ""}>
            <Music size={20} className="text-white/70" />
          </div>
        </button>
      </div>

      {/* Expanded player — scales toward left on collapse */}
      <div style={{
        position: "fixed", left: "calc(50% - 250px)", top: "23px", zIndex: 5000,
        opacity: collapsed ? 0 : 1,
        pointerEvents: collapsed ? "none" : "auto",
        transformOrigin: "left center",
        transform: collapsed ? "scale(0.08) translateX(120px)" : "scale(1) translateX(0)",
        transition: "transform 0.65s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.45s ease",
      }}>
        <div className="noise px-4 flex items-center gap-4 shadow-[0_20px_60px_-10px rgba(0,0,0,0.7)]"
          style={{ ...playerGlassStyle, borderRadius: "3rem" }}>
        {/* Album art */}
        <button onClick={doCollapse} className="shrink-0 focus:outline-none -ml-1.5">
          <div className="w-11 h-11 rounded-[50%] grid place-items-center shrink-0"
            style={playing ? {
              background: "linear-gradient(135deg, rgba(147,51,234,0.35), rgba(79,70,229,0.25), rgba(14,165,233,0.35), rgba(236,72,153,0.25), rgba(168,85,247,0.30))",
              backgroundSize: "200% 200%",
              animation: "logo-gradient-shift 3s ease-in-out infinite alternate",
              backdropFilter: "blur(20px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.22)",
              boxShadow: "0 0 28px -6px rgba(147,51,234,0.25), 0 0 28px -6px rgba(14,165,233,0.20), inset 0 1px 0 rgba(255,255,255,0.15)",
            } : {
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(20px) saturate(180%)",
              border: "1px solid rgba(255,255,255,0.15)",
              boxShadow: "0 4px 24px -8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}>
            <div className={playing ? "animate-spin-slow" : ""}>
              <Music size={20} className="text-white/90" />
            </div>
          </div>
        </button>

        <div className="min-w-0 w-36 flex flex-col justify-center" style={{opacity:collapsed?0:1,transition:"opacity 0.4s ease 0.05s"}}>
          <MarqueeLine title={track.title} artist={track.artist} />
          <div className="relative mt-1 h-4 rounded-full cursor-pointer group" onClick={seek}>
            <div className="absolute inset-y-1/2 left-0 right-0 -translate-y-1/2 h-[3px] rounded-full bg-white/[0.10] overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-white/20 transition-[width] duration-500 ease-out"
                style={{
                  width: `${buffered * 100}%`,
                  boxShadow: "0 0 10px rgba(255,255,255,0.18)",
                }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${progress * 100}%`,
                  transition: "width 0.25s linear",
                  background: "linear-gradient(90deg, rgba(59,130,246,0.95), rgba(168,85,247,0.95), rgba(244,114,182,0.95))",
                  boxShadow: "0 0 14px rgba(59,130,246,0.35), 0 0 24px rgba(168,85,247,0.18)",
                }}
              />
              <div
                className="absolute top-0 bottom-0 rounded-full animate-pulse"
                style={{
                  left: 0,
                  width: `${Math.max(2, buffered * 100)}%`,
                  background: "linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.16), rgba(255,255,255,0.04))",
                  filter: "blur(0.2px)",
                  opacity: buffered > 0 ? 1 : 0,
                  transition: "opacity 0.2s ease",
                }}
              />
            </div>
            <span
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.95)] pointer-events-none"
              style={{
                left: `${Math.min(100, Math.max(0, progress * 100))}%`,
                opacity: progress > 0 ? 1 : 0,
                zIndex: 30,
                transition: "left 0.25s linear, opacity 0.2s ease",
              }}
            />
          </div>
          <div className="flex justify-between mt-0.5">
            <span className="text-[8px] text-white/25 tabular-nums">{formatTime(currentTime)}</span>
            <span className="text-[8px] text-white/25 tabular-nums">{formatTime(duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1" style={{opacity:collapsed?0:1,transition:"opacity 0.4s ease 0.1s"}}>
          <button onClick={handlePrev} className="w-8 h-8 rounded-[50%] grid place-items-center" style={{color:"rgba(255,255,255,0.30)"}}>
            <SkipBack size={14} />
          </button>
          <button onClick={togglePlay}
            className="w-9 h-9 rounded-full grid place-items-center transition-all duration-300 hover:scale-105 active:scale-95"
            style={{
              background: playing ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.06)",
              backdropFilter: "blur(20px) saturate(180%)",
              border: playing ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.08)",
              boxShadow: playing ? "0 8px 32px -8px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.08)" : "0 2px 8px -4px rgba(0,0,0,0.15)",
            }}>
            {playing ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" className="ml-0.5" />}
          </button>
          <button onClick={handleNext} className="w-8 h-8 rounded-[50%] grid place-items-center" style={{color:"rgba(255,255,255,0.30)"}}>
            <SkipForward size={14} />
          </button>
        </div>

        <div className="relative flex items-center" style={{opacity:collapsed?0:1,transition:"opacity 0.4s ease 0.15s"}}
          onMouseEnter={() => setShowVolume(true)} onMouseLeave={() => setShowVolume(false)}>
          <button onClick={() => setMuted(!muted)} className="w-8 h-8 rounded-[50%] grid place-items-center" style={{color:"rgba(255,255,255,0.30)"}}>
            {muted || volume === 0 ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <div className={`overflow-hidden transition-all duration-300 ${showVolume ? "w-24 ml-2 opacity-100" : "w-0 opacity-0"}`}>
            <input type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume}
              onChange={e => { const v=parseFloat(e.target.value); setVolume(v); if(v>0) setMuted(false); }}
              className="w-full h-1 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
              style={{background:`linear-gradient(to right, rgba(255,255,255,0.45) ${(muted?0:volume)*100}%, rgba(255,255,255,0.08) ${(muted?0:volume)*100}%)`}} />
          </div>
        </div>

        <div className="relative" style={{opacity:collapsed?0:1,transition:"opacity 0.4s ease 0.2s"}}>
          <button onClick={togglePlaylist}
            className="w-8 h-8 rounded-[50%] grid place-items-center"
            style={showPlaylist ? playlistToggleStyle : playlistToggleIdleStyle}>
            <ListMusic size={14} />
          </button>
          {showPlaylist && (
            <div
              className="absolute top-full right-0 mt-5 w-64 rounded-[2rem] overflow-hidden z-50"
              style={playlistPanelStyle}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "linear-gradient(180deg, rgba(255,255,255,0.11), rgba(255,255,255,0.03) 35%, rgba(255,255,255,0.00) 100%)",
                }}
              />
              <div className="px-4 pt-3 pb-2 border-b border-white/[0.08]" style={playlistHeaderStyle}>
                <p className="text-[10px] font-semibold text-white/58 uppercase tracking-[0.15em]">Playlist</p>
                <p className="text-[11px] text-white/38 mt-0.5">{playlist.length} tracks</p>
              </div>
              <div className="p-2 max-h-[260px] overflow-y-auto scrollbar-none">
                {playlistPanel}
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </>
  );
};

const PlaylistDropdown = memo(function PlaylistDropdown({
  playlist,
  trackIdx,
  playing,
  onSelectTrack,
}: {
  playlist: Track[];
  trackIdx: number;
  playing: boolean;
  onSelectTrack: (index: number) => void;
}) {
  return (
    <>
      {playlist.map((t, i) => (
        <button
          key={t.file || `${t.title}-${i}`}
          onClick={() => onSelectTrack(i)}
          className={`w-full text-left px-3 py-2.5 rounded-[1.1rem] flex items-center gap-3 transition-all duration-200 ${
            i === trackIdx ? "bg-white/[0.10]" : "hover:bg-white/[0.05]"
          }`}
        >
          <div className={`w-7 h-7 rounded-[50%] grid place-items-center shrink-0 text-[10px] font-bold ${
            i === trackIdx ? "bg-white/20 text-white" : "text-white/40 bg-white/[0.08]"
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
            <p className={`text-[12px] font-medium truncate leading-tight ${i === trackIdx ? "text-white" : "text-white/70"}`}>{t.title}</p>
            <p className="text-[9px] text-white/40 truncate mt-0.5">{t.artist}</p>
          </div>
          {i === trackIdx && (
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: "rgba(255,255,255,0.55)", boxShadow: "0 0 6px rgba(255,255,255,0.2)" }}
            />
          )}
        </button>
      ))}
    </>
  );
});
