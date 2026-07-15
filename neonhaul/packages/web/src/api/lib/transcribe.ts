import OpenAI from "openai";
import fs from "node:fs";

export type TranscriptWord = { word: string; start: number; end: number };
export type TranscriptSegment = { start: number; end: number; text: string };
export type Transcript = { text: string; segments: TranscriptSegment[]; words: TranscriptWord[] };

/**
 * Prefers Groq (free tier, OpenAI-compatible Whisper endpoint) when GROQ_API_KEY is set —
 * falls back to OpenAI's Whisper API when only OPENAI_API_KEY is configured.
 */
function client() {
  if (process.env.GROQ_API_KEY) {
    return {
      openai: new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" }),
      model: "whisper-large-v3",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return { openai: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }), model: "whisper-1" };
  }
  throw new Error("No transcription provider configured — set GROQ_API_KEY or OPENAI_API_KEY");
}

/** Transcribes an audio file (mp3/wav/m4a) at `audioPath` via Groq or OpenAI Whisper, with word + segment timestamps. */
export async function transcribeAudio(audioPath: string): Promise<Transcript> {
  const { openai, model } = client();
  const res = await openai.audio.transcriptions.create({
    file: fs.createReadStream(audioPath),
    model,
    response_format: "verbose_json",
    timestamp_granularities: ["word", "segment"],
  });

  const anyRes = res as unknown as {
    text: string;
    segments?: { start: number; end: number; text: string }[];
    words?: { word: string; start: number; end: number }[];
  };

  return {
    text: anyRes.text ?? "",
    segments: (anyRes.segments ?? []).map((s) => ({ start: s.start, end: s.end, text: s.text.trim() })),
    words: (anyRes.words ?? []).map((w) => ({ word: w.word, start: w.start, end: w.end })),
  };
}
