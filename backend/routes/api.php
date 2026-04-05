<?php

use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\Admin\ActivityController as AdminActivityController;
use App\Http\Controllers\Api\Admin\BookingController as AdminBookingController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\HotelController as AdminHotelController;
use App\Http\Controllers\Api\Admin\ReviewController as AdminReviewController;
use App\Http\Controllers\Api\Admin\SeoController;
use App\Http\Controllers\Api\Admin\SiteSettingController;
use App\Http\Controllers\Api\Admin\UploadController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\HotelController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\WishlistController;
use Illuminate\Support\Facades\Route;

// Public Routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Hotels (Public)
Route::get('/hotels', [HotelController::class, 'index']);
Route::get('/hotels/featured', [HotelController::class, 'featured']);
Route::get('/hotels/cities', [HotelController::class, 'cities']);
Route::get('/hotels/banner', [AdminHotelController::class, 'getBannerItems']);
Route::get('/hotels/{hotel:slug}', [HotelController::class, 'show']);

// Activities (Public)
Route::get('/activities', [ActivityController::class, 'index']);
Route::get('/activities/featured', [ActivityController::class, 'featured']);
Route::get('/activities/types', [ActivityController::class, 'types']);
Route::get('/activities/cities', [ActivityController::class, 'cities']);
Route::get('/activities/banner', [AdminActivityController::class, 'getBannerItems']);
Route::get('/activities/{activity:slug}', [ActivityController::class, 'show']);

// Reviews (Public - approved only)
Route::get('/reviews', [ReviewController::class, 'index']);

// Site Settings (Public)
Route::get('/settings/public', [SiteSettingController::class, 'getAll']);
Route::get('/settings/public/{group}', [SiteSettingController::class, 'getByGroup']);

// Protected Routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/profile', [AuthController::class, 'profile']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);

    // Bookings
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::post('/bookings', [BookingController::class, 'store']);
    Route::get('/bookings/{booking}', [BookingController::class, 'show']);
    Route::post('/bookings/{booking}/cancel', [BookingController::class, 'cancel']);
    Route::post('/bookings/check-availability', [BookingController::class, 'checkAvailability']);

    // Payments
    Route::get('/payments/methods', [PaymentController::class, 'methods']);
    Route::post('/payments/cod', [PaymentController::class, 'createCODPayment']);
    Route::post('/payments/khalti/initiate', [PaymentController::class, 'initiateKhalti']);
    Route::post('/payments/khalti/verify', [PaymentController::class, 'verifyKhalti']);
    Route::post('/payments/stripe/intent', [PaymentController::class, 'createStripeIntent']);
    Route::post('/payments/paypal/create-order', [PaymentController::class, 'paypalCreateOrder']);
    Route::post('/payments/{payment}/confirm', [PaymentController::class, 'confirmPayment']);

    // Reviews
    Route::post('/reviews', [ReviewController::class, 'store']);
    Route::get('/my-reviews', [ReviewController::class, 'myReviews']);

    // Wishlists
    Route::get('/wishlists', [WishlistController::class, 'index']);
    Route::post('/wishlists', [WishlistController::class, 'store']);
    Route::delete('/wishlists/{wishlist}', [WishlistController::class, 'destroy']);
    Route::get('/wishlists/check', [WishlistController::class, 'check']);

    // Quotes & Enquiries
    Route::get('/quotes/package-options', [QuoteController::class, 'getPackageOptions']);
    Route::post('/quotes', [QuoteController::class, 'store']);
    Route::get('/my-quotes', [QuoteController::class, 'myQuotes']);
    Route::post('/enquiries', [EnquiryController::class, 'store']);
    Route::get('/my-enquiries', [EnquiryController::class, 'myEnquiries']);
});

