FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOME=/tmp
ENV CI=true

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

RUN chown -R node:node /app

USER node

EXPOSE 5173

CMD ["./node_modules/.bin/wrangler", "dev", "--local", "--config", "./dist/server/wrangler.json", "--ip", "0.0.0.0", "--port", "5173"]
