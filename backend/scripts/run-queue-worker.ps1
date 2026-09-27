# Keeps the queue worker (dispatches booking/hire-request notifications)
# alive across crashes/reboots. Registered as a scheduled task that starts
# at logon — see scripts/install-services.ps1.
$backend = Split-Path -Parent $PSScriptRoot
$php = "D:\laragon\bin\php\php-8.2.26-nts-Win32-vs16-x64\php.exe"
$log = Join-Path $backend "storage\logs\queue-worker.log"

Set-Location $backend

while ($true) {
    "[$(Get-Date -Format s)] Starting queue:work..." | Out-File -FilePath $log -Append -Encoding utf8
    & $php artisan queue:work --tries=3 --sleep=1 --max-time=3600 *>> $log
    "[$(Get-Date -Format s)] queue:work exited (code $LASTEXITCODE) — restarting in 5s" | Out-File -FilePath $log -Append -Encoding utf8
    Start-Sleep -Seconds 5
}
