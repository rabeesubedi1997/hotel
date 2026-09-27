<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Models\Activity;
use App\Models\Booking;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ICalController extends Controller
{
    public function exportRoom($token)
    {
        $room = Room::where('ical_token', $token)->firstOrFail();
        $hotel = $room->hotel;

        $bookings = Booking::where('bookable_type', Room::class)
            ->where('bookable_id', $room->id)
            ->whereIn('status', ['confirmed', 'checked_in'])
            ->get();

        $ical = $this->generateICal("Room: " . ($hotel ? $hotel->name : '') . " - {$room->name}", $bookings);

        return response($ical, 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="room-' . $room->id . '.ics"',
        ]);
    }

    public function exportActivity($token)
    {
        $activity = Activity::where('ical_token', $token)->firstOrFail();

        $bookings = Booking::where('bookable_type', Activity::class)
            ->where('bookable_id', $activity->id)
            ->where('status', 'confirmed')
            ->get();

        $ical = $this->generateICal("Activity: {$activity->name}", $bookings);

        return response($ical, 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => 'attachment; filename="activity-' . $activity->id . '.ics"',
        ]);
    }

    private function generateICal($calendarName, $bookings)
    {
        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//ReserveNow//NONSGML v1.0//EN',
            'CALSCALE:GREGORIAN',
            'X-WR-CALNAME:' . $calendarName,
            'X-WR-TIMEZONE:UTC',
        ];

        foreach ($bookings as $booking) {
            $startDate = date('Ymd', strtotime($booking->check_in_date ?? $booking->date));
            // Add 1 day for end date since full day events are exclusive in iCal
            $endDateRaw = strtotime($booking->check_out_date ?? clone $booking->date);
            $endDate = date('Ymd', strtotime('+1 day', $endDateRaw));

            $lines[] = 'BEGIN:VEVENT';
            $lines[] = 'UID:booking-' . $booking->id . '@reservenow';
            $lines[] = 'DTSTAMP:' . date('Ymd\THis\Z');
            $lines[] = 'DTSTART;VALUE=DATE:' . $startDate;
            $lines[] = 'DTEND;VALUE=DATE:' . $endDate;
            $lines[] = 'SUMMARY:Reserved / Blocked';
            $lines[] = 'STATUS:CONFIRMED';
            $lines[] = 'END:VEVENT';
        }

        $lines[] = 'END:VCALENDAR';

        return implode("\r\n", $lines) . "\r\n";
    }
}
