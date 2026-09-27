<?php

namespace App\Notifications;

use App\Models\PackageBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class PackageBookingStatusChanged extends Notification
{
    use Queueable;

    public function __construct(protected PackageBooking $packageBooking)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    protected function payload(): array
    {
        $title = $this->packageBooking->itinerary?->title ?? 'your package';

        return [
            'type' => 'package_booking_status_changed',
            'title' => 'Package ' . ucfirst(str_replace('_', ' ', $this->packageBooking->status)),
            'message' => "{$title} — booking #{$this->packageBooking->booking_number} is now {$this->packageBooking->status}.",
            'package_booking_id' => $this->packageBooking->id,
            'status' => $this->packageBooking->status,
            'action_url' => "/package-bookings/{$this->packageBooking->id}",
        ];
    }

    public function toDatabase(object $notifiable): array
    {
        return $this->payload();
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->payload());
    }
}
