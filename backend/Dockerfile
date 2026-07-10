# ─── Dockerfile — Backend CNAN NORD ─────────────────────────────────────────
# Image multi-stage: Node.js 22 + Python 3 + openpyxl dans le même conteneur.
# Python est requis pour le script excel_handler.py (import/export Excel).

FROM node:22-alpine AS builder

# Installer Python + pip + openpyxl pour Excel processing
RUN apk add --no-cache python3 py3-pip py3-openpyxl

WORKDIR /app

# Copier package files et prisma schema en premier pour profiter du cache Docker layers
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
RUN npx prisma generate

# Copier les sources et builder NestJS
COPY . .
RUN npm run build

# ─── Image de production ──────────────────────────────────────────────────────
FROM node:22-alpine AS production

RUN apk add --no-cache python3 py3-pip py3-openpyxl

WORKDIR /app

# Copier package files et prisma schema pour générer le client de production
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --only=production
RUN npx prisma generate

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/helpers ./helpers
COPY --from=builder /app/MT_TREND_Certificate_Survey_Tracker_Updated_01052026-2.xlsx ./

# Créer les répertoires de données (montés comme volumes dans docker-compose)
RUN mkdir -p /data /app/uploads/pdf

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/main"]
