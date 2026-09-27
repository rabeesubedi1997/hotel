<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

/**
 * Sent to a vendor when their submitted hotel/activity is approved or
 * rejected by an admin (App\Http\Controllers\Api\Admin\ApprovalController).
 */
class ListingApprovalDecided extends Notification
{
    use Queueable;

    /**
     * @param 'hotel'|'activity'|'tour_guide' $listingType
     * @param 'approved'|'rejected' $decision
     */
    public function __construct(
        protected string $listingType,
        protected int $listingId,
        protected string $listingName,
        protected string $decision,
        protected ?string $rejectionReason = null
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'broadcast'];
    }

    protected function payload(): array
    {
        $isApproved = $this->decision === 'approved';

        return [
            'type' => 'listing_approval_decided',
            'title' => $isApproved ? 'Listing approved' : 'Listing rejected',
            'message' => $isApproved
                ? "\"{$this->listingName}\" is now live on the site."
                : "\"{$this->listingName}\" was rejected." . ($this->rejectionReason ? " Reason: {$this->rejectionReason}" : ''),
            'listing_type' => $this->listingType,
            'listing_id' => $this->listingId,
            'decision' => $this->decision,
            'action_url' => match ($this->listingType) {
                'hotel' => '/vendor/hotels',
                'tour_guide' => '/vendor/tour-guides',
                default => '/vendor/activities',
            },
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
