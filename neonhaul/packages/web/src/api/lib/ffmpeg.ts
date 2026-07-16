import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { registerProcess, unregisterProcess } from "./cancellation";

export function tmpDir(prefix: string) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
  return dir;
}

export function run(cmd: string, args: string[], opts?: { cwd?: string; cancelKey?: string }): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"], cwd: opts?.cwd });
    if (opts?.cancelKey) registerProcess(opts.cancelKey, proc);
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d) => (stdout += d.toString()));
    proc.stderr.on("data", (d) => (stderr += d.toString()));
    proc.on("close", (code) => {
      if (opts?.cancelKey) unregisterProcess(opts.cancelKey);
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exited with code ${code}: ${stderr.slice(-2000)}`));
    });
    proc.on("error", reject);
  });
}

export async function getDurationSeconds(filePath: string): Promise<number> {
  const { stdout } = await run("ffprobe", [
    "-v", "error",
    "-show_entries", "format=duration",
    "-of", "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  return parseFloat(stdout.trim()) || 0;
}

export async function extractAudio(videoPath: string, outPath: string) {
  await run("ffmpeg", ["-y", "-i", videoPath, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", outPath]);
}

let cookiesFilePath: string | null | undefined;

/** Writes YOUTUBE_COOKIES_B64 (a base64-encoded Netscape-format cookies.txt) to a tmp file
 * once per process, so yt-dlp can authenticate as a real logged-in account. Without this,
 * YouTube blocks most requests from datacenter/server IPs with a "sign in to confirm you're
 * not a bot" error. Returns null if the env var isn't set. */
function getYoutubeCookiesFile(): string | null {
  if (cookiesFilePath !== undefined) return cookiesFilePath;
  const b64 = process.env.YOUTUBE_COOKIES_B64;
  if (!b64) {
    cookiesFilePath = null;
    return null;
  }
  const filePath = path.join(os.tmpdir(), "youtube-cookies.txt");
  fs.writeFileSync(filePath, Buffer.from(b64, "base64"));
  cookiesFilePath = filePath;
  return filePath;
}

function cookiesArgs(): string[] {
  const file = getYoutubeCookiesFile();
  return file ? ["--cookies", file] : [];
}

export async function downloadYoutube(url: string, outPath: string, cancelKey?: string) {
  // yt-dlp is available in the sandbox base image
  await run("yt-dlp", [...cookiesArgs(), "-f", "mp4/best", "-o", outPath, url], { cancelKey });
}

/** Reads a YouTube video's duration from metadata only, without downloading it. */
export async function getYoutubeDurationSeconds(url: string): Promise<number> {
  const { stdout } = await run("yt-dlp", [...cookiesArgs(), "--no-warnings", "--print", "%(duration)s", "--skip-download", url]);
  const seconds = parseFloat(stdout.trim());
  return Number.isFinite(seconds) ? seconds : 0;
}

/** Escapes text for use inside an ASS caption line. */
function assEscape(text: string) {
  return text.replace(/\\/g, "\\\\").replace(/\n/g, "\\N").replace(/{/g, "\\{").replace(/}/g, "\\}");
}

export type CaptionWord = { word: string; start: number; end: number };
export type EmojiOverlay = { emoji: string; position: string };

/** Converts a "#RRGGBB" (or "RRGGBB") web color to ASS's "BBGGRR" byte order (no &H prefix). */
function hexToBgr(hex: string) {
  const clean = hex.replace("#", "");
  const r = clean.slice(0, 2), g = clean.slice(2, 4), b = clean.slice(4, 6);
  return `${b}${g}${r}`.toUpperCase();
}

type CaptionStyleDef = {
  fontName: string;
  fontSize: number;
  primary: string; // "#RRGGBB", the static word color
  highlight: string; // "#RRGGBB", the color the active/spoken word pops to
  wordsPerGroup: number; // how many words are on screen at once
  uppercase: boolean;
  borderStyle: 1 | 3; // 1 = outlined text, 3 = solid background box
  outlineWidth: number;
  shadow: number;
  boxColor?: string; // "#RRGGBB", only used when borderStyle is 3
};

// Each style varies structurally (grouping size, case, outline vs. box, weight) — not just color —
// so switching styles actually changes how the captions look, not just their tint.
const CAPTION_STYLES: Record<string, CaptionStyleDef> = {
  // Balanced default: 3 words at a time, all caps, clean thin outline, cyan pop.
  modern: {
    fontName: "Sora", fontSize: 20, primary: "#F5F6F8", highlight: "#00E5FF",
    wordsPerGroup: 3, uppercase: true, borderStyle: 1, outlineWidth: 5, shadow: 2,
  },
  // Bigger, bolder, thicker outline, pink pop — high-energy edit look.
  gaming: {
    fontName: "Sora", fontSize: 25, primary: "#FFFFFF", highlight: "#FF2ED1",
    wordsPerGroup: 3, uppercase: true, borderStyle: 1, outlineWidth: 9, shadow: 3,
  },
  // Subtitle-like: longer lines, normal sentence case, thin outline, subtle blue pop.
  podcast: {
    fontName: "Inter", fontSize: 17, primary: "#F5F6F8", highlight: "#00E5FF",
    wordsPerGroup: 7, uppercase: false, borderStyle: 1, outlineWidth: 3, shadow: 1,
  },
  // Longer lines, sentence case, no color pop at all — deliberately understated.
  minimal: {
    fontName: "Inter", fontSize: 16, primary: "#FFFFFF", highlight: "#FFFFFF",
    wordsPerGroup: 6, uppercase: false, borderStyle: 1, outlineWidth: 2, shadow: 0,
  },
  // Classic single-word bursts, huge, thick black outline, bright yellow pop.
  mrbeast: {
    fontName: "Sora", fontSize: 32, primary: "#FFFFFF", highlight: "#FFE500",
    wordsPerGroup: 1, uppercase: true, borderStyle: 1, outlineWidth: 11, shadow: 4,
  },
  // Classic solid black box behind bold white text, one/two words at a time, cyan pop.
  hormozi: {
    fontName: "Sora", fontSize: 26, primary: "#FFFFFF", highlight: "#00E5FF",
    wordsPerGroup: 2, uppercase: true, borderStyle: 3, outlineWidth: 8, shadow: 0, boxColor: "#000000",
  },
};

// Font used for emoji overlay glyphs. Note: this ffmpeg build's subtitle burn-in only
// renders emoji as monochrome outline shapes (no color layers), regardless of font.
const EMOJI_FONT = "Segoe UI Emoji";

const EMOJI_POSITIONS: Record<string, [number, number]> = {
  "top-left": [120, 150],
  "top-center": [540, 150],
  "top-right": [960, 150],
  center: [540, 960],
  "bottom-left": [120, 1750],
  "bottom-center": [540, 1750],
  "bottom-right": [960, 1750],
};

// ASS numpad-style alignment (2=bottom-center, 5=middle-center, 8=top-center) plus the
// vertical margin used with it. MarginV is measured from whichever edge the alignment
// anchors to; it's irrelevant for the vertically-centered "middle" alignment.
const CAPTION_POSITIONS: Record<string, { alignment: number; marginV: number }> = {
  top: { alignment: 8, marginV: 150 },
  middle: { alignment: 5, marginV: 0 },
  bottom: { alignment: 2, marginV: 220 },
};

/** Builds an .ass subtitle file with animated word-by-word karaoke-style highlighting, relative to clip start. */
export function buildAssCaptions(
  words: CaptionWord[],
  clipStart: number,
  clipEnd: number,
  style: string,
  outPath: string,
  opts?: { fontSize?: number; emojis?: EmojiOverlay[]; position?: string },
) {
  const s = CAPTION_STYLES[style] ?? CAPTION_STYLES.modern;
  const fontSize = opts?.fontSize ?? s.fontSize;
  const { alignment, marginV } = CAPTION_POSITIONS[opts?.position ?? "bottom"] ?? CAPTION_POSITIONS.bottom;
  const primaryAss = `&H00${hexToBgr(s.primary)}`;
  const outlineAss = s.borderStyle === 3 ? `&H00${hexToBgr(s.boxColor ?? "#000000")}` : "&H00000000";
  const backAss = s.borderStyle === 3 ? `&H00${hexToBgr(s.boxColor ?? "#000000")}` : "&H64000000";
  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${s.fontName},${fontSize * 2},${primaryAss},${primaryAss},${outlineAss},${backAss},1,0,0,0,100,100,0,0,${s.borderStyle},${s.outlineWidth},${s.shadow},${alignment},60,60,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const filtered = words.filter((w) => w.start >= clipStart && w.start <= clipEnd);
  const groups: CaptionWord[][] = [];
  let cur: CaptionWord[] = [];
  for (const w of filtered) {
    cur.push(w);
    if (cur.length >= s.wordsPerGroup) {
      groups.push(cur);
      cur = [];
    }
  }
  if (cur.length) groups.push(cur);

  const fmtTime = (t: number) => {
    const rel = Math.max(0, t - clipStart);
    const h = Math.floor(rel / 3600);
    const m = Math.floor((rel % 3600) / 60);
    const sec = (rel % 60).toFixed(2).padStart(5, "0");
    return `${h}:${m.toString().padStart(2, "0")}:${sec}`;
  };

  // One Dialogue line per word within each group, so the active word visibly pops in the
  // highlight color while it's being "spoken" and the rest of the group stays in primary.
  const highlightTag = `{\\1c&H${hexToBgr(s.highlight)}&}`;
  const primaryTag = `{\\1c${primaryAss.slice(3)}&}`;
  const lines: string[] = [];
  for (const group of groups) {
    for (let j = 0; j < group.length; j++) {
      const activeStart = group[j].start;
      const activeEnd = j < group.length - 1 ? group[j + 1].start : group[j].end;
      const text = group
        .map((w, i) => {
          const word = assEscape(w.word.trim());
          const cased = s.uppercase ? word.toUpperCase() : word;
          return i === j ? `${highlightTag}${cased}${primaryTag}` : cased;
        })
        .join(" ");
      lines.push(`Dialogue: 0,${fmtTime(activeStart)},${fmtTime(activeEnd)},Default,,0,0,0,,${text}`);
    }
  }

  const emojiLines = (opts?.emojis ?? []).map(({ emoji, position }) => {
    const [x, y] = EMOJI_POSITIONS[position] ?? EMOJI_POSITIONS.center;
    return `Dialogue: 1,${fmtTime(clipStart)},${fmtTime(clipEnd)},Default,,0,0,0,,{\\fn${EMOJI_FONT}\\fs120\\pos(${x},${y})}${assEscape(emoji)}`;
  });

  fs.writeFileSync(outPath, header + [...lines, ...emojiLines].join("\n"));
}

const COLOR_FILTERS: Record<string, string> = {
  none: "",
  bw: "eq=saturation=0:contrast=1.1",
  vintage: "curves=vintage",
  vibrant: "eq=saturation=1.6:contrast=1.15",
  cinematic: "curves=preset=darker,eq=saturation=0.9",
};

// Vertical (9:16) output sizes. The .ass caption file always declares a 1080x1920 PlayRes;
// libass scales positions/font sizes to whatever the actual output frame size is, so no
// caption/emoji coordinates need to change when the target resolution changes.
const RESOLUTIONS: Record<string, [number, number]> = {
  "720p": [720, 1280],
  "1080p": [1080, 1920],
  "1440p": [1440, 2560],
};

/**
 * Cuts [start,end] from sourcePath, center-crops/scales to a vertical resolution, burns captions, outputs mp4 at outPath.
 */
export async function renderVerticalClip(opts: {
  sourcePath: string;
  start: number;
  end: number;
  assPath?: string;
  outPath: string;
  filter?: string;
  resolution?: string;
  cancelKey?: string;
}) {
  const { sourcePath, start, end, assPath, outPath, filter, resolution, cancelKey } = opts;
  const duration = end - start;
  const [w, h] = RESOLUTIONS[resolution ?? "1080p"] ?? RESOLUTIONS["1080p"];
  // ffmpeg's subtitles filter splits its option string on ':', which breaks on a
  // Windows drive-letter colon no matter how it's escaped/quoted. Run with cwd set
  // to the caption file's directory and reference it by bare filename to avoid the
  // colon (and any path separators) reaching the filter string entirely.
  const vf = [
    `scale=${w}:${h}:force_original_aspect_ratio=increase`,
    `crop=${w}:${h}`,
    filter ? COLOR_FILTERS[filter] || null : null,
    assPath ? `subtitles=${path.basename(assPath)}` : null,
  ].filter(Boolean).join(",");

  await run("ffmpeg", [
    "-y",
    "-ss", String(start),
    "-i", sourcePath,
    "-t", String(duration),
    "-vf", vf,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "21",
    "-threads", "2",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", "128k",
    "-movflags", "+faststart",
    outPath,
  ], { cwd: assPath ? path.dirname(assPath) : undefined, cancelKey });
}

export async function extractThumbnail(videoPath: string, atSeconds: number, outPath: string) {
  await run("ffmpeg", ["-y", "-ss", String(atSeconds), "-i", videoPath, "-frames:v", "1", outPath]);
}
