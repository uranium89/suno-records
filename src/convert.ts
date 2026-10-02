import { spawn } from "node:child_process";
import { unlink } from "node:fs/promises";

export async function ensureFfmpeg(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn("ffmpeg", ["-version"], { stdio: "ignore" });
    proc.on("error", () => {
      reject(
        new Error(
          "Không tìm thấy ffmpeg. Cài đặt: brew install ffmpeg (macOS) hoặc https://ffmpeg.org/download.html",
        ),
      );
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error("ffmpeg không chạy được"));
    });
  });
}

export async function convertToMp3(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const args = [
      "-y",
      "-i",
      inputPath,
      "-vn",
      "-codec:a",
      "libmp3lame",
      "-qscale:a",
      "2",
      outputPath,
    ];
    const proc = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on("error", (err) => reject(err));
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(`ffmpeg thoát với mã ${code}: ${stderr.slice(-500)}`),
        );
    });
  });
}

export async function removeFileQuiet(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch {
    // ignore
  }
}
