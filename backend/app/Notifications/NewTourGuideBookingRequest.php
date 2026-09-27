<?php

namespace App\Notifications;

use App\Models\TourGuideBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class NewTourGuideBookingRequest extends Notification
{
    use Queueable;

    public function __construct(protected TourGuideBooking $booking)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    protected function payload(): array
    {
        $guideName = $this->booking->tourGuide?->name ?? 'a tour guide';
        $guestName = $this->booking->user?->name ?? 'A guest';

        return [
            'type' => 'new_booking_request',
            'title' => 'New hire request',
            'message' => "{$guestName} just requested to hire {$guideName}. Respond promptly.",
            'booking_id' => $this->booking->id,
            'booking_kind' => 'tour_guide',
            'status' => $this->booking->status,
            'response_due_at' => optional($this->booking->response_due_at)->toIso8601String(),
            'action_url' => '/admin/tour-guides?tab=bookings',
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
