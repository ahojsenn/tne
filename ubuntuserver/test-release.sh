#!/bin/bash
# Exercises release.sh against a throwaway root with a stubbed systemd and
# curl. Touches nothing in production. Run it on the server (it needs /proc
# and GNU coreutils):
#
#   scp ubuntuserver/release.sh ubuntuserver/test-release.sh hannes@host:/tmp/
#   ssh hannes@host 'bash /tmp/test-release.sh /tmp/release.sh'
set -uo pipefail

RELEASE_SH=${1:?usage: test-release.sh /path/to/release.sh}
BASE=/tmp/tnetest
STUB=$BASE/stub
export TNE_ROOT=$BASE/root
export TNE_SERVICE=faketne.service
export TNE_LOCAL_URL=http://127.0.0.1:59999/local
export TNE_PUBLIC_URL=http://127.0.0.1:59999/public
export TNE_LOG_FILE=$BASE/fake.log
export TNE_MAX_RETRIES=2
export TNE_RETRY_INTERVAL=1
export TNE_KEEP_RELEASES=3

PASS=0; FAIL=0
ok()   { echo "  ✅ $*"; PASS=$((PASS+1)); }
bad()  { echo "  ❌ $*"; FAIL=$((FAIL+1)); }
check(){ if [ "$2" = "$3" ]; then ok "$1 ($2)"; else bad "$1 — expected '$3', got '$2'"; fi; }

cleanup() {
  [ -f "$BASE/running_pid" ] && kill "$(cat "$BASE/running_pid")" 2>/dev/null
  rm -rf "$BASE"
}
trap cleanup EXIT

rm -rf "$BASE"
mkdir -p "$STUB" "$TNE_ROOT/shared" "$TNE_ROOT/releases" "$TNE_ROOT/incoming"
echo "SESSION_SECRET=fake" > "$TNE_ROOT/shared/.env"
echo 200 > "$BASE/http_status"
: > "$BASE/running_pid"

# --- stubs -----------------------------------------------------------------
# sudo: strip flags, and redirect the absolute systemctl path to our stub.
cat > "$STUB/sudo" <<STUBEOF
#!/bin/bash
while [ \$# -gt 0 ]; do case "\$1" in -n|-A|-H) shift ;; *) break ;; esac; done
if [ "\${1:-}" = "/usr/bin/systemctl" ]; then shift; exec "$STUB/systemctl" "\$@"; fi
exec "\$@"
STUBEOF

# systemctl: `restart` launches a real background process whose cwd IS the
# resolved current release, so release.sh's /proc/<pid>/cwd verification is
# exercised for real rather than mocked away.
cat > "$STUB/systemctl" <<STUBEOF
#!/bin/bash
case "\$1" in
  restart)
    old=\$(cat "$BASE/running_pid" 2>/dev/null)
    [ -n "\$old" ] && kill "\$old" 2>/dev/null
    target=\$(readlink -f "$TNE_ROOT/current")
    cd "\$target" || exit 1
    sleep 300 &
    echo \$! > "$BASE/running_pid"
    ;;
  show)      cat "$BASE/running_pid" ;;
  is-active) echo active ;;
esac
exit 0
STUBEOF

# curl: report whatever status the test has staged.
cat > "$STUB/curl" <<STUBEOF
#!/bin/bash
cat "$BASE/http_status"
exit 0
STUBEOF

