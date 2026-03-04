#!/usr/bin/env bash
set -euo pipefail

REPO_URL_DEFAULT="https://github.com/Luccas-carvalho/capitao-diff.git"
INSTALL_DIR_DEFAULT="$HOME/.capitao-diff"
BRANCH_DEFAULT="main"
TARGETS_DEFAULT="cursor,codex,claude"

REPO_URL="$REPO_URL_DEFAULT"
INSTALL_DIR="$INSTALL_DIR_DEFAULT"
BRANCH="$BRANCH_DEFAULT"
TARGETS="$TARGETS_DEFAULT"
SKIP_PLAYWRIGHT="false"

print_help() {
  cat <<'HELP'
Capitao Diff one-command MCP installer

Options:
  --repo <url>             Git repository URL
  --dir <path>             Install/update directory
  --branch <name>          Git branch to checkout
  --targets <list>         Comma list: cursor,codex,claude
  --skip-playwright        Skip Playwright Chromium installation
  --help                   Show this help
HELP
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO_URL="$2"
      shift 2
      ;;
    --dir)
      INSTALL_DIR="$2"
      shift 2
      ;;
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    --targets)
      TARGETS="$2"
      shift 2
      ;;
    --skip-playwright)
      SKIP_PLAYWRIGHT="true"
      shift
      ;;
    --help)
      print_help
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      print_help
      exit 1
      ;;
  esac
done

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing dependency: $1"
    exit 1
  fi
}

require_cmd git
require_cmd node
require_cmd pnpm

if [[ -d "$INSTALL_DIR/.git" ]]; then
  echo "Updating existing installation in $INSTALL_DIR"
  git -C "$INSTALL_DIR" fetch --depth 1 origin "$BRANCH"
  git -C "$INSTALL_DIR" checkout "$BRANCH"
  git -C "$INSTALL_DIR" pull --ff-only origin "$BRANCH"
elif [[ -e "$INSTALL_DIR" ]]; then
  echo "Install directory exists but is not a git repo: $INSTALL_DIR"
  echo "Use --dir with an empty path or remove this directory manually."
  exit 1
else
  echo "Cloning repository into $INSTALL_DIR"
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
fi

echo "Installing dependencies"
pnpm --dir "$INSTALL_DIR" install

echo "Building MCP server"
pnpm --dir "$INSTALL_DIR" -r --filter @capitao-diff/mcp-server... build

if [[ "$SKIP_PLAYWRIGHT" != "true" ]]; then
  echo "Installing Playwright Chromium"
  pnpm --dir "$INSTALL_DIR" exec playwright install chromium
fi

echo "Configuring MCP clients: $TARGETS"
node "$INSTALL_DIR/scripts/install-mcp-clients.mjs" \
  --cwd "$INSTALL_DIR" \
  --server "$INSTALL_DIR/packages/mcp-server/dist/index.js" \
  --targets "$TARGETS"

echo "Done. Restart your MCP client(s)."
