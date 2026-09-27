<?php

namespace App\Notifications;

use App\Models\TourGuideBooking;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class TourGuideBookingStatusChanged extends Notification
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
        $guideName = $this->booking->tourGuide?->name ?? 'your tour guide';

        return [
            'type' => 'tour_guide_booking_status_changed',
            'title' => 'Hire request ' . ucfirst($this->booking->status),
            'message' => "Your hire request for {$guideName} is now {$this->booking->status}.",
            'booking_id' => $this->booking->id,
            'status' => $this->booking->status,
            'action_url' => '/bookings',
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
