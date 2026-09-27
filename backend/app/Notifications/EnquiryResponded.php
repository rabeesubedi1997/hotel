<?php

namespace App\Notifications;

use App\Models\Enquiry;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

class EnquiryResponded extends Notification
{
    use Queueable;

    public function __construct(protected Enquiry $enquiry)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    protected function payload(): array
    {
        return [
            'type' => 'enquiry_responded',
            'title' => 'You have a response',
            'message' => "An admin responded to your enquiry \"{$this->enquiry->subject}\".",
            'enquiry_id' => $this->enquiry->id,
            'action_url' => '/contact',
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
