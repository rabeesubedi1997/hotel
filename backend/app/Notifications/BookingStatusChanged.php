<?php

namespace App\Notifications;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class BookingStatusChanged extends Notification
{
    use Queueable;

    public function __construct(protected Booking $booking)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    protected function payload(): array
    {
        $itemName = $this->booking->bookable?->name ?? 'your booking';

        return [
            'type' => 'booking_status_changed',
            'title' => 'Booking ' . ucfirst(str_replace('_', ' ', $this->booking->status)),
            'message' => "{$itemName} — booking #{$this->booking->booking_number} is now {$this->booking->status}.",
            'booking_id' => $this->booking->id,
            'status' => $this->booking->status,
            'action_url' => "/bookings/{$this->booking->id}",
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
