import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { ServiceUnavailableException } from "@nestjs/common";
import { AppConfigService } from "../config/app-config.service";

/** At-rest protection. The scope is authenticated, so copying a ciphertext cannot change its owner. */
export class BrandCredentialCipher {
  constructor(private readonly config = new AppConfigService()) {}
  private key() { return createHash("sha256").update("brand-credential-v1\0" + this.config.getAIControlCenterInstallTokenEncryptionSecret()).digest(); }
  seal(value: string, brandId: string, platformId: string) {
    if (!value) return "";
    const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", this.key(), iv);
    cipher.setAAD(Buffer.from(JSON.stringify([brandId, platformId])));
    const bytes = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
    return ["brandenc", "v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), bytes.toString("base64url")].join(":");
  }
  open(value: string, brandId: string, platformId: string) {
    if (!value.startsWith("brandenc:")) return value; // Legacy records stay untouched until explicitly replaced.
    try {
      const [marker, version, iv, tag, content, extra] = value.split(":");
      if (marker !== "brandenc" || version !== "v1" || !iv || !tag || !content || extra) throw Error();
      const decipher = createDecipheriv("aes-256-gcm", this.key(), Buffer.from(iv, "base64url"));
      decipher.setAAD(Buffer.from(JSON.stringify([brandId, platformId])));decipher.setAuthTag(Buffer.from(tag, "base64url"));
      return Buffer.concat([decipher.update(Buffer.from(content, "base64url")), decipher.final()]).toString("utf8");
    } catch { throw new ServiceUnavailableException("当前品牌凭据无法解密，请由品牌管理员重新配置"); }
  }
}
