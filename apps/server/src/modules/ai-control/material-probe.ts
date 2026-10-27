import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import ffmpeg from "@ffmpeg-installer/ffmpeg";
import ffprobe from "ffprobe-static";
import sharp from "sharp";
import { BadRequestException } from "@nestjs/common";

const run = promisify(execFile);
export async function probeMaterialBuffer(buffer: Buffer) {
  if (!buffer.length || buffer.length > 128 * 1024 * 1024) throw new BadRequestException("文件为空或超过128MB核验上限，仍待核验");
  const common = { sha256: createHash("sha256").update(buffer).digest("hex"), checkedAt: new Date().toISOString() };
  try {
    const image = sharp(buffer, { limitInputPixels: 40000000, failOn: "warning" });
    const meta = await image.metadata();
    if (meta.format) {
      await image.stats(); // Decodes pixels; not an extension/header-only assertion.
      return { ...common, materialType: "图片", mimeType: `image/${meta.format === "jpg" ? "jpeg" : meta.format}`, evidenceLevel: "decoded_image_pixels" };
    }
  } catch { /* A/V below, malformed/unsupported images fail closed. */ }
  const dir = await mkdtemp(join(tmpdir(), "material-probe-"));
  try {
    const magic = buffer.subarray(0, 16), head = magic.toString("latin1");
    if (!/^(RIFF|OggS|fLaC|ID3)/.test(head) && head.slice(4, 8) !== "ftyp" && !magic.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) && !(magic[0] === 0xff && (magic[1] & 0xe0) === 0xe0)) throw new Error("unknown_container");
    const path = join(dir, "source.bin"); await writeFile(path, buffer);
    if (!ffprobe.path) throw new Error("no_probe");
    const result = await run(ffprobe.path, ["-protocol_whitelist", "file,pipe", "-v", "error", "-show_streams", "-show_format", "-of", "json", path], { windowsHide: true, timeout: 20000, maxBuffer: 1024 * 1024 });
    const info = JSON.parse(String(result.stdout)), streams = info.streams || [];
    const video = streams.find((s: any) => s.codec_type === "video" && !s.disposition?.attached_pic), audio = streams.find((s: any) => s.codec_type === "audio");
    if (!video && !audio) throw new Error("no_media");
    await run(ffmpeg.path, ["-protocol_whitelist", "file,pipe", "-v", "error", "-nostdin", "-i", path, "-t", "2", "-map", video ? "0:v:0" : "0:a:0", "-f", "null", "-"], { windowsHide: true, timeout: 20000, maxBuffer: 1024 * 1024 });
    const format = String(info.format?.format_name || "");
    const webm = buffer.subarray(0, 4096).includes(Buffer.from("webm"));
    const mimeType = video ? /mov|mp4/.test(format) ? "video/mp4" : /matroska|webm/.test(format) ? webm ? "video/webm" : "video/x-matroska" : /avi/.test(format) ? "video/x-msvideo" : /mpegts/.test(format) ? "video/mp2t" : "application/octet-stream" : /wav/.test(format) ? "audio/wav" : /mp3/.test(format) ? "audio/mpeg" : /ogg/.test(format) ? "audio/ogg" : /flac/.test(format) ? "audio/flac" : /aac/.test(format) ? "audio/aac" : /mov|mp4/.test(format) ? "audio/mp4" : "application/octet-stream";
    const duration = Number(info.format?.duration);
    return { ...common, materialType: video ? "视频" : "音频", mimeType, evidenceLevel: "decoded_first_2_seconds_not_full_file_or_rights", ...(Number.isFinite(duration) && duration > 0 ? { durationMs: Math.round(duration * 1000) } : {}) };
  } catch { throw new BadRequestException("文件流未通过解码核验，类型及可用性仍待核验"); }
  finally { await rm(dir, { recursive: true, force: true }); }
}
