#!/usr/bin/env bash
#
# Installe MyElec en LaunchDaemon sur macOS (Mac mini, démarre au boot).
# Build le frontend Vite avant d'installer le service ; le `server.js` sert
# alors dist/ + /api sur un seul port.
#
#   ./deploy/setup-macmini.sh              installe / met à jour le service
#   ./deploy/setup-macmini.sh --uninstall  arrête et retire le service
#
set -euo pipefail

LABEL="com.myelec.app"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_USER="$(id -un)"
USER_HOME="$HOME"
PLIST_DIR="/Library/LaunchDaemons"
PLIST="$PLIST_DIR/$LABEL.plist"
DOMAIN="system"
LOG_DIR="$USER_HOME/Library/Logs/MyElec"

reload_service() {
  sudo launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
  sudo launchctl bootstrap "$DOMAIN" "$PLIST"
  sudo launchctl kickstart -k "$DOMAIN/$LABEL" 2>/dev/null || true
}

if [[ "${1:-}" == "--uninstall" ]]; then
  echo "→ Désinstallation du service $LABEL…"
  sudo launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
  sudo rm -f "$PLIST"
  echo "✓ Service supprimé. Les données dans $APP_DIR/data sont conservées."
  exit 0
fi

NODE_BIN="$(command -v node || true)"
NPM_BIN="$(command -v npm || true)"
[[ -n "$NODE_BIN" ]] || { echo "✗ Node.js introuvable. brew install node." >&2; exit 1; }
[[ -n "$NPM_BIN"  ]] || { echo "✗ npm introuvable." >&2; exit 1; }

echo "→ Application : $APP_DIR"
echo "→ Node        : $NODE_BIN ($("$NODE_BIN" --version))"
echo "→ Utilisateur : $RUN_USER"

# .env minimal si absent
if [[ ! -f "$APP_DIR/.env" ]]; then
  cat > "$APP_DIR/.env" <<'EOF'
PORT=3002
EOF
  echo "→ .env créé (PORT=3002)."
fi

PORT="$(grep -E '^[[:space:]]*PORT[[:space:]]*=' "$APP_DIR/.env" 2>/dev/null | tail -n 1 | sed -E 's/^[^=]*=[[:space:]]*//; s/[[:space:]]+$//; s/^"(.*)"$/\1/' | sed -E "s/^'(.*)'\$/\1/")" || true
PORT="${PORT:-3002}"

echo "→ Installation des dépendances (dev incluses, requises pour 'vite build')…"
( cd "$APP_DIR" && "$NPM_BIN" install --no-audit --no-fund )

echo "→ Build du frontend (vite build → dist/)…"
( cd "$APP_DIR" && "$NPM_BIN" run build )

mkdir -p "$LOG_DIR"

PLIST_BODY="$(cat <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>UserName</key><string>$RUN_USER</string>
  <key>WorkingDirectory</key><string>$APP_DIR</string>
  <key>ProgramArguments</key>
  <array>
    <string>$NODE_BIN</string>
    <string>$APP_DIR/server.js</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>NODE_ENV</key><string>production</string>
    <key>PORT</key><string>$PORT</string>
    <key>HOME</key><string>$USER_HOME</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>$LOG_DIR/myelec.out.log</string>
  <key>StandardErrorPath</key><string>$LOG_DIR/myelec.err.log</string>
</dict>
</plist>
PLIST_EOF
)"

echo "→ Écriture du plist (sudo demandé) : $PLIST"
sudo mkdir -p "$PLIST_DIR"
echo "$PLIST_BODY" | sudo tee "$PLIST" > /dev/null
sudo chown root:wheel "$PLIST"
sudo chmod 644 "$PLIST"

reload_service

RUNNING=""
for _ in 1 2 3 4 5 6; do
  sleep 1
  if sudo launchctl print "$DOMAIN/$LABEL" 2>/dev/null | grep -qE '^[[:space:]]*pid = '; then RUNNING=1; break; fi
done

IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)"
echo
if [[ -n "$RUNNING" ]]; then
  echo "✓ MyElec tourne en LaunchDaemon — démarrera au boot."
  echo "  • Sur ce Mac          : http://localhost:$PORT"
  [[ -n "$IP" ]] && echo "  • Sur le réseau local : http://$IP:$PORT"
else
  echo "⚠ Service installé mais process pas en vie. Détails :"
  sudo launchctl print "$DOMAIN/$LABEL" 2>/dev/null | grep -E 'state =|last exit code' | sed 's/^/    /' || true
  echo "  Log d'erreur :"
  tail -n 20 "$LOG_DIR/myelec.err.log" 2>/dev/null | sed 's/^/    /' || echo "    (log absent)"
  echo "  Teste à la main :  (cd \"$APP_DIR\" && PORT=$PORT node server.js)"
fi
echo "  • Logs         : $LOG_DIR/"
echo "  • Redémarrer   : sudo launchctl kickstart -k $DOMAIN/$LABEL"
echo "  • Désinstaller : ./deploy/setup-macmini.sh --uninstall"
echo
echo "Ensuite, exposer publiquement via le tunnel partagé :"
echo "  ../MyMemory/deploy/setup-cloudflared.sh -H myelec.rioloco.net -p $PORT"
