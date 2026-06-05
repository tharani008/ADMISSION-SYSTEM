#!/bin/bash
# =============================================================
#  VPS First-Time Setup Script for Lasak Tech
#  Run this ONCE on your fresh VPS as root or sudo user:
#  bash vps-setup.sh
# =============================================================

set -e   # Exit on any error

echo "========================================"
echo "  Lasak Tech - VPS Initial Setup"
echo "========================================"

# ── 1. System Update ─────────────────────────────────────────
echo ""
echo "[1/8] Updating system packages..."
apt update && apt upgrade -y

# ── 2. Install Node.js 20 ────────────────────────────────────
echo ""
echo "[2/8] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

echo "Node version: $(node -v)"
echo "NPM version:  $(npm -v)"

# ── 3. Install PM2 ───────────────────────────────────────────
echo ""
echo "[3/8] Installing PM2..."
npm install -g pm2
pm2 startup   # generates the systemd startup command — run the printed command!

# ── 4. Install Nginx ─────────────────────────────────────────
echo ""
echo "[4/8] Installing Nginx..."
apt install -y nginx
systemctl enable nginx
systemctl start nginx

# ── 5. Install Certbot (SSL) ─────────────────────────────────
echo ""
echo "[5/8] Installing Certbot for SSL..."
apt install -y certbot python3-certbot-nginx

# ── 6. Create web root directories ───────────────────────────
echo ""
echo "[6/8] Creating web root directories..."
mkdir -p /var/www/admissions.lasakedu.in
mkdir -p /var/www/franchise.lasakedu.in
mkdir -p /var/www/enrolled.lasakedu.in
mkdir -p /var/log/pm2

# ── 7. Clone the GitHub repository ───────────────────────────
echo ""
echo "[7/8] Cloning repository..."
cd /var/www
# REPLACE the URL below with your actual GitHub repo URL
git clone https://github.com/Lasak-Tech/Admission-website.git lasak
cd lasak

echo ""
echo ">>> Creating server/.env from .env.example..."
cp server/.env.example server/.env
echo ">>> IMPORTANT: Edit /var/www/lasak/server/.env with your real values!"
echo ">>> Run: nano /var/www/lasak/server/.env"

# ── 8. Install dependencies & start API ──────────────────────
echo ""
echo "[8/8] Installing server dependencies & starting PM2..."
cd /var/www/lasak/server
npm ci --omit=dev
cd /var/www/lasak
pm2 start ecosystem.config.cjs
pm2 save

echo ""
echo "========================================"
echo "  NEXT STEPS:"
echo "========================================"
echo ""
echo "1. Edit your .env file:"
echo "   nano /var/www/lasak/server/.env"
echo ""
echo "2. Copy nginx config:"
echo "   cp /var/www/lasak/nginx.conf /etc/nginx/sites-available/lasak"
echo "   ln -s /etc/nginx/sites-available/lasak /etc/nginx/sites-enabled/"
echo "   nginx -t && systemctl reload nginx"
echo ""
echo "3. Get SSL certificates:"
echo "   certbot --nginx -d admissions.lasakedu.in -d franchise.lasakedu.in -d enrolled.lasakedu.in -d api.lasakedu.in"
echo ""
echo "4. Add a GitHub deploy key:"
echo "   ssh-keygen -t ed25519 -C 'vps-deploy-key'"
echo "   cat ~/.ssh/id_ed25519.pub   # add this as a Deploy Key in GitHub"
echo ""
echo "5. Set GitHub Secrets (Settings > Secrets > Actions):"
echo "   VPS_HOST        = your VPS IP or hostname"
echo "   VPS_USER        = root (or your user)"
echo "   VPS_SSH_KEY     = contents of ~/.ssh/id_ed25519 (private key)"
echo "   VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, etc."
echo ""
echo "Done! Visit http://YOUR_VPS_IP to test Nginx."
