#!/usr/bin/env bash
# Finds the deployed Habit app and confirms it is live before a release is published.
# Used by .github/workflows/release.yml; can be run locally with the same variables:
#
#   GH_REPO=Ayush8311/habits scripts/check-live-app.sh
#   APP_URL=https://example.com/ scripts/check-live-app.sh
#
# The address comes from APP_URL if set, otherwise from the repository's GitHub Pages
# site. On success it prints the address (with a trailing slash) on stdout.
set -euo pipefail

fail() {
  echo "::error::$1" >&2
  exit 1
}

url="${APP_URL:-}"
if [ -z "$url" ]; then
  # gh prints the API's error body on stdout when the request fails (for example a
  # 404 when Pages isn't enabled), so only use its output if it succeeded.
  if ! url="$(gh api "repos/${GH_REPO:?GH_REPO is required}/pages" --jq '.html_url // empty' 2>/dev/null)"; then
    url=""
  fi
fi

[ -n "$url" ] || fail "No deployed app found: GitHub Pages isn't enabled for $GH_REPO. Enable it (Settings → Pages → Source: GitHub Actions), run 'Deploy to GitHub Pages', then re-run this workflow. Or set the APP_URL repository variable."
[[ "$url" == https://* ]] || fail "The app address must use HTTPS to be installable; got '$url'."
url="${url%/}/"

if ! manifest="$(curl -fsSL --max-time 30 "${url}manifest.webmanifest")"; then
  fail "${url}manifest.webmanifest could not be loaded. Deploy the site (Actions → Deploy to GitHub Pages), then re-run this workflow."
fi
echo "$manifest" | jq -e '.name == "Habit"' >/dev/null 2>&1 ||
  fail "${url}manifest.webmanifest is not Habit's manifest. Check the deployed site, then re-run this workflow."

echo "$url"
