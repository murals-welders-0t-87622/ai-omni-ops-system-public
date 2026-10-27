import { BadRequestException } from "@nestjs/common";

export function validateBrandUpload(payload: Record<string, unknown>, imageOnly = false) {
  const { fileName, contentType, dataBase64 } = payload;
  if (Object.keys(payload).some(key => !["fileName", "contentType", "dataBase64"].includes(key))) throw new BadRequestException("上传只接受文件名、MIME和Base64内容");
  if (typeof fileName !== "string" || !fileName.trim() || fileName.length > 220 || /[\\/\u0000-\u001f]/.test(fileName)) throw new BadRequestException("文件名不合法");
  const extension = fileName.toLowerCase().split(".").pop() || "";
  const types: Record<string, string[]> = {
    png: ["image/png"], jpg: ["image/jpeg"], jpeg: ["image/jpeg"], webp: ["image/webp"],
    pdf: ["application/pdf"], txt: ["text/plain"], md: ["text/markdown", "text/plain"], csv: ["text/csv", "text/plain"],
    docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  };
  if (typeof contentType !== "string" || !types[extension]?.includes(contentType.toLowerCase()) || (imageOnly && !["png", "jpg", "jpeg", "webp"].includes(extension))) throw new BadRequestException("文件后缀与MIME不匹配或类型不支持");
  if (typeof dataBase64 !== "string" || !dataBase64.length || dataBase64.length > 44739244 || dataBase64.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(dataBase64)) throw new BadRequestException("文件Base64无效或超过32MiB");
  const data = Buffer.from(dataBase64, "base64");
  if (!data.length || data.length > 32 * 1024 * 1024 || data.toString("base64") !== dataBase64) throw new BadRequestException("文件为空、Base64无效或超过32MiB");
  if ((extension === "png" && data.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") || (["jpg", "jpeg"].includes(extension) && data.subarray(0, 3).toString("hex") !== "ffd8ff") || (extension === "webp" && (data.toString("ascii", 0, 4) !== "RIFF" || data.toString("ascii", 8, 12) !== "WEBP")) || (extension === "pdf" && data.toString("ascii", 0, 5) !== "%PDF-") || (["docx", "xlsx", "pptx"].includes(extension) && data.subarray(0, 2).toString("ascii") !== "PK")) throw new BadRequestException("文件内容与声明类型不符");
  return { fileName: fileName.trim(), contentType: contentType.toLowerCase(), dataBase64 };
}
