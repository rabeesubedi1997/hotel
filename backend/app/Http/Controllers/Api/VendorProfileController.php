<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

/**
 * Public vendor storefront — a page aggregating one vendor's approved,
 * publicly-visible hotels/activities/tour guides, like a host/seller page
 * on Airbnb or a marketplace. Bound by slug (Api\Admin\VendorController
 * still manages vendors by id for the admin panel).
 */
class VendorProfileController extends Controller
{
    public function show(User $user): JsonResponse
    {
        if ($user->role !== User::ROLE_VENDOR || $user->status !== User::STATUS_ACTIVE) {
            return response()->json(['message' => 'Vendor not found.'], 404);
        }

        $hotels = $user->hotels()
            ->approved()
            ->active()
            ->select(['id', 'name', 'slug', 'city', 'featured_image', 'price_per_night', 'star_rating', 'rating'])
            ->get();

        $activities = $user->activities()
            ->approved()
            ->active()
            ->select(['id', 'name', 'slug', 'city', 'type', 'featured_image', 'price', 'duration', 'rating'])
            ->get();

        $tourGuides = $user->tourGuides()
            ->active()
            ->ordered()
            ->select(['id', 'name', 'slug', 'image', 'role', 'rating', 'hire_price_per_day', 'is_available_for_hire'])
            ->get();

        return response()->json([
            'name' => $user->name,
            'slug' => $user->slug,
            'company_name' => $user->company_name,
            'bio' => $user->bio,
            'avatar' => $user->avatar,
            'cover_image' => $user->cover_image,
            'city' => $user->city,
            'member_since' => $user->created_at,
            'hotels' => $hotels,
            'activities' => $activities,
            'tour_guides' => $tourGuides,
            'listings_count' => $hotels->count() + $activities->count() + $tourGuides->count(),
        ]);
    }
}
