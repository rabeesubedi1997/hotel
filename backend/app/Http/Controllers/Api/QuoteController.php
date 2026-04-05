<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Quote;
use App\Models\Hotel;
use App\Models\Activity;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use App\Mail\QuoteRequestReceived;
use App\Mail\QuoteResponseSent;

class QuoteController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255',
            'phone' => 'required|string|max:20',
            'package_type' => 'required|string|in:adventure,cultural,luxury,budget,custom',
            'duration_days' => 'required|integer|min:1|max:30',
            'travelers' => 'required|integer|min:1|max:50',
            'start_date' => 'nullable|date|after:today',
            'requirements' => 'required|string',
            'preferred_activities' => 'nullable|array',
            'preferred_hotels' => 'nullable|array',
            'estimated_budget' => 'nullable|numeric|min:0',
        ]);

        $validated['user_id'] = $request->user()?->id;
        $validated['status'] = 'pending';

        $quote = Quote::create($validated);

        // Send email to admin
        try {
            Mail::to(config('mail.admin_address', 'admin@reservenow.com'))
                ->send(new QuoteRequestReceived($quote));
        } catch (\Exception $e) {
            \Log::error('Failed to send quote email: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Quote request submitted successfully!',
            'quote' => $quote,
            'quote_number' => $quote->quote_number,
        ], 201);
    }

    public function myQuotes(Request $request): JsonResponse
    {
        $quotes = $request->user()
            ->quotes()
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($quotes);
    }

    public function show(Quote $quote): JsonResponse
    {
        $this->authorize('view', $quote);
        return response()->json($quote);
    }

    public function getPackageOptions(): JsonResponse
    {
        $hotels = Hotel::where('status', 'active')->select('id', 'name', 'city', 'star_rating', 'price_per_night')->get();
        $activities = Activity::where('status', 'active')->select('id', 'name', 'type', 'city', 'price', 'duration')->get();

        return response()->json([
            'package_types' => [
                ['value' => 'adventure', 'label' => 'Adventure Package', 'description' => 'Thrilling activities and outdoor experiences'],
                ['value' => 'cultural', 'label' => 'Cultural Package', 'description' => 'Heritage sites and local traditions'],
                ['value' => 'luxury', 'label' => 'Luxury Package', 'description' => 'Premium hotels and exclusive experiences'],
                ['value' => 'budget', 'label' => 'Budget Package', 'description' => 'Affordable options without compromising quality'],
                ['value' => 'custom', 'label' => 'Custom Package', 'description' => 'Build your own itinerary'],
            ],
            'hotels' => $hotels,
            'activities' => $activities,
        ]);
    }
}
