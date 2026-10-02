import { writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import path from "node:path";

export async function fetchAudioBytes(audioUrl: string): Promise<Uint8Array> {
  const res = await fetch(audioUrl);
  if (!res.ok) {
    throw new Error(`Tải audio thất bại: HTTP ${res.status}`);
  }
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

export async function writeBytes(
  destPath: string,
  data: Uint8Array,
): Promise<void> {
  await mkdir(path.dirname(destPath), { recursive: true });
  await writeFile(destPath, data);
}
