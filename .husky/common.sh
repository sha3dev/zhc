# Load nvm if it exists
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
fi

# Prefer the repo-declared Node version when available
if command -v nvm >/dev/null 2>&1 && [ -f ".nvmrc" ]; then
  nvm use --silent >/dev/null 2>&1 || true
fi

# Try to find node in common locations and add to PATH
if [ -d "$HOME/.nvm" ]; then
  # Add nvm to PATH
  export PATH="$HOME/.nvm:$PATH"

  # Try to find the current node version
  if [ -f "$NVM_DIR/alias/default" ]; then
    DEFAULT_NODE=$(cat "$NVM_DIR/alias/default" 2>/dev/null || echo "default")
    if [ -d "$NVM_DIR/versions/node/$DEFAULT_NODE/bin" ]; then
      export PATH="$NVM_DIR/versions/node/$DEFAULT_NODE/bin:$PATH"
    fi
  fi

  # If default didn't work, try to find any node version
  if ! command -v node &> /dev/null && [ -d "$NVM_DIR/versions/node" ]; then
    LATEST_NODE=$(ls -1 "$NVM_DIR/versions/node" 2>/dev/null | sort -V | tail -1)
    if [ -n "$LATEST_NODE" ]; then
      export PATH="$NVM_DIR/versions/node/$LATEST_NODE/bin:$PATH"
    fi
  fi
fi

# Fallback to common Node locations
export PATH="$PATH:/usr/local/bin:/usr/bin:$HOME/node_modules/.bin"
