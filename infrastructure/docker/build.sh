#!/bin/bash
# Build script for Brittney Cloud Inference Docker image

set -e

# Configuration
IMAGE_NAME="brittney-inference"
IMAGE_TAG="${IMAGE_TAG:-latest}"
REGISTRY="${DOCKER_REGISTRY:-gcr.io/hololand-production}"

echo "Building Brittney Cloud Inference image..."
echo "Image: ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"

# Build the image
docker build \
    --platform linux/amd64 \
    --tag ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} \
    --tag ${REGISTRY}/${IMAGE_NAME}:$(git rev-parse --short HEAD) \
    --file Dockerfile \
    .

echo "Build complete!"
echo ""
echo "To push to registry:"
echo "  docker push ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
echo ""
echo "To test locally:"
echo "  docker run -p 11434:11434 --gpus all ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
