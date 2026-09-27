<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Promotion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PromotionController extends Controller
{
    // Public endpoint used by the frontend to render a placement slot
    // (home hero, home strip, listing sidebar, etc.) — only active
    // promotions within their date range are ever returned.
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'placement' => 'required|in:' . implode(',', Promotion::PLACEMENTS),
        ]);

        $promotions = Promotion::active()
            ->forPlacement($request->placement)
            ->orderBy('display_order')
            ->get(['id', 'title', 'subtitle', 'image', 'cta_text', 'cta_link', 'placement']);

        return response()->json($promotions);
    }

    public function click(Promotion $promotion): JsonResponse
    {
        $promotion->increment('click_count');

        return response()->json(['message' => 'Recorded.']);
    }
}
