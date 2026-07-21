FROM node:18

WORKDIR /app

# Install Python and Whisper dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && pip install --no-cache-dir openai-whisper \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Pre-download Whisper model (base)
RUN python3 -c "import whisper; whisper.load_model('base')"

# Install Node dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application
COPY index.html .
COPY server.js .
COPY input/ ./input/

# Create directories
RUN mkdir -p uploads output

# Expose port
EXPOSE 3000

# Start application
CMD ["npm", "start"]
