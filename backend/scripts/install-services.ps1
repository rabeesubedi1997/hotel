# Registers three Windows Scheduled Tasks so the instant-booking-notification
# feature survives reboots without Laragon or a terminal window staying open:
#   - HotelReverb          Reverb WebSocket server (live notification push)
#   - HotelQueueWorker     Processes queued notification jobs
#   - HotelScheduler       Runs Laravel's scheduler every minute (the Windows
#                          equivalent of cron), which fires
#                          app:escalate-overdue-booking-requests
#
# Run once, from an elevated PowerShell (Run as Administrator):
#   powershell -ExecutionPolicy Bypass -File install-services.ps1
#
# Re-run any time (e.g. after moving the project) to refresh the tasks.

$ErrorActionPreference = 'Stop'
$backend = Split-Path -Parent $PSScriptRoot
$php = "D:\laragon\bin\php\php-8.2.26-nts-Win32-vs16-x64\php.exe"
$user = "$env:USERDOMAIN\$env:USERNAME"

function Register-LoopTask {
    param([string]$Name, [string]$ScriptPath)

    Unregister-ScheduledTask -TaskName $Name -Confirm:$false -ErrorAction SilentlyContinue

    $action = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$ScriptPath`""
    $trigger = New-ScheduledTaskTrigger -AtLogOn
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
        -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)
    $principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited

    Register-ScheduledTask -TaskName $Name -Action $action -Trigger $trigger `
        -Settings $settings -Principal $principal | Out-Null

    Start-ScheduledTask -TaskName $Name
    Write-Host "Registered and started: $Name"
}

Register-LoopTask -Name "HotelReverb" -ScriptPath (Join-Path $PSScriptRoot "run-reverb.ps1")
Register-LoopTask -Name "HotelQueueWorker" -ScriptPath (Join-Path $PSScriptRoot "run-queue-worker.ps1")

# Scheduler: fires every minute, forever, starting now.
Unregister-ScheduledTask -TaskName "HotelScheduler" -Confirm:$false -ErrorAction SilentlyContinue
$schedulerAction = New-ScheduledTaskAction -Execute $php -Argument "artisan schedule:run" -WorkingDirectory $backend
$schedulerTrigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 1) -RepetitionDuration (New-TimeSpan -Days 3650)
$schedulerSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -MultipleInstances IgnoreNew
$schedulerPrincipal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName "HotelScheduler" -Action $schedulerAction -Trigger $schedulerTrigger `
    -Settings $schedulerSettings -Principal $schedulerPrincipal | Out-Null
Start-ScheduledTask -TaskName "HotelScheduler"
Write-Host "Registered and started: HotelScheduler (every minute)"

Write-Host ""
Write-Host "Done. Check status any time with:"
Write-Host "  Get-ScheduledTask -TaskName HotelReverb, HotelQueueWorker, HotelScheduler | Get-ScheduledTaskInfo"
Write-Host "Logs: backend\storage\logs\reverb.log and queue-worker.log"
