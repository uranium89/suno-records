#!/usr/bin/env node
import path from "node:path";
import { parseClipId } from "./parse-url.js";
import { fetchClip, pickAudioUrl } from "./suno-api.js";
import { sanitizeFilename } from "./sanitize-filename.js";
import { writeFile, mkdir } from "node:fs/promises";
import { fetchAudioBytes, writeBytes } from "./download-bytes.js";
import { decryptClipAudio, isEncryptedPayload } from "./decrypt-audio.js";
import { needsDecryption } from "./suno-api.js";
import {
  convertToMp3,
  ensureFfmpeg,
  removeFileQuiet,
} from "./convert.js";

export type OutputFormat = "mp3" | "m4a";

function printUsage(): void {
  console.log(`
suno-records — tải bài hát Suno (MP3 / M4A)

Cách dùng:
  suno-records <url-hoặc-uuid> [--out ./downloads] [--format mp3|m4a]

Tùy chọn:
  --out <thư_mục>     Thư mục lưu file (mặc định: ./downloads)
  --format <mp3|m4a>  Định dạng đầu ra (mặc định: mp3; mp3 cần ffmpeg)
  --id-only <uuid>    Chỉ dùng UUID, bỏ qua parse URL (cùng một đối số vị trí)

Biến môi trường:
  SUNO_COOKIE       Cookie trình duyệt (tùy chọn, cho bài riêng tư)

Ví dụ:
  suno-records "https://suno.com/song/cca946b7-0ed5-4f14-9be3-147735617d4d"
`);
}

function parseArgs(argv: string[]): {
  input: string;
  outDir: string;
  format: OutputFormat;
} {
  const outIdx = argv.indexOf("--out");
  const formatIdx = argv.indexOf("--format");
  let outDir = path.resolve("downloads");
  let format: OutputFormat = "mp3";
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") {
      if (outIdx >= 0 && argv[outIdx + 1]) {
        outDir = path.resolve(argv[outIdx + 1]);
      }
      i++;
      continue;
    }
    if (argv[i] === "--format") {
      const raw = argv[formatIdx + 1]?.toLowerCase();
      if (raw === "m4a" || raw === "mp3") {
        format = raw;
      } else if (raw) {
        console.error(`Định dạng không hợp lệ: ${raw}. Dùng mp3 hoặc m4a.`);
        process.exit(1);
      }
      i++;
      continue;
    }
    if (argv[i] === "--help" || argv[i] === "-h") {
      printUsage();
      process.exit(0);
    }
    if (argv[i] === "--id-only") {
      if (argv[i + 1]) {
        positional.push(argv[i + 1]);
        i++;
      }
      continue;
    }
    if (!argv[i].startsWith("-")) {
      positional.push(argv[i]);
    }
  }

  const input = positional[0];
  if (!input) {
    printUsage();
    process.exit(1);
  }

  return { input, outDir, format };
}

async function main(): Promise<void> {
  const { input, outDir, format } = parseArgs(process.argv.slice(2));
  const cookie = process.env.SUNO_COOKIE;

  const clipId = parseClipId(input);
  console.log(`Clip ID: ${clipId}`);

  const clip = await fetchClip(clipId, cookie);
  const audioUrl = pickAudioUrl(clip);

  const baseName = sanitizeFilename(clip.title ?? "", clipId);
  const m4aPath = path.join(outDir, `${baseName}.m4a`);
  const finalPath = path.join(outDir, `${baseName}.${format}`);

  console.log(`Tiêu đề: ${clip.title ?? "(không có)"}`);
  if (clip.metadata?.duration != null) {
    console.log(`Thời lượng: ~${Math.round(clip.metadata.duration)} giây`);
  }

  if (format === "mp3") {
    await ensureFfmpeg();
  }

  console.log("Đang tải audio…");
  let audioBytes = await fetchAudioBytes(audioUrl);

  if (needsDecryption(clip) || isEncryptedPayload(audioBytes)) {
    console.log("Đang giải mã (DRM Suno)…");
    audioBytes = await decryptClipAudio(clipId, audioBytes);
  }

  await mkdir(outDir, { recursive: true });

  let filePath: string;
  let bytes: number;

  if (format === "m4a") {
    await writeBytes(finalPath, audioBytes);
    filePath = finalPath;
    bytes = audioBytes.byteLength;
  } else {
    await writeFile(m4aPath, audioBytes);
    console.log("Đang chuyển sang MP3…");
    await convertToMp3(m4aPath, finalPath);
    await removeFileQuiet(m4aPath);
    const { stat } = await import("node:fs/promises");
    const st = await stat(finalPath);
    filePath = finalPath;
    bytes = st.size;
  }

  console.log(`Đã lưu: ${filePath}`);
  console.log(`Kích thước: ${bytes} bytes`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Lỗi: ${message}`);
  process.exit(1);
});
