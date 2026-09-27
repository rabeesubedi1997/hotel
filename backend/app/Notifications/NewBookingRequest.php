<?php

namespace App\Notifications;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class NewBookingRequest extends Notification
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
        $itemName = $this->booking->bookable?->name ?? 'a listing';
        $guestName = $this->booking->user?->name ?? 'A guest';

        return [
            'type' => 'new_booking_request',
            'title' => 'New booking request',
            'message' => "{$guestName} just requested {$itemName} — booking #{$this->booking->booking_number}. Respond promptly.",
            'booking_id' => $this->booking->id,
            'booking_kind' => 'booking',
            'status' => $this->booking->status,
            'response_due_at' => optional($this->booking->response_due_at)->toIso8601String(),
            'action_url' => "/admin/bookings/{$this->booking->id}",
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