chmod +x "$STUB"/*
export PATH="$STUB:$PATH"

make_tarball() { # make_tarball <id> [--broken]
  local id=$1 broken=${2:-}
  local d="$BASE/build/$id"
  rm -rf "$d"; mkdir -p "$d/ubuntuserver"
  if [ "$broken" != "--broken" ]; then
    mkdir -p "$d/.output/server"
    echo "// $id" > "$d/.output/server/index.mjs"
  else
    mkdir -p "$d/.output"
  fi
  echo "release=$id" > "$d/RELEASE_INFO"
  tar -czf "$TNE_ROOT/incoming/$id.tar.gz" -C "$d" .
  echo "$TNE_ROOT/incoming/$id.tar.gz"
}

live_id()    { basename "$(readlink -f "$TNE_ROOT/current")"; }
running_cwd(){ readlink -f "/proc/$(cat "$BASE/running_pid")/cwd"; }

echo "=== 1. activate first release ==="
t=$(make_tarball 20260101T000000Z-aaaaaaa)
"$RELEASE_SH" activate "$t" >"$BASE/out1" 2>&1; rc=$?
check "exit code" "$rc" "0"
check "current" "$(live_id)" "20260101T000000Z-aaaaaaa"
check "running from release" "$(running_cwd)" "$(readlink -f "$TNE_ROOT/releases/20260101T000000Z-aaaaaaa")"
check ".env symlink resolves" "$(cat "$TNE_ROOT/current/.env")" "SESSION_SECRET=fake"
check "tarball consumed" "$([ -f "$t" ] && echo present || echo gone)" "gone"

echo "=== 2. activate second release ==="
t=$(make_tarball 20260102T000000Z-bbbbbbb)
"$RELEASE_SH" activate "$t" >"$BASE/out2" 2>&1; rc=$?
check "exit code" "$rc" "0"
check "current" "$(live_id)" "20260102T000000Z-bbbbbbb"

echo "=== 3. unhealthy release rolls back ==="
echo 500 > "$BASE/http_status"
t=$(make_tarball 20260103T000000Z-ccccccc)
"$RELEASE_SH" activate "$t" >"$BASE/out3" 2>&1; rc=$?
echo 200 > "$BASE/http_status"
check "exit code (failure)" "$rc" "1"
check "rolled back to previous" "$(live_id)" "20260102T000000Z-bbbbbbb"
check "running from previous" "$(running_cwd)" "$(readlink -f "$TNE_ROOT/releases/20260102T000000Z-bbbbbbb")"
grep -q "rolling back" "$BASE/out3" && ok "logged the rollback" || bad "no rollback message"

echo "=== 4. auto rollback skips the release that just failed ==="
# ccccccc is the newest release on disk but it failed verification, so a
# no-argument rollback must step over it to aaaaaaa.
"$RELEASE_SH" rollback >"$BASE/out4" 2>&1; rc=$?
check "exit code" "$rc" "0"
check "skipped the failed release" "$(live_id)" "20260101T000000Z-aaaaaaa"
"$RELEASE_SH" list > "$BASE/out4b" 2>&1
grep -q "20260103T000000Z-ccccccc (failed verification)" "$BASE/out4b" \
  && ok "list marks the failed release" || bad "failed release not marked in list"

echo "=== 5. rollback to a named release ==="
"$RELEASE_SH" rollback 20260102T000000Z-bbbbbbb >"$BASE/out5" 2>&1; rc=$?
check "exit code" "$rc" "0"
check "current" "$(live_id)" "20260102T000000Z-bbbbbbb"

echo "=== 6. broken tarball is refused ==="
t=$(make_tarball 20260104T000000Z-ddddddd --broken)
"$RELEASE_SH" activate "$t" >"$BASE/out6" 2>&1; rc=$?
check "exit code (refused)" "$rc" "1"
check "current unchanged" "$(live_id)" "20260102T000000Z-bbbbbbb"
grep -q "no .output/server/index.mjs" "$BASE/out6" && ok "explains why" || bad "unclear error"

echo "=== 7. duplicate release id is refused ==="
t=$(make_tarball 20260101T000000Z-aaaaaaa)
"$RELEASE_SH" activate "$t" >"$BASE/out7" 2>&1; rc=$?
check "exit code (refused)" "$rc" "1"
grep -q "already exists" "$BASE/out7" && ok "explains why" || bad "unclear error"

echo "=== 8. pruning keeps TNE_KEEP_RELEASES plus the live one ==="
for n in 5 6 7; do
  t=$(make_tarball "2026010${n}T000000Z-eeeeee$n")
  "$RELEASE_SH" activate "$t" >>"$BASE/out8" 2>&1
done
count=$(ls -1 "$TNE_ROOT/releases" | wc -l | tr -d ' ')
check "release count" "$count" "3"
check "live release survived" "$(live_id)" "20260107T000000Z-eeeeee7"

echo "=== 9. status and list ==="
"$RELEASE_SH" status > "$BASE/out9" 2>&1
grep -q "current release : 20260107T000000Z-eeeeee7" "$BASE/out9" && ok "status shows live release" || bad "status wrong"
grep -q "release=20260107T000000Z-eeeeee7" "$BASE/out9" && ok "status shows RELEASE_INFO" || bad "no RELEASE_INFO"
"$RELEASE_SH" list > "$BASE/out10" 2>&1
grep -q "^\* 20260107T000000Z-eeeeee7 (live)" "$BASE/out10" && ok "list marks live release" || bad "list wrong"

echo "=== 10. bad usage exits 2 ==="
"$RELEASE_SH" bogus >/dev/null 2>&1; check "exit code" "$?" "2"

echo ""
echo "passed: $PASS   failed: $FAIL"
[ "$FAIL" -eq 0 ]
