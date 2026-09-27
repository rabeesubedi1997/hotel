<?php

namespace App\Notifications;

use App\Models\Message;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

/**
 * Alerts a user (via the notification bell) that they have a new chat
 * message, for whenever they're not actively viewing that thread — the
 * live in-thread delivery is handled separately by App\Events\NewChatMessage.
 */
class ChatMessageReceived extends Notification
{
    use Queueable;

    /**
     * @param string $actionUrl Recipient-role-aware link to the thread —
     *   customers/vendors/admins each have their own Messages page
     *   (/messages, /vendor/messages, /admin/messages), so the caller (who
     *   knows the recipient) decides this rather than the notification.
     */
    public function __construct(protected Message $message, protected string $actionUrl)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    protected function payload(): array
    {
        $senderName = $this->message->sender?->name ?? 'Someone';
        $excerpt = \Illuminate\Support\Str::limit($this->message->body, 80);

        return [
            'type' => 'chat_message_received',
            'title' => "New message from {$senderName}",
            'message' => $excerpt,
            'conversation_id' => $this->message->conversation_id,
            'action_url' => $this->actionUrl,
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
