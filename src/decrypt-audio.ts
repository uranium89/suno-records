import { webcrypto } from "node:crypto";

const RIGHTS_URL = "https://studio-api-prod.suno.com/api/mango/rights";

type RightsResponse = {
  key: string;
  iv: string;
  glt: string;
};

function b64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

function sniffFormat(data: Uint8Array): "m4a" | "webm" | null {
  if (
    data.length >= 8 &&
    data[4] === 0x66 &&
    data[5] === 0x74 &&
    data[6] === 0x79 &&
    data[7] === 0x70
  ) {
    return "m4a";
  }
  if (
    data.length >= 4 &&
    data[0] === 0x1a &&
    data[1] === 0x45 &&
    data[2] === 0xdf &&
    data[3] === 0xa3
  ) {
    return "webm";
  }
  return null;
}

export function isEncryptedPayload(data: Uint8Array): boolean {
  return sniffFormat(data) === null;
}

async function fetchRights(clipId: string): Promise<RightsResponse> {
  const res = await fetch(RIGHTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://suno.com",
      Referer: "https://suno.com/",
    },
    body: JSON.stringify({
      content_params: { content_id: clipId, content_type: "clip" },
    }),
  });
  if (!res.ok) {
    throw new Error(`Không lấy được quyền giải mã (HTTP ${res.status})`);
  }
  return (await res.json()) as RightsResponse;
}

export async function decryptClipAudio(
  clipId: string,
  encrypted: Uint8Array,
): Promise<Uint8Array> {
  const rights = await fetchRights(clipId);
  const subtle = webcrypto.subtle;
  const textEnc = new TextEncoder();

  const userKey = await subtle.importKey(
    "raw",
    await subtle.digest("SHA-256", textEnc.encode(rights.glt)),
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const unwrap = async (pkg: Uint8Array): Promise<Uint8Array> =>
    new Uint8Array(
      await subtle.decrypt(
        {
          name: "AES-GCM",
          iv: pkg.slice(0, 12),
          additionalData: textEnc.encode(clipId),
        },
        userKey,
        pkg.slice(12),
      ),
    );

  const contentKey = await subtle.importKey(
    "raw",
    await unwrap(b64ToBytes(rights.key)),
    { name: "AES-CTR" },
    false,
    ["decrypt"],
  );
  const iv = await unwrap(b64ToBytes(rights.iv));

  const plain = new Uint8Array(
    await subtle.decrypt(
      { name: "AES-CTR", counter: iv, length: 128 },
      contentKey,
      encrypted,
    ),
  );

  const fmt = sniffFormat(plain);
  if (!fmt) {
    throw new Error("Giải mã thất bại — dữ liệu không phải audio hợp lệ");
  }

  return plain;
}
