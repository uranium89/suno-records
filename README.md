# suno-records

CLI tải nhạc từ link bài hát trên [suno.com](https://suno.com). Mặc định lưu **MP3** (qua ffmpeg); có thể giữ **M4A** gốc từ Suno.

## Yêu cầu

- Node.js 20+
- **ffmpeg** (cho MP3): `brew install ffmpeg` trên macOS

## Cài đặt

```bash
npm install
npm run build
```

Liên kết lệnh global (tùy chọn):

```bash
npm link
```

## Cách dùng

```bash
# Sau build
npm start -- "https://suno.com/song/cca946b7-0ed5-4f14-9be3-147735617d4d"

# Hoặc dev (không cần build)
npm run dev -- "https://suno.com/song/..."

# Chỉ định thư mục lưu
npm run dev -- "https://suno.com/song/..." --out ./my-music

# Giữ file M4A gốc (không cần ffmpeg)
npm run dev -- "https://suno.com/song/..." --format m4a
```

File được lưu trong `./downloads/` (hoặc thư mục `--out`), tên file lấy từ tiêu đề bài hát. Định dạng mặc định: `.mp3`.

## Biến môi trường

| Biến | Mô tả |
|------|--------|
| `SUNO_COOKIE` | Cookie từ trình duyệt đã đăng nhập Suno — dùng khi bài **riêng tư** hoặc API không trả `media_urls` |

## Giới hạn

- Chỉ tải bài bạn **sở hữu** hoặc **được phép** tải theo điều khoản Suno.
- Link CDN có thể **hết hạn** sau một thời gian; tải và lưu bản sao local khi còn hiệu lực.
- Bài chưa render xong (`status` khác `complete`) sẽ báo lỗi — thử lại sau.

## Cách hoạt động (tóm tắt)

1. Lấy `clipId` từ URL `/song/{uuid}`.
2. Gọi `studio-api-prod.suno.com/api/clip/{id}`.
3. Tải URL trong `media_urls`, giải mã DRM (nếu `encoding: 1.0.0`), rồi lưu M4A hoặc chuyển MP3 qua ffmpeg.
