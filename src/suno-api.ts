const CLIP_API = "https://studio-api-prod.suno.com/api/clip";

export type MediaUrl = {
  url: string;
  content_type?: string;
  delivery?: string;
  encoding?: string;
};

export type Clip = {
  id: string;
  title?: string;
  status: string;
  media_urls?: MediaUrl[];
  metadata?: { duration?: number };
};

export function needsDecryption(clip: Clip): boolean {
  const urls = clip.media_urls ?? [];
  return urls.some((m) => m.encoding === "1.0.0");
}

export function pickAudioUrl(clip: Clip): string {
  const urls = clip.media_urls ?? [];
  if (urls.length === 0) {
    throw new Error(
      `Bài "${clip.title ?? clip.id}" không có media_urls (có thể cần đăng nhập / bài chưa hoàn thành).`,
    );
  }

  const m4a =
    urls.find((m) => m.content_type?.includes("m4a")) ??
    urls.find((m) => m.url.includes(".m4a")) ??
    urls[0];

  return m4a.url;
}

export async function fetchClip(
  clipId: string,
  cookie?: string,
): Promise<Clip> {
  const headers: Record<string, string> = {
    Origin: "https://suno.com",
    Referer: "https://suno.com/",
    Accept: "application/json",
  };
  if (cookie) {
    headers.Cookie = cookie;
  }

  const res = await fetch(`${CLIP_API}/${clipId}`, { headers });
  if (!res.ok) {
    throw new Error(
      `API Suno trả lỗi ${res.status} cho clip ${clipId}`,
    );
  }

  const clip = (await res.json()) as Clip;

  if (clip.status !== "complete") {
    throw new Error(
      `Bài chưa sẵn sàng (status: ${clip.status}). Thử lại sau khi Suno hoàn tất render.`,
    );
  }

  return clip;
}
