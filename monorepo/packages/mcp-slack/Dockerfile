FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npx tsc

FROM node:20-alpine AS runner

WORKDIR /app

COPY package.json ./
RUN npm install --only=production

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

ENTRYPOINT ["node", "dist/index.js"]
