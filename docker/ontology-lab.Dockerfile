FROM node:22-bookworm AS dependencies
WORKDIR /app
RUN openssl version && test -f /etc/ssl/certs/ca-certificates.crt

COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/prompt-runtime/package.json packages/prompt-runtime/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY docker/local-ocr-requirements.txt docker/local-ocr-requirements.txt
COPY docker/local-asr-requirements.txt docker/local-asr-requirements.txt

# Keep downloads across interrupted lab builds without changing the lockfile.
RUN --mount=type=cache,id=ontology-lab-npm,target=/root/.npm \
    npm ci --ignore-scripts --no-audit --no-fund --prefer-offline \
      --registry=https://registry.npmmirror.com --fetch-timeout=60000 \
      --fetch-retries=1 --loglevel=http

FROM dependencies AS media-runtime
ARG INSTALL_LOCAL_OCR=0
ARG INSTALL_LOCAL_ASR=0
ARG LOCAL_ASR_PRELOAD_WHISPER_MODEL=small
ENV PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple \
    PIP_EXTRA_INDEX_URL=https://pypi.org/simple \
    PIP_DEFAULT_TIMEOUT=180 \
    PIP_RETRIES=10 \
    PIP_TRUSTED_HOST="pypi.tuna.tsinghua.edu.cn pypi.org files.pythonhosted.org download.pytorch.org" \
    HF_ENDPOINT=https://hf-mirror.com \
    HF_HUB_DISABLE_XET=1 \
    HF_HOME=/root/.cache/huggingface \
    HUGGINGFACE_HUB_CACHE=/root/.cache/huggingface/hub
RUN if [ "$INSTALL_LOCAL_OCR" = "1" ] || [ "$INSTALL_LOCAL_ASR" = "1" ]; then \
      if [ -f /etc/apt/sources.list.d/debian.sources ]; then \
        sed -i 's|http://deb.debian.org/debian|https://mirrors.tuna.tsinghua.edu.cn/debian|g; s|http://deb.debian.org/debian-security|https://mirrors.tuna.tsinghua.edu.cn/debian-security|g' /etc/apt/sources.list.d/debian.sources; \
      fi; \
      apt-get update \
      && apt-get install -y --no-install-recommends python3 python3-pip libgl1 libglib2.0-0 \
      && rm -rf /var/lib/apt/lists/*; \
    else \
      echo "Local OCR/ASR runtime is optional. Rebuild with INSTALL_LOCAL_OCR=1 or INSTALL_LOCAL_ASR=1 when media tags are needed."; \
    fi
RUN if [ "$INSTALL_LOCAL_OCR" = "1" ]; then \
      python3 -m pip install --no-cache-dir --break-system-packages --upgrade pip setuptools wheel \
      && python3 -m pip install --no-cache-dir --prefer-binary --break-system-packages -i https://pypi.tuna.tsinghua.edu.cn/simple -r docker/local-ocr-requirements.txt; \
    else \
      echo "Local OCR runtime is optional. Rebuild with INSTALL_LOCAL_OCR=1 when image OCR tags are needed."; \
    fi
RUN --mount=type=cache,id=ontology-lab-hf,target=/root/.cache/huggingface \
    if [ "$INSTALL_LOCAL_ASR" = "1" ]; then \
      python3 -m pip install --no-cache-dir --break-system-packages --upgrade pip setuptools wheel \
      && python3 -m pip install --no-cache-dir --prefer-binary --break-system-packages -r docker/local-asr-requirements.txt \
      && LOCAL_ASR_PRELOAD_WHISPER_MODEL="$LOCAL_ASR_PRELOAD_WHISPER_MODEL" python3 -c "import os; from faster_whisper import WhisperModel; model = (os.getenv('LOCAL_ASR_PRELOAD_WHISPER_MODEL') or 'small').strip() or 'small'; print(f'Preloading faster-whisper model: {model}'); WhisperModel(model, device='cpu', compute_type='int8'); print('Preloaded faster-whisper model successfully')"; \
    else \
      echo "Local ASR runtime is optional. Rebuild with INSTALL_LOCAL_ASR=1 when video transcript tags are needed."; \
    fi

FROM media-runtime AS source
COPY . .

FROM source AS server
RUN npm run prisma:generate && npm run build:server
EXPOSE 3011
CMD ["node", "apps/server/dist/apps/server/src/main.js"]

FROM source AS web
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build:web
RUN rm -rf /app/apps/web/.next/standalone/apps/web/.next/static \
    && mkdir -p /app/apps/web/.next/standalone/apps/web/.next/static \
    && cp -R /app/apps/web/.next/static/. /app/apps/web/.next/standalone/apps/web/.next/static/ \
    && rm -rf /app/apps/web/.next/standalone/apps/web/public \
    && if [ -d /app/apps/web/public ]; then mkdir -p /app/apps/web/.next/standalone/apps/web/public && cp -R /app/apps/web/public/. /app/apps/web/.next/standalone/apps/web/public/; fi
EXPOSE 3001
CMD ["node", "apps/web/.next/standalone/apps/web/server.js"]

FROM node:22-bookworm-slim AS ingress
WORKDIR /app
COPY scripts/ontology-lab-ingress.cjs ./
USER node
CMD ["node", "ontology-lab-ingress.cjs"]
