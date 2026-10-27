import path from "node:path";
import type { NextConfig } from "next";

const isSandboxEnvironment =
  Boolean(process.env.TRAE_SANDBOX_CLI_PATH) ||
  Boolean(process.env.TRAE_SANDBOX_CONFIG_NAME) ||
  Boolean(process.env.TRAE_AI_SHELL_ID);
const shouldForceWasmBinary = process.env.NEXT_FORCE_WASM_BINARY === "1" || isSandboxEnvironment;
const INTERNAL_API_TARGET = process.env.API_PROXY_TARGET || process.env.INTERNAL_API_BASE_URL || "http://server:3011/api";
const WEB_UPLOAD_BODY_LIMIT = process.env.WEB_UPLOAD_BODY_LIMIT || "2048mb";

const buildCpus = Number(process.env.NEXT_BUILD_CPUS || "0");
const experimentalConfig = {
  ...(Number.isInteger(buildCpus) && buildCpus > 0 ? { cpus: Math.min(buildCpus, 4) } : {}),
  // Material ingestion streams controlled local files through the lab proxy.
  // Keep this aligned with the multipart archive upload ceiling.
  middlewareClientMaxBodySize: WEB_UPLOAD_BODY_LIMIT,
  ...(shouldForceWasmBinary ? { useWasmBinary: true } : {}),
} as NonNullable<NextConfig["experimental"]> & { middlewareClientMaxBodySize?: string };

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../.."),
  experimental: experimentalConfig,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${INTERNAL_API_TARGET}/:path*`,
      },
    ];
  },
};

export default nextConfig;
