<?php

namespace App\Console\Commands;

use App\Models\Booking;
use App\Models\TourGuideBooking;
use App\Models\User;
use App\Notifications\BookingRequestOverdue;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

/**
 * Runs every minute (see routes/console.php). Any pending booking/hire
 * request whose response SLA has lapsed without action gets escalated to
 * every admin-level user, once, so a slow or offline vendor never leaves a
 * customer waiting indefinitely.
 */
class EscalateOverdueBookingRequests extends Command
{
    protected $signature = 'app:escalate-overdue-booking-requests';

    protected $description = 'Notify admins about pending booking/hire requests that missed their response SLA';

    public function handle(): int
    {
        $admins = User::whereIn('role', [User::ROLE_ADMIN, User::ROLE_MANAGER, User::ROLE_SUPER_ADMIN])
            ->where('status', User::STATUS_ACTIVE)
            ->get();

        if ($admins->isEmpty()) {
            return self::SUCCESS;
        }

        $overdueBookings = Booking::query()
            ->where('status', Booking::STATUS_PENDING)
            ->whereNotNull('response_due_at')
            ->where('response_due_at', '<', now())
            ->whereNull('escalated_at')
            ->with('bookable', 'user')
            ->get();

        foreach ($overdueBookings as $booking) {
            $this->escalate($admins, $booking->id, 'booking', $booking->booking_number, $booking->bookable?->name, $booking->user?->name);
            $booking->update(['escalated_at' => now()]);
        }

        $overdueHires = TourGuideBooking::query()
            ->where('status', 'pending')
            ->whereNotNull('response_due_at')
            ->where('response_due_at', '<', now())
            ->whereNull('escalated_at')
            ->with('tourGuide', 'user')
            ->get();

        foreach ($overdueHires as $booking) {
            $this->escalate($admins, $booking->id, 'tour_guide', 'TG-' . $booking->id, $booking->tourGuide?->name, $booking->user?->name);
            $booking->update(['escalated_at' => now()]);
        }

        $this->info(sprintf('Escalated %d overdue booking(s) and %d overdue hire request(s).', $overdueBookings->count(), $overdueHires->count()));

        return self::SUCCESS;
    }

    private function escalate($admins, int $bookingId, string $kind, string $reference, ?string $itemName, ?string $guestName): void
    {
        Notification::send($admins, new BookingRequestOverdue([
            'type' => 'booking_request_overdue',
            'title' => 'Overdue booking request',
            'message' => sprintf(
                '%s (%s) for %s from %s has gone unanswered past the response window — please respond now.',
                $reference,
                $kind === 'tour_guide' ? 'hire request' : 'booking',
                $itemName ?? 'a listing',
                $guestName ?? 'a guest'
            ),
            'booking_id' => $bookingId,
            'booking_kind' => $kind,
            'action_url' => $kind === 'tour_guide' ? '/admin/tour-guides?tab=bookings' : "/admin/bookings/{$bookingId}",
        ]));
    }
}
