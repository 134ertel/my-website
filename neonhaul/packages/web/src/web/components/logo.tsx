import { Scissors } from "lucide-react";

const SIZES = {
  sm: { box: "h-6 w-6", icon: "h-3.5 w-3.5", text: "text-sm" },
  md: { box: "h-8 w-8", icon: "h-4 w-4", text: "text-lg" },
  lg: { box: "h-9 w-9", icon: "h-5 w-5", text: "text-xl" },
};

export function Logo({ size = "md", withText = true }: { size?: keyof typeof SIZES; withText?: boolean }) {
  const s = SIZES[size];
  return (
    <div className="flex items-center gap-2">
      <div className={`relative flex ${s.box} shrink-0 items-center justify-center rounded-xl bg-gradient-neon shadow-[0_0_18px_rgba(0,229,255,0.35)]`}>
        <Scissors className={`${s.icon} -rotate-45 text-black`} strokeWidth={2.5} />
      </div>
      {withText && <span className={`font-display font-bold tracking-tight ${s.text}`}>Clipzy</span>}
    </div>
  );
}
