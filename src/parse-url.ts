const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Trích clip ID từ URL Suno hoặc chuỗi UUID thuần.
 */
export function parseClipId(input: string): string {
  const trimmed = input.trim();

  if (UUID_RE.test(trimmed)) {
    return trimmed;
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(
      `URL không hợp lệ: "${input}". Dùng link dạng https://suno.com/song/{id} hoặc UUID.`,
    );
  }

  const host = url.hostname.replace(/^www\./, "");
  if (host !== "suno.com" && host !== "app.suno.ai") {
    throw new Error(`Host không được hỗ trợ: ${url.hostname}`);
  }

  const parts = url.pathname.split("/").filter(Boolean);
  const songIdx = parts.findIndex((p) => p === "song" || p === "s");
  if (songIdx >= 0 && parts[songIdx + 1]) {
    const id = parts[songIdx + 1];
    if (UUID_RE.test(id)) {
      return id;
    }
  }

  const last = parts[parts.length - 1];
  if (last && UUID_RE.test(last)) {
    return last;
  }

  throw new Error(
    `Không tìm thấy ID bài hát trong URL: ${trimmed}`,
  );
}
