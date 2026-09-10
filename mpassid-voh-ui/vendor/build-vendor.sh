#!/usr/bin/env bash
# Build the vendored @visma/* packages from their local src/ into lib/.
# Run this after editing any package's source (see vendor/README.md).
#
# Requires the app's dev dependencies to be installed (`npm ci` in
# mpassid-voh-ui/), which provides the hoisted `tsc` and each package's type
# dependencies.
#
# Build order matters:
#   - react-app-locale-utils / react-intl-bundled-messages / vite-plugin-*
#     reference ../public.config/src types, so public.config's src must exist
#     (building it first also keeps things tidy).
#   - formatjs-scripts imports the *built* lib/ of react-app-locale-utils and
#     react-intl-bundled-messages, so it must build last.
set -euo pipefail

PACKAGES=(
  public.config
  react-app-locale-utils
  react-intl-bundled-messages
  vite-plugin-super-template
  formatjs-scripts
)

cd "$(dirname "$0")/@visma"

for pkg in "${PACKAGES[@]}"; do
  echo "== building @visma/$pkg =="
  ( cd "$pkg" && npm run build )
done

echo "All vendor packages built."
