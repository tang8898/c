# syntax=docker/dockerfile:1
FROM node:18-bullseye

# Install ffmpeg and dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
 && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod +x /usr/local/bin/yt-dlp

# Create app directory
WORKDIR /app

# Copy only dev folder contents
COPY ./dev/package.json ./
RUN npm install --only=production && npm cache clean --force

# Copy rest of files
COPY ./dev/ ./

# Provide yt-dlp and ffmpeg path compatibility for code
RUN mkdir -p /app/bin /app/BB/windows/ffmpeg \
    && ln -sf /usr/local/bin/yt-dlp /app/bin/yt-dlp.exe \
    && ln -sf /usr/bin/ffmpeg /app/BB/windows/ffmpeg/ffmpeg.exe

ENV NODE_ENV=production
ENV PORT=20427

EXPOSE 20427

CMD ["node", "real-server.js"]