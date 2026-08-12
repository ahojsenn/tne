# Deploying tne

Production is `konfi.kommitment.works`, a single Ubuntu 24.04 box running the
Nitro build behind nginx. Deploys are tag-triggered GitHub Actions runs.

```
git tag v1.4.0 && git push origin v1.4.0
```

That builds on Node 24.18.0, gates on Playwright, ships a release tarball,
flips a symlink, restarts, verifies, and rolls back on its own if the new
release does not come up healthy.

## Layout on the server

```
/home/hannes/tne/
├── bin/release.sh              release manager (activate / rollback / status / list)
├── shared/.env                 the ONLY copy of production secrets (mode 600)
├── releases/
│   ├── 20260808T094500Z-a1b2c3d/
│   │   ├── .output/            the Nitro build
│   │   ├── .env -> ../../shared/.env
│   │   └── RELEASE_INFO        commit, ref, actor, CI run URL
│   └── …                       last 5 kept, older pruned automatically
├── current -> releases/…       swapped atomically; systemd points here
└── incoming/                   upload staging
```

`tne.service` points at `current`, never at a specific release, so deploying
never touches systemd. Two consequences worth knowing:

- **Secrets never pass through CI.** Each release gets a `.env` symlink to the
  one shared copy. The app's `server/plugins/envCheck.ts` loads it at startup,
  and real environment variables still win over it. This also sidesteps
  systemd's `EnvironmentFile` escaping rules, which would mangle the
  1734-character service-account key.
- **Unit and nginx changes are not part of a deploy.** They go through
  `bootstrap.sh`, run by a human. A deploy's only privileged step is
  `systemctl restart tne.service`.

## One-time setup

### 1. Prepare the server

```bash
scp -r ubuntuserver hannes@konfi.kommitment.works:/tmp/

# See exactly what it would do — changes nothing, but takes the real branches
# for this box (which .env it finds, which build it seeds from):
ssh hannes@konfi.kommitment.works 'bash /tmp/ubuntuserver/bootstrap.sh --dry-run --nginx --yes'

# Then for real:
ssh -t hannes@konfi.kommitment.works 'bash /tmp/ubuntuserver/bootstrap.sh --nginx'
```

`bootstrap.sh` is idempotent — re-run it whenever `tne.service`,
`nginx-tne.conf`, or `release.sh` changes. On the first run it:

- creates the layout above
- moves `/home/hannes/tomatoes-and-eggs/.env` to `shared/.env` and chmods it 600
  (it is currently world-readable at 644)
- seeds release 0 by copying the **currently running** build, so `current` is
  valid before the new unit is installed — no downtime window
- installs `/etc/sudoers.d/tne-deploy`, validated with `visudo -c` before it is
  moved into place
- installs the unit, runs `daemon-reload`, restarts, and health-checks

It prompts before restarting, needs your sudo password, and leaves
`/home/hannes/tomatoes-and-eggs` untouched so the cutover stays reversible.

> Note: the first restart applies `Environment=NODE_ENV=production`, which has
> never actually taken effect (the old deploy script copied the unit but never
> ran `daemon-reload`). That flag switches the app to the production
> spreadsheet and enables real mail delivery. Do this when you can watch it.

### 2. Create a deploy key

Generate a dedicated keypair — do not reuse a personal one:

```bash
ssh-keygen -t ed25519 -N '' -C 'github-actions-tne' -f ./tne-deploy-key
ssh-copy-id -i ./tne-deploy-key.pub hannes@konfi.kommitment.works
#   …or: bootstrap.sh --deploy-key ./tne-deploy-key.pub
ssh-keyscan -t rsa,ecdsa,ed25519 konfi.kommitment.works
```

### 3. Add repository secrets

`Settings → Secrets and variables → Actions`:

| Secret | Value |
| --- | --- |
| `DEPLOY_SSH_KEY` | contents of `tne-deploy-key` (the **private** half, whole file including header/footer lines) |
| `DEPLOY_SSH_KNOWN_HOSTS` | the `ssh-keyscan` output from step 2 |

