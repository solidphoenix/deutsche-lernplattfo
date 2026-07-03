FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS backend-builder
WORKDIR /app/backend
COPY backend/package.json ./
RUN npm install
COPY backend ./
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app/backend
ENV NODE_ENV=production
COPY backend/package.json ./
RUN npm install --omit=dev
COPY --from=backend-builder /app/backend/dist ./dist
COPY --from=frontend-builder /app/dist /app/dist
COPY src/assets/documents /app/src/assets/documents
COPY knowledge /app/knowledge
EXPOSE 3001
CMD ["node", "dist/index.js"]
