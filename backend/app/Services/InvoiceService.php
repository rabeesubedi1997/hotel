<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\PackageBooking;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;

class InvoiceService
{
    /**
     * Render an invoice/e-ticket PDF for a booking. Generated on demand
     * (never stored) so a later status change (refund, cancellation) is
     * always reflected the next time it's downloaded.
     */
    public function generateForBooking(Booking $booking): Response
    {
        $booking->loadMissing(['bookable', 'user', 'room', 'payment']);

        $data = $this->normalize($booking);
        $pdf = Pdf::loadView('pdf.invoice', $data);

        return $pdf->download("invoice-{$booking->booking_number}.pdf");
    }

    public function generateForPackageBooking(PackageBooking $packageBooking): Response
    {
        $packageBooking->loadMissing(['itinerary', 'user', 'payment', 'bookings.bookable']);

        $data = $this->normalizePackage($packageBooking);
        $pdf = Pdf::loadView('pdf.package-invoice', $data);

        return $pdf->download("invoice-{$packageBooking->booking_number}.pdf");
    }

    private function normalize(Booking $booking): array
    {
        $isHotel = $booking->bookable_type === \App\Models\Hotel::class;

        return [
            'invoice_number' => $booking->booking_number,
            'issued_at' => now()->format('M d, Y'),
            'status' => ucfirst(str_replace('_', ' ', $booking->status)),
            'customer_name' => $booking->user?->name,
            'customer_email' => $booking->user?->email,
            'item_name' => $booking->bookable?->name ?? $booking->bookable?->title ?? 'Item',
            'item_location' => $booking->bookable?->city ?? $booking->bookable?->location ?? null,
            'is_hotel' => $isHotel,
            'room_type' => $booking->room?->room_type,
            'check_in_date' => $booking->check_in_date?->format('M d, Y'),
            'check_out_date' => $booking->check_out_date?->format('M d, Y'),
            'activity_datetime' => $booking->activity_datetime?->format('M d, Y g:i A'),
            'guests' => $booking->guests,
            'participants' => $booking->participants,
            'subtotal' => number_format((float) $booking->total_amount + (float) $booking->discount_amount, 2),
            'discount_amount' => number_format((float) $booking->discount_amount, 2),
            'total_amount' => number_format((float) $booking->total_amount, 2),
            'payment_method' => $booking->payment?->method ? ucfirst($booking->payment->method) : 'Pending',
            'payment_status' => $booking->payment?->status ? ucfirst($booking->payment->status) : 'Pending',
            'special_requests' => $booking->special_requests,
        ];
    }

    private function normalizePackage(PackageBooking $packageBooking): array
    {
        return [
            'invoice_number' => $packageBooking->booking_number,
            'issued_at' => now()->format('M d, Y'),
            'status' => ucfirst(str_replace('_', ' ', $packageBooking->status)),
            'customer_name' => $packageBooking->user?->name,
            'customer_email' => $packageBooking->user?->email,
            'package_title' => $packageBooking->itinerary?->title ?? 'Holiday Package',
            'travel_date' => $packageBooking->travel_date?->format('M d, Y'),
            'travelers' => $packageBooking->travelers,
            'items' => $packageBooking->bookings->map(fn ($b) => [
                'name' => $b->bookable?->name ?? $b->bookable?->title ?? 'Item',
                'detail' => $b->check_in_date
                    ? "Check-in {$b->check_in_date->format('M d, Y')}"
                    : ($b->activity_datetime ? $b->activity_datetime->format('M d, Y g:i A') : ''),
            ])->all(),
            'subtotal' => number_format((float) $packageBooking->package_price, 2),
            'discount_amount' => number_format((float) $packageBooking->discount_amount, 2),
            'total_amount' => number_format((float) $packageBooking->total_amount, 2),
            'payment_method' => $packageBooking->payment?->method ? ucfirst($packageBooking->payment->method) : 'Pending',
            'payment_status' => $packageBooking->payment?->status ? ucfirst($packageBooking->payment->status) : 'Pending',
            'special_requests' => $packageBooking->special_requests,
        ];
    }
}
