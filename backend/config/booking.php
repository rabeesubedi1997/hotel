<?php

return [
    // Minutes staff have to respond to a new booking/hire request before
    // it's escalated to admins as overdue (see EscalateOverdueBookings).
    'response_sla_minutes' => env('BOOKING_RESPONSE_SLA_MINUTES', 15),
];
