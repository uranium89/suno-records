export function sanitizeFilename(title: string, fallback: string): string {
  const base = title.trim() || fallback;
  const safe = base
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
  return safe || fallback;
}
