"use client";
import { useEffect, useRef, useState, useCallback } from "react";

// =============================================================
// VideoPlayer — one player skin for both YouTube and self-hosted files.
//
// Why the YouTube path is built this way:
//   YouTube's normal iframe embed ALWAYS paints its own chrome — the title
//   bar, the channel avatar and a "Watch on YouTube" button. `modestbranding`
//   used to soften that but YouTube deprecated it, so no combination of URL
//   params removes it any more.
//
//   The only way to get a clean, "hosted here" look is the IFrame Player API
//   with controls=0, an overlay that swallows clicks on YouTube's own UI, and
//   our own control bar on top. That's what this does — so a YouTube-backed
//   lesson looks identical to an uploaded one.
//
//   Worth knowing: hiding YouTube's branding is against their Terms of
//   Service. Fine for private course content; don't ship it on a public
//   marketing page you care about.
// =============================================================

let ytApiPromise = null;

/** Load the IFrame API once, no matter how many players mount. */
function loadYouTubeApi() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

/** Extract a YouTube video id, or null. */
export function ytId(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([\w-]{6,})/);
  return m ? m[1] : null;
}

/** Extract a Vimeo id, or null. */
export function vimeoId(url) {
  const m = String(url || "").match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

const fmt = (s) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function VideoPlayer({ src, youtubeUrl, poster, watermark, accent = "#2E6EF7", onEnded }) {
  const vid = ytId(youtubeUrl || src);
  const isYt = !!vid;

  const wrapRef = useRef(null);
  const nativeRef = useRef(null);
  const ytRef = useRef(null);       // YT.Player instance
  const mountRef = useRef(null);    // div the API replaces
  const rafRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [vol, setVol] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [fs, setFs] = useState(false);
  const [showUi, setShowUi] = useState(true);
  const hideTimer = useRef(null);

  /* ---------------- YouTube ---------------- */
  useEffect(() => {
    if (!isYt) return;
    let killed = false;
    let player;

    loadYouTubeApi().then((YT) => {
      if (killed || !YT || !mountRef.current) return;
      player = new YT.Player(mountRef.current, {
        videoId: vid,
        playerVars: {
          controls: 0,          // we draw our own
          modestbranding: 1,
          rel: 0,               // no "more videos" grid at the end
          iv_load_policy: 3,    // no annotations
          fs: 0,
          disablekb: 1,
          playsinline: 1,
          origin: typeof window !== "undefined" ? window.location.origin : undefined
        },
        events: {
          onReady: (e) => {
            if (killed) return;
            ytRef.current = e.target;
            setDur(e.target.getDuration() || 0);
            setReady(true);
          },
          onStateChange: (e) => {
            if (killed) return;
            const S = window.YT.PlayerState;
            setPlaying(e.data === S.PLAYING);
            if (e.data === S.ENDED) onEnded?.();
            if (e.data === S.PLAYING) setDur(e.target.getDuration() || 0);
          }
        }
      });
    });

    return () => {
      killed = true;
      try { player?.destroy?.(); } catch { /* already gone */ }
      ytRef.current = null;
    };
  }, [isYt, vid, onEnded]);

  // Poll YouTube's clock — the API has no timeupdate event.
  useEffect(() => {
    if (!isYt || !ready) return;
    const tick = () => {
      const p = ytRef.current;
      if (p?.getCurrentTime) {
        setTime(p.getCurrentTime() || 0);
        const d = p.getDuration?.() || 0;
        if (d && Math.abs(d - dur) > 1) setDur(d);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isYt, ready, dur]);

  /* ---------------- unified controls ---------------- */
  const api = useCallback(() => {
    if (isYt) {
      const p = ytRef.current;
      if (!p) return null;
      return {
        play: () => p.playVideo(),
        pause: () => p.pauseVideo(),
        seek: (t) => p.seekTo(t, true),
        setVol: (v) => p.setVolume(v * 100),
        mute: (m) => (m ? p.mute() : p.unMute()),
        rate: (r) => p.setPlaybackRate(r)
      };
    }
    const v = nativeRef.current;
    if (!v) return null;
    return {
      play: () => v.play(),
      pause: () => v.pause(),
      seek: (t) => { v.currentTime = t; },
      setVol: (x) => { v.volume = x; },
      mute: (m) => { v.muted = m; },
      rate: (r) => { v.playbackRate = r; }
    };
  }, [isYt]);

  const toggle = () => {
    const a = api(); if (!a) return;
    playing ? a.pause() : a.play();
  };

  const onSeek = (e) => {
    const t = Number(e.target.value);
    setTime(t);
    api()?.seek(t);
  };

  const onVol = (e) => {
    const v = Number(e.target.value);
    setVol(v);
    setMuted(v === 0);
    api()?.setVol(v);
    api()?.mute(v === 0);
  };

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    api()?.mute(m);
  };

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    api()?.rate(next);
  };

  const toggleFs = () => {
    const el = wrapRef.current;
    if (!document.fullscreenElement) el?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };
  useEffect(() => {
    const h = () => setFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  // Auto-hide the control bar while playing.
  const poke = () => {
    setShowUi(true);
    clearTimeout(hideTimer.current);
    if (playing) hideTimer.current = setTimeout(() => setShowUi(false), 2600);
  };
  useEffect(() => { poke(); return () => clearTimeout(hideTimer.current); }, [playing]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts, like any real player.
  const onKey = (e) => {
    const a = api(); if (!a) return;
    if (e.key === " " || e.key === "k") { e.preventDefault(); toggle(); }
    else if (e.key === "ArrowRight") a.seek(Math.min(time + 5, dur));
    else if (e.key === "ArrowLeft") a.seek(Math.max(time - 5, 0));
    else if (e.key === "m") toggleMute();
    else if (e.key === "f") toggleFs();
    poke();
  };

  const pct = dur ? (time / dur) * 100 : 0;

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      onKeyDown={onKey}
      onMouseMove={poke}
      onContextMenu={(e) => e.preventDefault()}
      className="group relative aspect-video w-full select-none overflow-hidden rounded-2xl bg-black outline-none"
    >
      {/* ---- the media ---- */}
      {isYt ? (
        <>
          <div ref={mountRef} className="pointer-events-none absolute inset-0 h-full w-full" />
          {/* Swallows every click meant for YouTube's title bar / logo /
              "Watch on YouTube" button. Without this the branding is not
              just visible, it's clickable. */}
          <button
            type="button"
            aria-label={playing ? "Pause" : "Play"}
            onClick={toggle}
            onDoubleClick={toggleFs}
            className="absolute inset-0 h-full w-full cursor-default bg-transparent"
          />
        </>
      ) : (
        <video
          ref={nativeRef}
          src={src}
          poster={poster}
          playsInline
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          disableRemotePlayback
          onClick={toggle}
          onDoubleClick={toggleFs}
          onLoadedMetadata={(e) => { setDur(e.target.duration || 0); setReady(true); }}
          onTimeUpdate={(e) => setTime(e.target.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); onEnded?.(); }}
          className="absolute inset-0 h-full w-full"
        />
      )}

      {/* ---- centre play/pause ---- */}
      {(!playing || showUi) && (
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause" : "Play"}
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-transform hover:scale-105"
        >
          {playing ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" className="ml-1"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
      )}

      {watermark && <Watermark text={watermark} />}

      {/* ---- control bar ---- */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-2 pt-8 transition-opacity ${showUi ? "opacity-100" : "opacity-0"}`}
      >
        <input
          type="range" min={0} max={dur || 0} step="0.1" value={time} onChange={onSeek}
          aria-label="Seek"
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/25 accent-white
                     [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          style={{ background: `linear-gradient(to right, ${accent} ${pct}%, rgba(255,255,255,0.25) ${pct}%)` }}
        />

        <div className="mt-1.5 flex items-center gap-3 text-white">
          <Btn onClick={toggle} label={playing ? "Pause" : "Play"}>
            {playing
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
          </Btn>

          <Btn onClick={toggleMute} label={muted ? "Unmute" : "Mute"}>
            {muted || vol === 0
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5 6 9H3v6h3l5 4V5Z" /><line x1="17" y1="9" x2="22" y2="14" /><line x1="22" y1="9" x2="17" y2="14" /></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5 6 9H3v6h3l5 4V5Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /></svg>}
          </Btn>

          <input
            type="range" min={0} max={1} step="0.05" value={muted ? 0 : vol} onChange={onVol}
            aria-label="Volume"
            className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/25
                       [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
          />

          <span className="font-mono text-xs tabular-nums text-white/85">{fmt(time)} / {fmt(dur)}</span>

          <div className="ml-auto flex items-center gap-3">
            <button type="button" onClick={cycleSpeed}
              className="rounded px-1.5 py-0.5 text-xs font-bold hover:bg-white/15" aria-label="Playback speed">
              {speed}x
            </button>
            <Btn onClick={toggleFs} label={fs ? "Exit full screen" : "Full screen"}>
              {fs
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" /></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function Btn({ onClick, label, children }) {
  return (
    <button type="button" onClick={onClick} aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded hover:bg-white/15">
      {children}
    </button>
  );
}

/** Drifting watermark — moves so it can't be cropped out of a recording. */
function Watermark({ text }) {
  const [i, setI] = useState(0);
  const spots = [{ x: 6, y: 10 }, { x: 60, y: 10 }, { x: 60, y: 72 }, { x: 6, y: 72 }, { x: 33, y: 42 }];
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % spots.length), 6000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const p = spots[i];
  return (
    <div aria-hidden="true"
      className="pointer-events-none absolute select-none rounded px-2 py-1 font-mono text-[11px] tracking-wide transition-all duration-1000"
      style={{
        left: `${p.x}%`, top: `${p.y}%`,
        color: "rgba(255,255,255,0.5)",
        textShadow: "0 1px 3px rgba(0,0,0,0.9)",
        mixBlendMode: "difference"
      }}>
      {text}
    </div>
  );
}