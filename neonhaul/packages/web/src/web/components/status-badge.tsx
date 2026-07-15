const COLORS: Record<string, string> = {
  uploaded: "bg-surface-strong text-foreground",
  downloading: "bg-[#00E5FF]/15 text-[#00E5FF]",
  transcribing: "bg-[#00E5FF]/15 text-[#00E5FF]",
  analyzing: "bg-[#8A2EFF]/15 text-[#8A2EFF]",
  editing: "bg-[#8A2EFF]/15 text-[#8A2EFF]",
  rendering: "bg-[#FF2ED1]/15 text-[#FF2ED1]",
  posting: "bg-[#FF2ED1]/15 text-[#FF2ED1]",
  completed: "bg-[#2EFFB0]/15 text-[#2EFFB0]",
  posted: "bg-[#2EFFB0]/15 text-[#2EFFB0]",
  scheduled: "bg-[#FFC72E]/15 text-[#FFC72E]",
  failed: "bg-[#FF4D4D]/15 text-[#FF4D4D]",
  cancelled: "bg-surface-strong text-muted-foreground",
  queued: "bg-surface-strong text-foreground",
  connected: "bg-[#2EFFB0]/15 text-[#2EFFB0]",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium capitalize ${COLORS[status] ?? "bg-surface-strong text-foreground"}`}>
      {status}
    </span>
  );
}
