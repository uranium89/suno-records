import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

export type DownloadResult = {
  filePath: string;
  bytes: number;
};

export async function downloadToFile(
  audioUrl: string,
  destPath: string,
): Promise<DownloadResult> {
  await mkdir(path.dirname(destPath), { recursive: true });

  const res = await fetch(audioUrl);
  if (!res.ok || !res.body) {
    throw new Error(`Tải audio thất bại: HTTP ${res.status}`);
  }

  const contentLength = res.headers.get("content-length");
  const total = contentLength ? Number(contentLength) : undefined;

  const nodeStream = Readable.fromWeb(
    res.body as import("node:stream/web").ReadableStream,
  );
  const fileStream = createWriteStream(destPath);

  let bytes = 0;
  nodeStream.on("data", (chunk: Buffer) => {
    bytes += chunk.length;
    if (total && total > 0) {
      const pct = Math.min(100, Math.round((bytes / total) * 100));
      process.stderr.write(`\rĐang tải… ${pct}% (${formatBytes(bytes)}/${formatBytes(total)})`);
    } else {
      process.stderr.write(`\rĐang tải… ${formatBytes(bytes)}`);
    }
  });

  await pipeline(nodeStream, fileStream);
  process.stderr.write("\n");

  return { filePath: destPath, bytes };
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
