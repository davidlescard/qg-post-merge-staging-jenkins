#!/usr/bin/env bash
# Single entry point for local and CI tasks. Usage: ./build.sh [task]
set -euo pipefail
cd "$(dirname "$0")"

usage() {
  echo "Usage: ./build.sh [install|compile|test|test-junit|build|start|e2e|all]"
  echo "  all (default): install, compile, test, build"
}

task="${1:-all}"

case "$task" in
  install)   pnpm install --frozen-lockfile ;;
  compile)   pnpm run compile ;;
  test)      pnpm test ;;
  test-junit) pnpm run test:junit ;;
  build)     pnpm run build ;;
  start)     pnpm start ;;
  e2e)       pnpm run test:e2e ;;
  all)
    pnpm install --frozen-lockfile
    pnpm run compile
    pnpm test
    pnpm run build
    ;;
  -h|--help|help) usage ;;
  *) usage; exit 1 ;;
esac
