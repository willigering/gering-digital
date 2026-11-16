# Spielserver „Du kranst mich mal“. Bauen aus dem Ordner myground/:
#   docker build -f server/Dockerfile -t myground-server .
#   docker run -p 8787:8787 -p 40000-40100:40000-40100/udp -e UDP_PORT_MIN=40000 -e UDP_PORT_MAX=40100 myground-server
FROM node:22-bookworm-slim
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY server/server.js server/game.js ./
COPY logic.js ../logic.js
ENV PORT=8787 SERVE_CLIENT=0 NODE_ENV=production
EXPOSE 8787
USER node
CMD ["node", "server.js"]
