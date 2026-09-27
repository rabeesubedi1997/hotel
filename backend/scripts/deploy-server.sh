#!/usr/bin/env bash
# Run this ON THE SERVER after every `git pull` (or let deploy-local.sh's
# instructions remind you to). Handles the entire backend side: dependency
# install, migrations, and cache rebuilds — using the correct CLI PHP
# binary explicitly, since the bare `php` in PATH on this box resolves to
# a CGI/FastCGI build (LiteSpeed's lsphp) that breaks artisan/composer.
#
# CLI_PHP_BIN is server-specific — found by checking `php -v` under each
# /opt/cpanel/ea-phpXX/root/usr/bin/php until one reports "(cli)" and the
# right version (see the conversation that debugged this). Update it if
# this script ever runs on a different server.
set -euo pipefail
cd "$(dirname "$0")/.."

CLI_PHP_BIN="/opt/cpanel/ea-php82/root/usr/bin/php"
export PATH="$(dirname "$CLI_PHP_BIN"):$PATH"

echo "==> Pulling latest code..."
git pull origin main

echo "==> Installing PHP dependencies..."
composer install --no-dev --optimize-autoloader

echo "==> Running migrations..."
php artisan migrate --force

echo "==> Syncing role permissions (safe to re-run — updateOrCreate)..."
php artisan db:seed --class=RoleSeeder --force

echo "==> Linking storage (safe if already linked)..."
php artisan storage:link || true

echo "==> Rebuilding caches..."
php artisan config:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "==> Done. Backend is up to date."
echo "    (One-time only, if not already set up: two cron jobs for"
echo "    schedule:run and queue:work — see deployment notes.)"
