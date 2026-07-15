import type { ChildProcess } from "node:child_process";

const cancelledProjects = new Set<string>();
const activeProcesses = new Map<string, ChildProcess>();

/** Marks a project as cancelled and immediately kills whatever ffmpeg/yt-dlp process is running for it, if any. */
export function requestCancel(projectId: string) {
  cancelledProjects.add(projectId);
  activeProcesses.get(projectId)?.kill();
}

export function isCancelled(projectId: string) {
  return cancelledProjects.has(projectId);
}

/** Call once a pipeline run for this project has fully stopped, so the flag doesn't leak into a later retry. */
export function clearCancel(projectId: string) {
  cancelledProjects.delete(projectId);
  activeProcesses.delete(projectId);
}

export function registerProcess(projectId: string, proc: ChildProcess) {
  activeProcesses.set(projectId, proc);
}

export function unregisterProcess(projectId: string) {
  activeProcesses.delete(projectId);
}
