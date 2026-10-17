#!/usr/bin/env bash
# Names, packages and verifies Habit APKs. Used by .github/workflows/android-apk.yml,
# and runnable locally, for example on an APK artifact downloaded from a workflow run.
#
#   scripts/android-apk.sh name    <debug|release>
#       Prints the APK file name: habit-v1.0.1.apk for a version tag,
#       habit-v1.0.1-<sha7>.apk for a manual build (…-debug.apk for debug builds).
#   scripts/android-apk.sh package <debug|release> <built.apk> <dir>
#       Copies the Gradle output into an empty <dir> under that name, writes its
#       .sha256 next to it, then runs verify on <dir>.
#   scripts/android-apk.sh verify  <debug|release> <dir>
#       Checks that <dir> holds exactly the expected APK and its .sha256, that the
#       checksum matches, that apksigner accepts the signature, that the package name
#       and version match package.json and, for release, that the APK isn't debuggable
#       and is signed by exactly one certificate whose SHA-256 is EXPECTED_CERT.
#
# Environment:
#   EXPECTED_CERT  release certificate SHA-256 (colons and case don't matter); required
#                  to verify a release APK
#   TAG            version tag whose APK to expect (Actions: the pushed tag)
#   SHA            commit of a manual build (Actions: GITHUB_SHA; default: HEAD)
#   BUILD_TOOLS    Android build-tools directory (default: newest under ANDROID_HOME)
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)

fail() { echo "::error::$*" >&2; exit 1; }

sha256() { if command -v sha256sum >/dev/null; then sha256sum "$@"; else shasum -a 256 "$@"; fi; }

check_variant() {
  case "${1:-}" in
    debug|release) ;;
    *) fail "Variant must be 'debug' or 'release', not '${1:-}'" ;;
  esac
}

version() { node -p "require(process.argv[1]).version" "$ROOT/package.json"; }

apk_name() {
  local variant=$1 tag label
  tag=${TAG:-}
  [ -z "$tag" ] && [ "${GITHUB_EVENT_NAME:-}" = push ] && tag=${GITHUB_REF_NAME:-}
  if [ -n "$tag" ]; then
    [ "$variant" = release ] || fail "A version tag ($tag) only ever gets a release APK"
    label=$tag
  else
    local sha=${SHA:-${GITHUB_SHA:-$(git -C "$ROOT" rev-parse HEAD)}}
    label="v$(version)-${sha:0:7}"
  fi
  if [ "$variant" = debug ]; then echo "habit-$label-debug.apk"; else echo "habit-$label.apk"; fi
}

tools() {
  local dir=${BUILD_TOOLS:-}
  if [ -z "$dir" ]; then
    local sdk=${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}
    [ -n "$sdk" ] && [ -d "$sdk/build-tools" ] || fail "Set ANDROID_HOME or BUILD_TOOLS to find apksigner and aapt2"
    dir=$(find "$sdk/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -1)
  fi
  [ -x "$dir/apksigner" ] && [ -x "$dir/aapt2" ] || fail "No apksigner and aapt2 in $dir"
  echo "$dir"
}

verify() {
  local variant=$1 dir=$2 apk build_tools package name_version code certs actual expected
  apk=$(apk_name "$variant")
  [ -d "$dir" ] || fail "No APK directory at $dir"

  # Exactly the APK and its checksum: nothing else (above all, no signing material).
  local listing
  listing=$(cd "$dir" && LC_ALL=C ls -A)
  [ "$listing" = "$(printf '%s\n%s' "$apk" "$apk.sha256")" ] ||
    fail "$dir must contain exactly $apk and $apk.sha256, but contains: $(echo "$listing" | tr '\n' ' ')"

  grep -Eqx "[0-9a-f]{64}  $(printf '%s' "$apk" | sed 's/[.]/[.]/g')" "$dir/$apk.sha256" ||
    fail "$apk.sha256 is not a single SHA-256 line for $apk"
  (cd "$dir" && sha256 -c "$apk.sha256") || fail "$apk does not match $apk.sha256"

  build_tools=$(tools)
  certs=$("$build_tools/apksigner" verify --verbose --print-certs "$dir/$apk") ||
    fail "apksigner rejected the signature of $apk"
  echo "$certs"

  code=$(version | node -p "const [a,b,c]=require('fs').readFileSync(0,'utf8').trim().split('-')[0].split('.').map(Number); a*10000+b*100+c")
  if [ "$variant" = release ]; then
    package=com.ayush8311.habit; name_version=$(version)
  else
    package=com.ayush8311.habit.debug; name_version="$(version)-debug"
  fi
  local badging
  badging=$("$build_tools/aapt2" dump badging "$dir/$apk") || fail "aapt2 could not read $apk"
  echo "$badging" | head -1
  echo "$badging" | grep -q "^package: name='$package' versionCode='$code' versionName='$name_version'" ||
    fail "$apk is not $package $name_version ($code)"

  if [ "$variant" = release ]; then
    ! echo "$badging" | grep -q '^application-debuggable' || fail "$apk is debuggable; a release APK must not be"
    [ -n "${EXPECTED_CERT:-}" ] ||
      fail "Set EXPECTED_CERT (the repository variable ANDROID_SIGNING_CERT_SHA256) to the release certificate's SHA-256 to verify a release APK"
    [ "$(echo "$certs" | grep -c 'certificate SHA-256 digest')" = 1 ] || fail "$apk must have exactly one signer"
    actual=$(echo "$certs" | grep -m1 'certificate SHA-256 digest' | awk '{print $NF}')
    expected=$(echo "$EXPECTED_CERT" | tr -d ': ' | tr 'A-F' 'a-f')
    [ "$actual" = "$expected" ] ||
      fail "$apk is signed with certificate $actual, not the Habit release key $expected. Updates would not install over earlier versions."
    echo "Signed with the Habit release key."
  fi
  echo "Verified $apk ($variant)."
}

package() {
  local variant=$1 src=$2 dir=$3 apk
  [ -f "$src" ] || fail "No APK at $src"
  apk=$(apk_name "$variant")
  if [ -e "$dir" ] && [ -n "$(ls -A "$dir")" ]; then fail "$dir must be empty"; fi
  mkdir -p "$dir"
  cp "$src" "$dir/$apk"
  (cd "$dir" && sha256 "$apk" > "$apk.sha256")
  cat "$dir/$apk.sha256"
  verify "$variant" "$dir"
}

case "${1:-}" in
  name) [ $# = 2 ] || fail "Usage: $0 name <debug|release>"; check_variant "$2"; apk_name "$2" ;;
  package) [ $# = 4 ] || fail "Usage: $0 package <debug|release> <built.apk> <dir>"; check_variant "$2"; package "$2" "$3" "$4" ;;
  verify) [ $# = 3 ] || fail "Usage: $0 verify <debug|release> <dir>"; check_variant "$2"; verify "$2" "$3" ;;
  *) fail "Usage: $0 name|package|verify …" ;;
esac
