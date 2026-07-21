FROM node:18-slim

WORKDIR /app

# Install system dependencies with caching
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    && pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir openai-whisper \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Pre-download Whisper model (base) to cache layer
RUN python3 -c "import whisper; whisper.load_model('base')" || true

# Install Node dependencies (with caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy lib directory
COPY lib/ ./lib/

# Copy application files
COPY server.js .
COPY index.html .
COPY input/ ./input/

# Create directories for uploads and cache
RUN mkdir -p uploads output .cache

# Set permissions
RUN chmod -R 755 uploads output .cache

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/admin/engine-info || exit 1

# Expose port
EXPOSE 3000

# Use node user for security
USER node

# Start application
CMD ["npm", "start"]
