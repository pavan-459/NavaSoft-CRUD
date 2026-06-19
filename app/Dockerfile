FROM node:20-alpine

# FFmpeg is required for video frame extraction
RUN apk add --no-cache ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