These already exist for the Playwright gate and are reused as-is:
`SESSION_SECRET`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_SHEETS_SPREADSHEET_ID_DEV`.

Then delete `./tne-deploy-key` from your laptop.

### 4. Optional: require approval

The deploy job declares `environment: production`. Adding a required reviewer
to that environment in repo settings turns every deploy into a click-to-approve
step.

## Day to day

```bash
git tag v1.4.0 && git push origin v1.4.0     # deploy
./deploy.sh --status                          # what is live
./deploy.sh --rollback                        # back to the previous release
./deploy.sh                                   # manual deploy (escape hatch)
```

Or on the server directly:

```bash
~/tne/bin/release.sh status
~/tne/bin/release.sh list
~/tne/bin/release.sh rollback [id]
```

## Logs

The service logs to journald, not to a file:

```bash
./deploy.sh --logs                              # follow production logs over ssh
journalctl -u tne.service -f                    # same, on the server
journalctl -u tne.service -n 200 --no-pager     # recent lines
journalctl -u tne.service --since "1 hour ago"
journalctl -u tne.service -p err                # errors only
```

Reading the unit journal requires membership in `adm` or `systemd-journal`;
`bootstrap.sh` adds it. Group membership only applies to **new** login sessions,
so log out and back in after the first run — until then `journalctl` shows
nothing and `sudo journalctl -u tne.service` is the workaround.

journald on this box stores to `/var/log/journal`, so logs survive reboots and
are vacuumed automatically — unlike the previous `/tmp/tne.log`, which grew
unbounded and was wiped on restart.

`deploy.sh` still works and now goes through the same release manager, so an
emergency manual deploy is rollback-able exactly like a CI one. It tags its
release id `-dirty` when the working tree has uncommitted changes.

## How a deploy verifies itself

In order, all server-side in `release.sh`:

1. unpack, and refuse the release if `.output/server/index.mjs` is missing
2. flip `current` atomically (`ln -sfn` + `mv -T`, so the symlink is never absent)
3. `sudo systemctl restart tne.service`
4. **confirm the running process is the new release** — read the service's
   `MainPID`, resolve `/proc/<pid>/cwd`, and require it to be the release just
   activated. This is the check that would have caught the old bug where a
   deploy landed in a directory systemd never read and still reported success.
5. health-check `localhost:3000` (the app), then the public URL (nginx + TLS)
6. on any failure: flip back to the previous release, restart, re-verify, dump
   the last 40 log lines, exit non-zero

## Testing the release manager

`test-release.sh` drives `release.sh` through activate, failure-with-rollback,
manual rollback, pruning and the refusal paths, against a throwaway root in
`/tmp` with a stubbed systemd and curl. It touches nothing in production, but
it needs `/proc` and GNU coreutils, so run it on the server (or any Linux box):

```bash
scp ubuntuserver/release.sh ubuntuserver/test-release.sh hannes@konfi.kommitment.works:/tmp/
ssh hannes@konfi.kommitment.works 'bash /tmp/test-release.sh /tmp/release.sh'
```

The stubbed `systemctl restart` starts a real background process whose working
directory is the activated release, so the `/proc/<pid>/cwd` check in step 4
above is exercised for real rather than mocked.

## Still open

Known gaps, deliberately not addressed here:

- **Build and runtime Node versions have drifted apart.** The server runs
  20.12.0, but the dependency tree can no longer be built on it —
  `unplugin-utils` requires `>=20.19.0`, and older versions die during
  `nuxt prepare` with `module.createRequire is not a function`. CI therefore
  builds on 24.18.0 and ships the output to a 20.12.0 runtime.

  This works today — the release currently serving production was built on an
  even newer Node (25.x, on a laptop) — and a build too new for the runtime
  would fail the health check and be rolled back automatically. But it is a gap
  worth closing, by installing a current Node on the server and pointing
  `ExecStart` at it:
  ```bash
  ssh hannes@konfi.kommitment.works 'bash -lc "nvm install 24 && nvm alias default 24"'
  # then update ExecStart in tne.service to the new path and re-run bootstrap.sh
  ```
- **No smoke test beyond HTTP 200.** The health check confirms the app answers,
  not that Sheets auth or mail actually work.
- **Single box, no staging.** A bad release is caught by the health check and
  rolled back, but it is caught in production.
- `/home/hannes/tomatoes-and-eggs` (an old unrelated checkout the app used to
  run out of) and the stale `/home/hannes/tne/.output` from June can be deleted
  by hand once a few deploys have gone through cleanly.