// Admin Routes
Route::middleware(['auth:sanctum', 'admin'])->prefix('admin')->group(function () {
    // Dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('/dashboard/recent-bookings', [DashboardController::class, 'recentBookings']);
    Route::get('/dashboard/popular-items', [DashboardController::class, 'popularItems']);

    // Users
    Route::get('/users', [AdminUserController::class, 'index']);
    Route::post('/users', [AdminUserController::class, 'store']);
    Route::get('/users/{user}', [AdminUserController::class, 'show']);
    Route::put('/users/{user}', [AdminUserController::class, 'update']);
    Route::delete('/users/{user}', [AdminUserController::class, 'destroy']);
    Route::post('/users/{user}/role', [AdminUserController::class, 'updateRole']);
    Route::post('/users/{user}/status', [AdminUserController::class, 'updateStatus']);

    // Hotels
    Route::get('/hotels', [AdminHotelController::class, 'index']);
    Route::post('/hotels', [AdminHotelController::class, 'store']);
    Route::get('/hotels/{hotel:id}', [AdminHotelController::class, 'show']);
    Route::put('/hotels/{hotel:id}', [AdminHotelController::class, 'update']);
    Route::delete('/hotels/{hotel:id}', [AdminHotelController::class, 'destroy']);
    Route::post('/hotels/{hotel:id}/toggle-featured', [AdminHotelController::class, 'toggleFeatured']);
    Route::post('/hotels/{hotel:id}/toggle-banner', [AdminHotelController::class, 'toggleBanner']);
    Route::post('/hotels/{hotel:id}/banner-order', [AdminHotelController::class, 'updateBannerOrder']);
    Route::get('/hotels/banner-items', [AdminHotelController::class, 'getBannerItems']);

    // Activities
    Route::get('/activities', [AdminActivityController::class, 'index']);
    Route::post('/activities', [AdminActivityController::class, 'store']);
    Route::get('/activities/{activity:id}', [AdminActivityController::class, 'show']);
    Route::put('/activities/{activity:id}', [AdminActivityController::class, 'update']);
    Route::delete('/activities/{activity:id}', [AdminActivityController::class, 'destroy']);
    Route::post('/activities/{activity:id}/toggle-featured', [AdminActivityController::class, 'toggleFeatured']);
    Route::post('/activities/{activity:id}/toggle-banner', [AdminActivityController::class, 'toggleBanner']);
    Route::post('/activities/{activity:id}/banner-order', [AdminActivityController::class, 'updateBannerOrder']);
    Route::get('/activities/banner-items', [AdminActivityController::class, 'getBannerItems']);

    // Bookings
    Route::get('/bookings', [AdminBookingController::class, 'index']);
    Route::get('/bookings/{booking}', [AdminBookingController::class, 'show']);
    Route::post('/bookings/{booking}/status', [AdminBookingController::class, 'updateStatus']);
    Route::post('/bookings/{booking}/confirm', [AdminBookingController::class, 'confirmBooking']);
    Route::post('/bookings/{booking}/refund', [AdminBookingController::class, 'processRefund']);

    // Reviews
    Route::get('/reviews', [AdminReviewController::class, 'index']);
    Route::get('/reviews/{review}', [AdminReviewController::class, 'show']);
    Route::post('/reviews/{review}/approve', [AdminReviewController::class, 'approve']);
    Route::post('/reviews/{review}/reject', [AdminReviewController::class, 'reject']);
    Route::delete('/reviews/{review}', [AdminReviewController::class, 'destroy']);

    // SEO Settings
    Route::get('/seo', [SeoController::class, 'index']);
    Route::get('/seo/{page}', [SeoController::class, 'show']);
    Route::post('/seo', [SeoController::class, 'store']);
    Route::put('/seo/{page}', [SeoController::class, 'update']);
    Route::delete('/seo/{page}', [SeoController::class, 'destroy']);

    // Site Settings
    Route::get('/settings', [SiteSettingController::class, 'index']);
    Route::get('/settings/groups', [SiteSettingController::class, 'getGroups']);
    Route::get('/settings/initialize', [SiteSettingController::class, 'initializeDefaults']);
    Route::get('/settings/group/{group}', [SiteSettingController::class, 'getByGroup']);
    Route::get('/settings/all', [SiteSettingController::class, 'getAll']);
    Route::get('/settings/{key}', [SiteSettingController::class, 'show']);
    Route::post('/settings', [SiteSettingController::class, 'store']);
    Route::put('/settings/bulk', [SiteSettingController::class, 'bulkUpdate']);
    Route::put('/settings/{key}', [SiteSettingController::class, 'update']);
    Route::delete('/settings/{key}', [SiteSettingController::class, 'destroy']);

    // Upload
    Route::post('/upload', [UploadController::class, 'upload']);
});
