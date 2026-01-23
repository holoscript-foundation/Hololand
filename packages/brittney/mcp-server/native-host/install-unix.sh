#!/bin/bash
# Brittney Native Messaging Host Installer for macOS/Linux

set -e

HOST_NAME="com.hololand.brittney"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_DIR="$(dirname "$SCRIPT_DIR")"
DIST_DIR="$PACKAGE_DIR/dist"
HOST_PATH="$DIST_DIR/native-messaging-host.js"
MANIFEST_PATH="$DIST_DIR/$HOST_NAME.json"

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    MANIFEST_DIR="$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
    MANIFEST_DIR_CHROMIUM="$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
else
    # Linux
    MANIFEST_DIR="$HOME/.config/google-chrome/NativeMessagingHosts"
    MANIFEST_DIR_CHROMIUM="$HOME/.config/chromium/NativeMessagingHosts"
fi

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

install_host() {
    local extension_id="${1:-EXTENSION_ID_PLACEHOLDER}"

    info "Installing Brittney Native Messaging Host..."

    # Verify dist directory
    if [ ! -d "$DIST_DIR" ]; then
        error "dist directory not found. Please run 'pnpm build' first."
    fi

    # Verify host script
    if [ ! -f "$HOST_PATH" ]; then
        error "native-messaging-host.js not found in dist. Please run 'pnpm build' first."
    fi

    # Find Node.js
    NODE_PATH=$(which node 2>/dev/null || echo "")
    if [ -z "$NODE_PATH" ]; then
        error "Node.js not found. Please install Node.js."
    fi
    info "Using Node.js: $NODE_PATH"

    # Create wrapper script
    WRAPPER_PATH="$DIST_DIR/brittney-host"
    cat > "$WRAPPER_PATH" << EOF
#!/bin/bash
exec "$NODE_PATH" "$HOST_PATH" "\$@"
EOF
    chmod +x "$WRAPPER_PATH"
    info "Created wrapper script: $WRAPPER_PATH"

    # Create manifest
    cat > "$MANIFEST_PATH" << EOF
{
  "name": "$HOST_NAME",
  "description": "Brittney MCP Native Messaging Host - Connects IDE agents to Hololand DevTools",
  "path": "$WRAPPER_PATH",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$extension_id/"
  ]
}
EOF
    info "Created manifest: $MANIFEST_PATH"

    # Install for Chrome
    if [ -n "$MANIFEST_DIR" ]; then
        mkdir -p "$MANIFEST_DIR"
        ln -sf "$MANIFEST_PATH" "$MANIFEST_DIR/$HOST_NAME.json"
        info "Linked manifest to Chrome: $MANIFEST_DIR"
    fi

    # Install for Chromium
    if [ -n "$MANIFEST_DIR_CHROMIUM" ]; then
        mkdir -p "$MANIFEST_DIR_CHROMIUM"
        ln -sf "$MANIFEST_PATH" "$MANIFEST_DIR_CHROMIUM/$HOST_NAME.json"
        info "Linked manifest to Chromium: $MANIFEST_DIR_CHROMIUM"
    fi

    success "Installation complete!"
    echo ""
    echo -e "${YELLOW}Extension ID:${NC} $extension_id"
    echo -e "${YELLOW}Manifest Path:${NC} $MANIFEST_PATH"
    echo ""
    echo "Next steps:"
    echo "1. Load the extension in Chrome (chrome://extensions)"
    echo "2. Copy the extension ID"
    echo "3. Run: ./install-unix.sh <your-extension-id>"
    echo "4. Restart Chrome"
}

uninstall_host() {
    info "Uninstalling Brittney Native Messaging Host..."

    # Remove Chrome manifest
    if [ -f "$MANIFEST_DIR/$HOST_NAME.json" ]; then
        rm -f "$MANIFEST_DIR/$HOST_NAME.json"
        info "Removed Chrome manifest"
    fi

    # Remove Chromium manifest
    if [ -f "$MANIFEST_DIR_CHROMIUM/$HOST_NAME.json" ]; then
        rm -f "$MANIFEST_DIR_CHROMIUM/$HOST_NAME.json"
        info "Removed Chromium manifest"
    fi

    # Remove wrapper script
    if [ -f "$DIST_DIR/brittney-host" ]; then
        rm -f "$DIST_DIR/brittney-host"
        info "Removed wrapper script"
    fi

    success "Uninstallation complete!"
}

# Parse arguments
case "${1:-}" in
    --uninstall|-u)
        uninstall_host
        ;;
    --help|-h)
        echo "Brittney Native Messaging Host Installer"
        echo ""
        echo "Usage:"
        echo "  ./install-unix.sh [extension-id]  Install with optional extension ID"
        echo "  ./install-unix.sh --uninstall     Uninstall the host"
        echo "  ./install-unix.sh --help          Show this help"
        ;;
    *)
        install_host "$1"
        ;;
esac
