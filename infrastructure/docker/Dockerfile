# Brittney Cloud Inference - Production Docker Image
# Base: NVIDIA CUDA runtime for GPU acceleration
FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

# Metadata
LABEL maintainer="Hololand <support@hololand.ai>"
LABEL description="Brittney AI Inference Service with Ollama"
LABEL version="1.0.0"

# Environment variables
ENV OLLAMA_HOST=0.0.0.0:11434
ENV OLLAMA_MODELS=/root/.ollama/models
ENV OLLAMA_NUM_PARALLEL=3
ENV OLLAMA_NUM_CTX=4096
ENV OLLAMA_NUM_GPU=1

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl -fsSL https://ollama.ai/install.sh | sh

# Pre-pull Brittney model to reduce cold start time
# This happens during image build, so containers start with model ready
RUN ollama serve & \
    sleep 10 && \
    ollama pull brittney-qwen-v23:latest && \
    pkill ollama

# Health check - verify Ollama API is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:11434/api/tags || exit 1

# Expose Ollama API port
EXPOSE 11434

# Start Ollama service
CMD ["ollama", "serve"]
