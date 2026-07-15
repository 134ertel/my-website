import { generateText } from "ai";
import dedent from "dedent";
import { gateway } from "./gateway";
import type { TranscriptSegment } from "../lib/transcribe";

export type ViralMoment = {
  startSeconds: number;
  endSeconds: number;
  title: string;
  hook: string;
  description: string;
  hashtags: string[];
  category: "funny" | "emotional" | "educational" | "gaming" | "podcast" | "interview" | "other";
  viralScore: number;
};

function transcriptToPrompt(segments: TranscriptSegment[]) {
  return segments.map((s) => `[${s.start.toFixed(1)}-${s.end.toFixed(1)}] ${s.text}`).join("\n");
}

export async function detectViralMoments(
  segments: TranscriptSegment[],
  totalDuration: number,
): Promise<ViralMoment[]> {
  const transcriptText = transcriptToPrompt(segments);

  const { text } = await generateText({
    model: gateway("anthropic/claude-sonnet-4.6"),
    prompt: dedent`
      You are Clipzy's AI clip-detection engine. You analyze a full video transcript (with timestamps in
      seconds) and find the best moments to turn into short vertical clips (15-60s each) for TikTok, YouTube
      Shorts, and Instagram Reels.

      Find funny moments, emotional moments, educational highlights, gaming highlights, and strong podcast/
      interview soundbites. Prioritize moments with a strong hook in the first 3 seconds, a clear payoff, and
      self-contained meaning (viewer doesn't need the rest of the video to understand it).

      For each clip, also rewrite the opening line into a punchier "hook" optimized for retention (e.g. turn
      "I wanted to explain..." into "Nobody talks about this...").

      Total video duration: ${totalDuration.toFixed(1)} seconds.

      Transcript:
      ${transcriptText}

      Return ONLY a JSON array (no markdown, no prose) of up to 8 objects with this exact shape:
      [{
        "startSeconds": number,
        "endSeconds": number,
        "title": string,
        "hook": string,
        "description": string,
        "hashtags": string[],
        "category": "funny" | "emotional" | "educational" | "gaming" | "podcast" | "interview" | "other",
        "viralScore": number (0-100)
      }]

      Rules:
      - startSeconds/endSeconds must be within [0, ${totalDuration.toFixed(1)}] and end > start.
      - Each clip must be between 15 and 60 seconds long.
      - Clips should not overlap significantly.
      - hashtags: 4-6 relevant, lowercase, no # symbol.
      - Order by viralScore descending.
    `,
  });

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  try {
    const parsed = JSON.parse(jsonMatch[0]) as ViralMoment[];
    return parsed.filter((m) => m.endSeconds > m.startSeconds && m.endSeconds <= totalDuration + 1);
  } catch {
    return [];
  }
}
