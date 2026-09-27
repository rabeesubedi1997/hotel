<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Promotion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PromotionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Promotion::query();

        if ($request->has('placement')) {
            $query->forPlacement($request->placement);
        }

        $promotions = $query->orderBy('placement')
            ->orderBy('display_order')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($promotions);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'subtitle' => 'nullable|string|max:255',
            'image' => 'nullable|string',
            'cta_text' => 'nullable|string|max:100',
            'cta_link' => 'nullable|string|max:255',
            'placement' => 'required|in:' . implode(',', Promotion::PLACEMENTS),
            'is_active' => 'boolean',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
            'display_order' => 'integer|min:0',
        ]);

        $promotion = Promotion::create($validated);

        AdminAuditLog::record($request->user(), 'create', 'Promotion', $promotion->id, null, null, $promotion->toArray());

        return response()->json([
            'promotion' => $promotion,
            'message' => 'Promotion created successfully.',
        ], 201);
    }

    public function show(Promotion $promotion): JsonResponse
    {
        return response()->json($promotion);
    }

    public function update(Request $request, Promotion $promotion): JsonResponse
    {
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'subtitle' => 'nullable|string|max:255',
            'image' => 'nullable|string',
            'cta_text' => 'nullable|string|max:100',
            'cta_link' => 'nullable|string|max:255',
            'placement' => 'sometimes|in:' . implode(',', Promotion::PLACEMENTS),
            'is_active' => 'boolean',
            'starts_at' => 'nullable|date',
            'ends_at' => 'nullable|date|after_or_equal:starts_at',
            'display_order' => 'integer|min:0',
        ]);

        $before = $promotion->only(array_keys($validated));
        $promotion->update($validated);

        AdminAuditLog::record($request->user(), 'update', 'Promotion', $promotion->id, null, $before, $promotion->only(array_keys($validated)));

        return response()->json([
            'promotion' => $promotion,
            'message' => 'Promotion updated successfully.',
        ]);
    }

    public function destroy(Request $request, Promotion $promotion): JsonResponse
    {
        AdminAuditLog::record($request->user(), 'delete', 'Promotion', $promotion->id, null, $promotion->toArray(), null);

        $promotion->delete();

        return response()->json(['message' => 'Promotion deleted successfully.']);
    }

    public function toggleActive(Promotion $promotion): JsonResponse
    {
        $promotion->update(['is_active' => !$promotion->is_active]);

        return response()->json([
            'promotion' => $promotion,
            'message' => 'Promotion status updated.',
        ]);
    }
}
