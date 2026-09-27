# Removes the scheduled tasks created by install-services.ps1.
Unregister-ScheduledTask -TaskName "HotelReverb" -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "HotelQueueWorker" -Confirm:$false -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName "HotelScheduler" -Confirm:$false -ErrorAction SilentlyContinue
Write-Host "Removed HotelReverb, HotelQueueWorker, HotelScheduler scheduled tasks."
