<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\LoyaltyAccount;
use App\Models\LoyaltyTransaction;
use App\Models\User;
use App\Services\LoyaltyService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LoyaltyController extends Controller
{
    public function __construct(private LoyaltyService $loyalty)
    {
    }

    public function accounts(Request $request): JsonResponse
    {
        $query = LoyaltyAccount::with('user:id,name,email');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%");
            });
        }

        $accounts = $query->orderBy('points_balance', 'desc')->paginate($request->get('per_page', 20));

        return response()->json($accounts);
    }

    public function adjust(Request $request, User $user): JsonResponse
    {
        $request->validate([
            'points' => 'required|integer|not_in:0',
            'note' => 'required|string|max:255',
        ]);

        $account = $this->loyalty->adjust($user, $request->points, $request->note, $request->user());

        return response()->json([
            'account' => $account,
            'message' => 'Points adjusted successfully.',
        ]);
    }

    public function transactions(Request $request): JsonResponse
    {
        $query = LoyaltyTransaction::with('user:id,name,email')->orderBy('created_at', 'desc');

        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        return response()->json($query->paginate($request->get('per_page', 30)));
    }
}
