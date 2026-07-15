import fs from "node:fs";
import path from "node:path";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "./s3";
import { db } from "../database";
import { projects, clips } from "../database/schema";
import { eq } from "drizzle-orm";
import { tmpDir, getDurationSeconds, extractAudio, downloadYoutube, renderVerticalClip, buildAssCaptions, extractThumbnail, type CaptionWord } from "./ffmpeg";
import { transcribeAudio } from "./transcribe";
import { detectViralMoments } from "../agent/detect-moments";
import { isCancelled, clearCancel } from "./cancellation";
import { checkUsage, trackUsage, getMaxDurationSeconds, getPlanId, upgradeMessageFor } from "./billing";

async function updateProject(id: string, patch: Partial<typeof projects.$inferInsert>) {
  await db.update(projects).set(patch).where(eq(projects.id, id));
}

async function downloadFromTigris(key: string, outPath: string) {
  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }), { expiresIn: 600 });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download ${key}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
}

async function uploadToTigris(filePath: string, key: string, contentType: string) {
  const body = fs.readFileSync(filePath);
  await s3.send(new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
  return key;
}

/** Runs the full pipeline for a project: download -> transcribe -> detect moments -> render clips. Fire-and-forget. */
export async function runPipeline(projectId: string) {
  const dir = tmpDir("neonhaul");
  try {
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) return;

    const sourcePath = path.join(dir, "source.mp4");

    await updateProject(projectId, { status: "downloading", progress: 5 });
    if (project.sourceType === "youtube" && project.sourceUrl) {
      await downloadYoutube(project.sourceUrl, sourcePath, projectId);
    } else if (project.sourceKey) {
      await downloadFromTigris(project.sourceKey, sourcePath);
    } else {
      throw new Error("Project has no source");
    }
    if (isCancelled(projectId)) return;

    const duration = await getDurationSeconds(sourcePath);

    const maxDuration = await getMaxDurationSeconds(project.userId);
    if (duration > maxDuration) {
      const planId = await getPlanId(project.userId);
      await updateProject(projectId, {
        durationSeconds: duration,
        status: "failed",
        errorMessage: upgradeMessageFor(planId),
      });
      return;
    }

    await updateProject(projectId, { durationSeconds: duration, status: "transcribing", progress: 20 });

    const audioPath = path.join(dir, "audio.mp3");
    await extractAudio(sourcePath, audioPath);
    const transcript = await transcribeAudio(audioPath);
    if (isCancelled(projectId)) return;
    await updateProject(projectId, { transcript: JSON.stringify(transcript), status: "analyzing", progress: 45 });

    const moments = await detectViralMoments(transcript.segments, duration);
    if (isCancelled(projectId)) return;
    await updateProject(projectId, { status: "editing", progress: 55 });

    if (moments.length === 0) {
      await updateProject(projectId, { status: "failed", errorMessage: "AI could not find any viral moments in this video." });
      return;
    }

    const total = moments.length;
    for (let i = 0; i < total; i++) {
      if (isCancelled(projectId)) break;
      const m = moments[i];

      const { allowed } = await checkUsage(project.userId, "clips_generated");
      if (!allowed) break;

      const clipId = crypto.randomUUID();
      await db.insert(clips).values({
        id: clipId,
        projectId,
        userId: project.userId,
        title: m.title,
        hook: m.hook,
        description: m.description,
        hashtags: JSON.stringify(m.hashtags ?? []),
        startSeconds: m.startSeconds,
        endSeconds: m.endSeconds,
        viralScore: m.viralScore,
        category: m.category,
        status: "rendering",
      });
      await trackUsage(project.userId, "clips_generated", 1);

      try {
        const assPath = path.join(dir, `${clipId}.ass`);
        buildAssCaptions(transcript.words, m.startSeconds, m.endSeconds, "modern", assPath);

        const outPath = path.join(dir, `${clipId}.mp4`);
        await renderVerticalClip({ sourcePath, start: m.startSeconds, end: m.endSeconds, assPath, outPath, cancelKey: projectId });

        const thumbPath = path.join(dir, `${clipId}.jpg`);
        await extractThumbnail(outPath, 0.5, thumbPath);

        const renderedKey = `clips/${projectId}/${clipId}.mp4`;
        const thumbnailKey = `clips/${projectId}/${clipId}.jpg`;
        await uploadToTigris(outPath, renderedKey, "video/mp4");
        await uploadToTigris(thumbPath, thumbnailKey, "image/jpeg");

        await db.update(clips).set({ status: "completed", renderedKey, thumbnailKey }).where(eq(clips.id, clipId));
      } catch (e) {
        await db.update(clips).set({ status: "failed", errorMessage: e instanceof Error ? e.message : String(e) }).where(eq(clips.id, clipId));
      }

      await updateProject(projectId, { progress: 55 + Math.round(((i + 1) / total) * 40) });
    }

    if (!isCancelled(projectId)) {
      await updateProject(projectId, { status: "completed", progress: 100 });
    }
  } catch (e) {
    if (!isCancelled(projectId)) {
      await updateProject(projectId, { status: "failed", errorMessage: e instanceof Error ? e.message : String(e) });
    }
  } finally {
    clearCancel(projectId);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Re-renders a single existing clip using its current (just-edited) caption style/size/text,
 * filter, and emoji fields. Re-downloads the source video since it isn't kept after the initial
 * pipeline run, but skips transcription/moment-detection entirely. Fire-and-forget.
 */
export async function reprocessClip(clipId: string) {
  const dir = tmpDir("neonhaul-edit");
  try {
    const [clip] = await db.select().from(clips).where(eq(clips.id, clipId));
    if (!clip) return;
    const [project] = await db.select().from(projects).where(eq(projects.id, clip.projectId));
    if (!project) return;

    const sourcePath = path.join(dir, "source.mp4");
    if (project.sourceType === "youtube" && project.sourceUrl) {
      await downloadYoutube(project.sourceUrl, sourcePath);
    } else if (project.sourceKey) {
      await downloadFromTigris(project.sourceKey, sourcePath);
    } else {
      throw new Error("Project has no source");
    }

    const transcript = project.transcript ? JSON.parse(project.transcript) : { words: [] };
    const words: CaptionWord[] = clip.captionWords ? JSON.parse(clip.captionWords) : (transcript.words ?? []);
    const emojis = clip.emojis ? JSON.parse(clip.emojis) : [];

    const assPath = path.join(dir, `${clipId}.ass`);
    buildAssCaptions(words, clip.startSeconds, clip.endSeconds, clip.captionStyle ?? "modern", assPath, {
      fontSize: clip.captionSize ?? undefined,
      emojis,
      position: clip.captionPosition ?? "bottom",
    });

    const outPath = path.join(dir, `${clipId}.mp4`);
    await renderVerticalClip({
      sourcePath,
      start: clip.startSeconds,
      end: clip.endSeconds,
      assPath,
      outPath,
      filter: clip.filter ?? "none",
      resolution: clip.resolution ?? "1080p",
    });

    const thumbPath = path.join(dir, `${clipId}.jpg`);
    await extractThumbnail(outPath, 0.5, thumbPath);

    const renderedKey = clip.renderedKey ?? `clips/${clip.projectId}/${clipId}.mp4`;
    const thumbnailKey = clip.thumbnailKey ?? `clips/${clip.projectId}/${clipId}.jpg`;
    await uploadToTigris(outPath, renderedKey, "video/mp4");
    await uploadToTigris(thumbPath, thumbnailKey, "image/jpeg");

    await db.update(clips).set({ status: "completed", errorMessage: null, renderedKey, thumbnailKey }).where(eq(clips.id, clipId));
  } catch (e) {
    await db.update(clips).set({ status: "failed", errorMessage: e instanceof Error ? e.message : String(e) }).where(eq(clips.id, clipId));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
