import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { promisify } from "node:util";
import { BadRequestException, Inject, Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";
import { AppConfigService } from "../../config/app-config.service";

const execFileAsync = promisify(execFile);

type LocalOcrRequestOptions = {
  requestId?: string;
  fileName?: string;
  mimeType?: string;
};

export type LocalOcrRecognizeResult = {
  requestId: string;
  text: string;
  engine: string;
  model: string;
  items: Array<{
    text: string;
    score?: number | null;
    box?: unknown;
  }>;
};

@Injectable()
export class LocalOcrService {
  private readonly logger = new Logger(LocalOcrService.name);

  constructor(
    @Inject(AppConfigService)
    private readonly appConfigService: AppConfigService,
  ) {}

  async recognizeImageBuffer(imageBuffer: Buffer, options: LocalOcrRequestOptions = {}): Promise<LocalOcrRecognizeResult> {
    if (!imageBuffer?.length) {
      throw new BadRequestException("图片内容为空，暂时无法识别文字");
    }
    const requestId = options.requestId || randomUUID();
    const tempRoot = await mkdtemp(join(tmpdir(), "ai-omni-local-ocr-"));
    const inputPath = join(tempRoot, `source${this.resolveInputExtension(options.fileName, options.mimeType)}`);
    try {
      await writeFile(inputPath, imageBuffer);
      return await this.runLocalOcrScript(inputPath, requestId);
    } finally {
      await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  async recognizeImageFile(imagePath: string, options: LocalOcrRequestOptions = {}): Promise<LocalOcrRecognizeResult> {
    const normalizedPath = String(imagePath || "").trim();
    if (!normalizedPath) {
      throw new BadRequestException("图片文件路径为空，暂时无法识别文字");
    }
    const requestId = options.requestId || randomUUID();
    return await this.runLocalOcrScript(normalizedPath, requestId);
  }

  private async runLocalOcrScript(imagePath: string, requestId: string) {
    const pythonBin = this.appConfigService.getLocalOcrPythonBin();
    const scriptPath = this.appConfigService.getLocalOcrScriptPath();
    let result: Awaited<ReturnType<typeof execFileAsync>>;
    try {
      result = await execFileAsync(
        pythonBin,
        [scriptPath, "--image", imagePath, "--request-id", requestId],
        {
          encoding: "utf8",
          windowsHide: true,
          maxBuffer: 16 * 1024 * 1024,
          timeout: 2 * 60 * 1000,
          env: {
            ...process.env,
            HF_HUB_DISABLE_XET: process.env.HF_HUB_DISABLE_XET || "1",
          },
        },
      );
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error || "unknown error");
      this.logger.warn(`Local OCR failed: ${detail}`);
      if (detail.includes("ENOENT") || detail.includes("RapidOCR runtime missing")) {
        throw new ServiceUnavailableException(
          "当前环境未安装本地 OCR 运行时。请启用 INSTALL_LOCAL_OCR=1 后重建 Lab server。",
        );
      }
      throw new ServiceUnavailableException(`本地 OCR 识别失败：${detail}`);
    }

    const rawOutput = String(result.stdout || "").trim();
    if (!rawOutput) {
      const stderr = String(result.stderr || "").trim();
      throw new ServiceUnavailableException(stderr || "本地 OCR 未返回可解析结果");
    }
    try {
      const parsed = JSON.parse(rawOutput) as LocalOcrRecognizeResult;
      return {
        requestId: String(parsed.requestId || requestId),
        text: String(parsed.text || "").trim(),
        engine: String(parsed.engine || "rapidocr"),
        model: String(parsed.model || "rapidocr-onnxruntime"),
        items: Array.isArray(parsed.items) ? parsed.items : [],
      };
    } catch {
      throw new ServiceUnavailableException(`本地 OCR 返回结果无法解析：${rawOutput.slice(0, 240)}`);
    }
  }

  private resolveInputExtension(fileName?: string, mimeType?: string) {
    const explicitExt = extname(String(fileName || "").trim()).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tif", ".tiff"].includes(explicitExt)) {
      return explicitExt;
    }
    const normalizedMime = String(mimeType || "").trim().toLowerCase();
    if (normalizedMime.includes("png")) return ".png";
    if (normalizedMime.includes("webp")) return ".webp";
    if (normalizedMime.includes("bmp")) return ".bmp";
    if (normalizedMime.includes("tiff")) return ".tiff";
    return ".jpg";
  }
}
