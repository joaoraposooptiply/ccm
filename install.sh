#!/usr/bin/env bash
set -euo pipefail

# CCM installer
# Usage: curl -fsSL https://raw.githubusercontent.com/joaoraposooptiply/ccm/main/install.sh | bash

REPO="https://github.com/joaoraposooptiply/ccm.git"
INSTALL_DIR="${CCM_INSTALL_DIR:-$HOME/.local/share/ccm}"
BIN_DIR="${CCM_BIN_DIR:-$HOME/.local/bin}"

info()  { printf "\033[0;34m%s\033[0m\n" "$*"; }
ok()    { printf "\033[0;32m%s\033[0m\n" "$*"; }
err()   { printf "\033[0;31m%s\033[0m\n" "$*" >&2; }

# Check prerequisites
for cmd in node npm git; do
  if ! command -v "$cmd" &>/dev/null; then
    err "Required: $cmd — install it first."
    exit 1
  fi
done

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if (( NODE_MAJOR < 20 )); then
  err "Node.js >= 20 required (found $(node -v))."
  exit 1
fi

if [[ "$(uname)" != "Darwin" ]]; then
  err "CCM requires macOS (uses Keychain for credential storage)."
  exit 1
fi

# Clone or update
if [[ -d "$INSTALL_DIR" ]]; then
  info "Updating CCM..."
  cd "$INSTALL_DIR"
  git pull --ff-only
else
  info "Installing CCM to $INSTALL_DIR..."
  git clone "$REPO" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# Install deps and build
info "Installing dependencies..."
npm ci --ignore-scripts 2>/dev/null || npm install
info "Building..."
npm run build

# Link binary
mkdir -p "$BIN_DIR"
ln -sf "$INSTALL_DIR/bin/ccm.js" "$BIN_DIR/ccm"
chmod +x "$BIN_DIR/ccm"

# Create data directory
mkdir -p "$HOME/.ccm"

# Check PATH
if ! echo "$PATH" | tr ':' '\n' | grep -qx "$BIN_DIR"; then
  echo ""
  info "Add this to your shell profile (~/.zshrc or ~/.bashrc):"
  echo ""
  echo "  export PATH=\"$BIN_DIR:\$PATH\""
  echo ""
fi

echo ""
ok "CCM installed successfully!"
echo ""
echo "  Run 'ccm' to get started."
echo "  Run 'ccm --help' for all commands."
echo ""
echo "  Optional: add active profile to your prompt:"
echo ""
echo "    # Add to ~/.zshrc"
echo '    ccm_prompt_info() {'
echo '      local f="$HOME/.ccm/active.json"'
echo '      [[ -f "$f" ]] || return'
echo '      local name'
echo '      name=$(python3 -c "import json; print(json.load(open('\''$f'\''))['\''profileName'\''])" 2>/dev/null) || return'
echo '      echo "%F{magenta}[$name]%f "'
echo '    }'
echo '    PROMPT='\''$(ccm_prompt_info)'\''"\$PROMPT"'
echo ""
