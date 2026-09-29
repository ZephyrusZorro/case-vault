# CaseVault: one origin for the React application and FastAPI.
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --no-audit
COPY frontend/index.html frontend/vite.config.ts frontend/tsconfig.json ./
COPY frontend/src ./src
COPY frontend/public ./public
RUN npm run build

FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
COPY backend ./backend
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
RUN useradd --system --uid 10001 --home-dir /app/data casevault && mkdir -p /app/data && chown -R casevault:casevault /app/data
ENV DATABASE_URL=sqlite:////app/data/casevault.db
ENV UPLOAD_DIR=/app/data/uploads
ENV CORS_ORIGINS=""
USER casevault
WORKDIR /app/backend
EXPOSE 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
