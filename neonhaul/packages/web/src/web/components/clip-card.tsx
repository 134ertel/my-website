import { Link } from "wouter";
import { Play, Download } from "lucide-react";
import { StatusBadge } from "./status-badge";

type Clip = {
  id: string;
  title: string;
  viralScore: number | null;
  category: string | null;
  status: string;
  thumbnailUrl?: string | null;
  downloadUrl?: string | null;
  startSeconds: number;
  endSeconds: number;
};

export function ClipCard({ clip }: { clip: Clip }) {
  return (
    <Link href={`/clips/${clip.id}`} className="glass-card group overflow-hidden p-3">
      <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-gradient-to-b from-[#151519] to-[#0e0e11]">
        {clip.thumbnailUrl ? (
          <img src={clip.thumbnailUrl} alt={clip.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Play className="h-8 w-8" />
          </div>
        )}
        <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-[#00E5FF] backdrop-blur">
          {clip.viralScore ?? 0}
        </div>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
          <Play className="h-6 w-6" />
        </div>
      </div>
      <p className="mt-2.5 line-clamp-2 text-sm font-medium">{clip.title}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs capitalize text-muted-foreground">{clip.category ?? "clip"}</span>
        <div className="flex items-center gap-2">
          <StatusBadge status={clip.status} />
          {clip.downloadUrl && (
            <a
              href={clip.downloadUrl}
              download
              onClick={(e) => e.stopPropagation()}
              title="Download clip"
              className="rounded-lg p-1 text-muted-foreground hover:bg-surface-strong hover:text-primary"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </Link>
  );
}
