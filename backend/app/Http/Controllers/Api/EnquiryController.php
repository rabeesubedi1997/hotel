<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Enquiry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use App\Mail\EnquiryReceived;
use App\Mail\EnquiryResponseSent;

class EnquiryController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:20',
            'type' => 'required|string|in:booking,general,package,custom',
            'subject' => 'required|string|max:255',
            'message' => 'required|string',
            'related_items' => 'nullable|array',
        ]);

        $validated['user_id'] = $request->user()?->id;
        $validated['status'] = 'new';

        $enquiry = Enquiry::create($validated);

        // Send email to admin
        try {
            Mail::to(config('mail.admin_address', 'admin@reservenow.com'))
                ->send(new EnquiryReceived($enquiry));
        } catch (\Exception $e) {
            \Log::error('Failed to send enquiry email: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Enquiry submitted successfully! We will respond within 24 hours.',
            'enquiry' => $enquiry,
            'enquiry_number' => $enquiry->enquiry_number,
        ], 201);
    }

    public function myEnquiries(Request $request): JsonResponse
    {
        $enquiries = $request->user()
            ->enquiries()
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($enquiries);
    }

    public function show(Enquiry $enquiry): JsonResponse
    {
        return response()->json($enquiry);
    }
}
