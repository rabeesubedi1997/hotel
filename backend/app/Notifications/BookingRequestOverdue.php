<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

/**
 * Fallback alert sent to admins when a booking/hire request has sat pending
 * past its response SLA — the vendor either missed it or is offline, so an
 * admin needs to step in and respond instead.
 */
class BookingRequestOverdue extends Notification
{
    use Queueable;

    public function __construct(protected array $payload)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    public function toDatabase(object $notifiable): array
    {
        return $this->payload;
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->payload);
    }
}
