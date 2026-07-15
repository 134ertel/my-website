import { useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

/**
 * Custom vertical video player. Native <video controls> collapses buttons into a "..." overflow
 * menu when the player is narrow (common for 9:16 clips), which can swallow play/pause clicks.
 * This uses a always-visible custom play/pause + mute button instead of relying on native controls.
 */
export function ClipPlayer({ src, className = "" }: { src: string; className?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  return (
    <div className={`group relative overflow-hidden bg-black ${className}`} onClick={toggle}>
      <video
        ref={videoRef}
        src={src}
        className="h-full w-full object-contain"
        playsInline
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />

      {!playing && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 backdrop-blur">
            <Play className="ml-1 h-6 w-6 text-white" fill="white" />
          </div>
        </div>
      )}

      <button
        onClick={toggleMute}
        className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className="absolute bottom-3 left-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" fill="white" />}
      </button>
    </div>
  );
}
