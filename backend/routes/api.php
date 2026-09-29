<?php

use App\Http\Controllers\Api\ActivityController;
use App\Http\Controllers\Api\Admin\AboutPageController as AdminAboutPageController;
use App\Http\Controllers\Api\Admin\ActivityController as AdminActivityController;
use App\Http\Controllers\Api\Admin\ApprovalController;
use App\Http\Controllers\Api\Admin\BookingController as AdminBookingController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\EnquiryController as AdminEnquiryController;
use App\Http\Controllers\Api\Admin\HotelController as AdminHotelController;
use App\Http\Controllers\Api\Admin\ReviewController as AdminReviewController;
use App\Http\Controllers\Api\Admin\SeoController;
use App\Http\Controllers\Api\Admin\SiteSettingController;
use App\Http\Controllers\Api\Admin\UploadController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AboutPageController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\EnquiryController;
use App\Http\Controllers\Api\HotelController;
use App\Http\Controllers\Api\ItineraryController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\QuoteController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\TourGuideController;
use App\Http\Controllers\Api\WishlistController;
use App\Http\Controllers\Api\Admin\ItineraryController as AdminItineraryController;
use App\Http\Controllers\Api\Admin\MediaLibraryController;
use App\Http\Controllers\Api\Admin\PageController;
use App\Http\Controllers\Api\Admin\TourGuideController as AdminTourGuideController;
use App\Http\Controllers\Api\Admin\TourGuideSeederController;
use App\Http\Controllers\Api\Customer\TripPlanController;
use Illuminate\Support\Facades\Route;

// Public Routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Hotels (Public)
Route::get('/hotels', [HotelController::class, 'index']);
Route::get('/hotels/featured', [HotelController::class, 'featured']);
Route::get('/hotels/cities', [HotelController::class, 'cities']);
Route::get('/hotels/destinations', [HotelController::class, 'destinations']);
Route::get('/hotels/banner', [AdminHotelController::class, 'getBannerItems']);
Route::get('/hotels/filters', [HotelController::class, 'filters']);
Route::get('/hotels/{hotel:slug}', [HotelController::class, 'show']);

// Activities (Public)
Route::get('/activities', [ActivityController::class, 'index']);
Route::get('/activities/featured', [ActivityController::class, 'featured']);
Route::get('/activities/types', [ActivityController::class, 'types']);
Route::get('/activities/cities', [ActivityController::class, 'cities']);
Route::get('/activities/destinations', [ActivityController::class, 'destinations']);
Route::get('/activities/banner', [AdminActivityController::class, 'getBannerItems']);
Route::get('/activities/filters', [ActivityController::class, 'filters']);
Route::get('/activities/{activity:slug}', [ActivityController::class, 'show']);

// Reviews (Public - approved only)
Route::get('/reviews', [ReviewController::class, 'index']);

// Site Settings (Public)
Route::get('/settings/public', [SiteSettingController::class, 'getAll']);
Route::get('/settings/public/{group}', [SiteSettingController::class, 'getByGroup']);

// About Page (Public)
Route::get('/about', [AboutPageController::class, 'show']);

// Public page content
Route::get('/pages/{slug}', [PageController::class, 'showBySlug']);
Route::get('/tour-guides', [TourGuideController::class, 'index']);
Route::get('/tour-guides/{tourGuide:slug}', [TourGuideController::class, 'show']);

// Itineraries (Public — published curated packages only)
Route::get('/itineraries', [ItineraryController::class, 'index']);
Route::get('/itineraries/{itinerary:slug}', [ItineraryController::class, 'show']);

// Vendor storefronts (Public — active vendors only)
Route::get('/vendors/{user:slug}', [\App\Http\Controllers\Api\VendorProfileController::class, 'show']);

// Currency (Public — display-time conversion rates, admin-configurable)
Route::get('/currency/rates', [\App\Http\Controllers\Api\CurrencyController::class, 'rates']);

// Promotions (Public — active promotions for a given placement slot)
Route::get('/promotions', [\App\Http\Controllers\Api\PromotionController::class, 'index']);
Route::post('/promotions/{promotion}/click', [\App\Http\Controllers\Api\PromotionController::class, 'click']);

// Guest chat (Public — floating widget for anonymous visitors)
Route::post('/chat/guest-start', [\App\Http\Controllers\Api\ChatController::class, 'guestStart']);

// iCal Exports (Public)
Route::get('/ical/room/{token}.ics', [\App\Http\Controllers\Api\ICalController::class, 'exportRoom']);
Route::get('/ical/activity/{token}.ics', [\App\Http\Controllers\Api\ICalController::class, 'exportActivity']);

// Protected Routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/profile', [AuthController::class, 'profile']);
    Route::put('/profile', [AuthController::class, 'updateProfile']);
    Route::post('/change-password', [AuthController::class, 'changePassword']);

    // Broadcasting auth — this SPA uses Bearer-token (Sanctum) auth, not
    // cookies/sessions, so the default `/broadcasting/auth` (registered
    // under the `web` middleware by `withRouting(channels: ...)`) can't
    // authenticate our users. This route, under `/api` + `auth:sanctum`,
    // is what the frontend's Echo client actually points at.
    Route::post('/broadcasting/auth', function (\Illuminate\Http\Request $request) {
        return \Illuminate\Support\Facades\Broadcast::auth($request);
    });

    // Notifications (bell — database history; live push arrives via Reverb)
    Route::get('/notifications', [\App\Http\Controllers\Api\NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [\App\Http\Controllers\Api\NotificationController::class, 'unreadCount']);
    Route::post('/notifications/{id}/read', [\App\Http\Controllers\Api\NotificationController::class, 'markAsRead']);
    Route::post('/notifications/read-all', [\App\Http\Controllers\Api\NotificationController::class, 'markAllAsRead']);

    // Direct chat (customer↔vendor inquiries, customer↔support)
    Route::get('/chat/conversations', [\App\Http\Controllers\Api\ChatController::class, 'index']);
    Route::post('/chat/conversations', [\App\Http\Controllers\Api\ChatController::class, 'store']);
    Route::get('/chat/conversations/{conversation}', [\App\Http\Controllers\Api\ChatController::class, 'show']);
    Route::post('/chat/conversations/{conversation}/messages', [\App\Http\Controllers\Api\ChatController::class, 'sendMessage']);
    Route::post('/chat/conversations/{conversation}/read', [\App\Http\Controllers\Api\ChatController::class, 'markRead']);

    // Bookings - Fixed route order for calendar endpoint
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::post('/bookings', [BookingController::class, 'store']);
    Route::get('/bookings/calendar', [BookingController::class, 'getCalendarData']);
    Route::post('/bookings/check-availability', [BookingController::class, 'checkAvailability']);
    Route::get('/bookings/{booking}', [BookingController::class, 'show']);
    Route::post('/bookings/{booking}/cancel', [BookingController::class, 'cancel']);
    Route::get('/bookings/{booking}/invoice', [BookingController::class, 'downloadInvoice']);

    // Package Bookings (fixed-price holiday packages)
    Route::get('/package-bookings', [\App\Http\Controllers\Api\PackageBookingController::class, 'index']);
    Route::post('/package-bookings', [\App\Http\Controllers\Api\PackageBookingController::class, 'store']);
    Route::get('/package-bookings/{packageBooking}', [\App\Http\Controllers\Api\PackageBookingController::class, 'show']);
    Route::post('/package-bookings/{packageBooking}/cancel', [\App\Http\Controllers\Api\PackageBookingController::class, 'cancel']);
    Route::get('/package-bookings/{packageBooking}/invoice', [\App\Http\Controllers\Api\PackageBookingController::class, 'downloadInvoice']);

    // Hotels and Rooms
    Route::get('/hotels/{hotel}/rooms', [\App\Http\Controllers\Api\Vendor\RoomController::class, 'index']);

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

    // Tour Guide Bookings
    Route::get('/my-tour-guide-bookings', [TourGuideController::class, 'myBookings']);
    Route::post('/tour-guides/{tourGuide:slug}/book', [TourGuideController::class, 'storeBooking']);
    Route::post('/tour-guide-bookings/{bookingId}/cancel', [TourGuideController::class, 'cancelBooking']);

    // Coupons
    Route::post('/coupons/validate', [\App\Http\Controllers\Api\CouponController::class, 'validate']);

    // Loyalty points
    Route::get('/loyalty/account', [\App\Http\Controllers\Api\LoyaltyController::class, 'account']);
    Route::post('/loyalty/redeem', [\App\Http\Controllers\Api\LoyaltyController::class, 'redeem']);

    // Quotes
    Route::get('/quotes/package-options', [QuoteController::class, 'getPackageOptions']);
    Route::post('/quotes', [QuoteController::class, 'store']);
    Route::get('/my-quotes', [QuoteController::class, 'myQuotes']);

    // Enquiries
    Route::post('/enquiries', [EnquiryController::class, 'store']);
    Route::get('/my-enquiries', [EnquiryController::class, 'myEnquiries']);

    // Trip Planner (personal itineraries)
    Route::get('/trip-plans', [TripPlanController::class, 'index']);
    Route::post('/trip-plans', [TripPlanController::class, 'store']);
    Route::get('/trip-plans/{itinerary:id}', [TripPlanController::class, 'show']);
    Route::put('/trip-plans/{itinerary:id}', [TripPlanController::class, 'update']);
    Route::delete('/trip-plans/{itinerary:id}', [TripPlanController::class, 'destroy']);
    Route::post('/trip-plans/{itinerary:id}/items', [TripPlanController::class, 'addItem']);
    Route::put('/trip-plans/{itinerary:id}/items/{item}', [TripPlanController::class, 'updateItem']);
    Route::delete('/trip-plans/{itinerary:id}/items/{item}', [TripPlanController::class, 'removeItem']);
});

// Vendor Routes (Vendors access admin panel but see only their data)
Route::middleware(['auth:sanctum', 'vendor'])->prefix('vendor')->group(function () {
    // Dashboard
    Route::get('/dashboard/stats', [\App\Http\Controllers\Api\Vendor\DashboardController::class, 'stats']);

    // Hotels Management (Vendor sees only their hotels)
    Route::get('/hotels', [\App\Http\Controllers\Api\Vendor\HotelController::class, 'index'])->middleware('permission:hotels.view.own');
    Route::post('/hotels', [\App\Http\Controllers\Api\Vendor\HotelController::class, 'store'])->middleware('permission:hotels.create');
    Route::get('/hotels/{hotel}', [\App\Http\Controllers\Api\Vendor\HotelController::class, 'show'])->middleware('permission:hotels.view.own');
    Route::put('/hotels/{hotel}', [\App\Http\Controllers\Api\Vendor\HotelController::class, 'update'])->middleware('permission:hotels.edit.own');
    Route::delete('/hotels/{hotel}', [\App\Http\Controllers\Api\Vendor\HotelController::class, 'destroy'])->middleware('permission:hotels.delete.own');

    // Activities Management (Vendor sees only their activities)
    Route::get('/activities', [\App\Http\Controllers\Api\Vendor\ActivityController::class, 'index'])->middleware('permission:activities.view.own');
    Route::post('/activities', [\App\Http\Controllers\Api\Vendor\ActivityController::class, 'store'])->middleware('permission:activities.create');
    Route::get('/activities/{activity}', [\App\Http\Controllers\Api\Vendor\ActivityController::class, 'show'])->middleware('permission:activities.view.own');
    Route::put('/activities/{activity}', [\App\Http\Controllers\Api\Vendor\ActivityController::class, 'update'])->middleware('permission:activities.edit.own');
    Route::delete('/activities/{activity}', [\App\Http\Controllers\Api\Vendor\ActivityController::class, 'destroy'])->middleware('permission:activities.delete.own');

    // Bookings Management (Vendor sees only their bookings)
    Route::get('/bookings', [\App\Http\Controllers\Api\Vendor\BookingController::class, 'index'])->middleware('permission:bookings.view.own');
    Route::get('/bookings/stats', [\App\Http\Controllers\Api\Vendor\BookingController::class, 'stats'])->middleware('permission:bookings.view.own');
    Route::get('/bookings/{booking}', [\App\Http\Controllers\Api\Vendor\BookingController::class, 'show'])->middleware('permission:bookings.view.own');
    Route::put('/bookings/{booking}/status', [\App\Http\Controllers\Api\Vendor\BookingController::class, 'updateStatus'])->middleware('permission:bookings.edit.own');

    // Room Management (Vendor needs to manage rooms for their hotels)
    Route::get('/hotels/{hotel}/rooms', [\App\Http\Controllers\Api\Vendor\RoomController::class, 'index'])->middleware('permission:hotels.view.own');
    Route::post('/hotels/{hotel}/rooms', [\App\Http\Controllers\Api\Vendor\RoomController::class, 'store'])->middleware('permission:hotels.edit.own');
    Route::put('/rooms/{room}', [\App\Http\Controllers\Api\Vendor\RoomController::class, 'update'])->middleware('permission:hotels.edit.own');
    Route::delete('/rooms/{room}', [\App\Http\Controllers\Api\Vendor\RoomController::class, 'destroy'])->middleware('permission:hotels.delete.own');

    // Restaurant POS: Menu Management
    // Owned by either a Hotel or an Activity — the ->defaults('ownerType', ...)
    // tells the shared controller which relation/permission set applies, so
    // the exact same MenuController@method serves both URL shapes.
    Route::get('/hotels/{hotel}/menu-items', [\App\Http\Controllers\Api\Vendor\MenuController::class, 'index'])->defaults('ownerType', 'hotel')->middleware('permission:hotels.view.own');
    Route::post('/hotels/{hotel}/menu-items', [\App\Http\Controllers\Api\Vendor\MenuController::class, 'store'])->defaults('ownerType', 'hotel')->middleware('permission:hotels.edit.own');
    Route::post('/hotels/{hotel}/menu-items/bulk-availability', [\App\Http\Controllers\Api\Vendor\MenuController::class, 'bulkAvailability'])->defaults('ownerType', 'hotel')->middleware('permission:hotels.edit.own');
    Route::get('/activities/{activity}/menu-items', [\App\Http\Controllers\Api\Vendor\MenuController::class, 'index'])->defaults('ownerType', 'activity')->middleware('permission:activities.view.own');
    Route::post('/activities/{activity}/menu-items', [\App\Http\Controllers\Api\Vendor\MenuController::class, 'store'])->defaults('ownerType', 'activity')->middleware('permission:activities.edit.own');
    Route::post('/activities/{activity}/menu-items/bulk-availability', [\App\Http\Controllers\Api\Vendor\MenuController::class, 'bulkAvailability'])->defaults('ownerType', 'activity')->middleware('permission:activities.edit.own');
    Route::put('/menu-items/{menuItem}', [\App\Http\Controllers\Api\Vendor\MenuController::class, 'update'])->middleware('permission:hotels.edit.own|activities.edit.own');
    Route::delete('/menu-items/{menuItem}', [\App\Http\Controllers\Api\Vendor\MenuController::class, 'destroy'])->middleware('permission:hotels.delete.own|activities.delete.own');

    // Restaurant POS: Menu Categories
    Route::get('/hotels/{hotel}/menu-categories', [\App\Http\Controllers\Api\Vendor\MenuCategoryController::class, 'index'])->defaults('ownerType', 'hotel')->middleware('permission:hotels.view.own');
    Route::post('/hotels/{hotel}/menu-categories', [\App\Http\Controllers\Api\Vendor\MenuCategoryController::class, 'store'])->defaults('ownerType', 'hotel')->middleware('permission:hotels.edit.own');
    Route::post('/hotels/{hotel}/menu-categories/reorder', [\App\Http\Controllers\Api\Vendor\MenuCategoryController::class, 'reorder'])->defaults('ownerType', 'hotel')->middleware('permission:hotels.edit.own');
    Route::get('/activities/{activity}/menu-categories', [\App\Http\Controllers\Api\Vendor\MenuCategoryController::class, 'index'])->defaults('ownerType', 'activity')->middleware('permission:activities.view.own');
    Route::post('/activities/{activity}/menu-categories', [\App\Http\Controllers\Api\Vendor\MenuCategoryController::class, 'store'])->defaults('ownerType', 'activity')->middleware('permission:activities.edit.own');
    Route::post('/activities/{activity}/menu-categories/reorder', [\App\Http\Controllers\Api\Vendor\MenuCategoryController::class, 'reorder'])->defaults('ownerType', 'activity')->middleware('permission:activities.edit.own');
    Route::put('/menu-categories/{menuCategory}', [\App\Http\Controllers\Api\Vendor\MenuCategoryController::class, 'update'])->middleware('permission:hotels.edit.own|activities.edit.own');
    Route::delete('/menu-categories/{menuCategory}', [\App\Http\Controllers\Api\Vendor\MenuCategoryController::class, 'destroy'])->middleware('permission:hotels.delete.own|activities.delete.own');

    // Restaurant POS: Table Management
    Route::get('/hotels/{hotel}/tables', [\App\Http\Controllers\Api\Vendor\RestaurantTableController::class, 'index'])->defaults('ownerType', 'hotel')->middleware('permission:hotels.view.own');
    Route::post('/hotels/{hotel}/tables', [\App\Http\Controllers\Api\Vendor\RestaurantTableController::class, 'store'])->defaults('ownerType', 'hotel')->middleware('permission:hotels.edit.own');
    Route::get('/activities/{activity}/tables', [\App\Http\Controllers\Api\Vendor\RestaurantTableController::class, 'index'])->defaults('ownerType', 'activity')->middleware('permission:activities.view.own');
    Route::post('/activities/{activity}/tables', [\App\Http\Controllers\Api\Vendor\RestaurantTableController::class, 'store'])->defaults('ownerType', 'activity')->middleware('permission:activities.edit.own');
    Route::put('/tables/{table}', [\App\Http\Controllers\Api\Vendor\RestaurantTableController::class, 'update'])->middleware('permission:hotels.edit.own|activities.edit.own');
    Route::delete('/tables/{table}', [\App\Http\Controllers\Api\Vendor\RestaurantTableController::class, 'destroy'])->middleware('permission:hotels.delete.own|activities.delete.own');

    // Restaurant POS: Orders & Kitchen Display
    Route::get('/hotels/{hotel}/orders', [\App\Http\Controllers\Api\Vendor\OrderController::class, 'index'])->defaults('ownerType', 'hotel')->middleware('permission:hotels.view.own');
    Route::post('/hotels/{hotel}/orders', [\App\Http\Controllers\Api\Vendor\OrderController::class, 'store'])->defaults('ownerType', 'hotel')->middleware('permission:hotels.edit.own');
    Route::get('/activities/{activity}/orders', [\App\Http\Controllers\Api\Vendor\OrderController::class, 'index'])->defaults('ownerType', 'activity')->middleware('permission:activities.view.own');
    Route::post('/activities/{activity}/orders', [\App\Http\Controllers\Api\Vendor\OrderController::class, 'store'])->defaults('ownerType', 'activity')->middleware('permission:activities.edit.own');
    Route::get('/orders/{order}', [\App\Http\Controllers\Api\Vendor\OrderController::class, 'show'])->middleware('permission:hotels.view.own|activities.view.own');
    Route::put('/orders/{order}/status', [\App\Http\Controllers\Api\Vendor\OrderController::class, 'updateStatus'])->middleware('permission:hotels.edit.own|activities.edit.own');
    Route::put('/orders/{order}/rush', [\App\Http\Controllers\Api\Vendor\OrderController::class, 'updateRush'])->middleware('permission:hotels.edit.own|activities.edit.own');
    Route::put('/orders/{order}/items/{item}/status', [\App\Http\Controllers\Api\Vendor\OrderController::class, 'updateItemStatus'])->middleware('permission:hotels.edit.own|activities.edit.own');

    // Restaurant POS: Earnings/Inventory Report
    Route::get('/hotels/{hotel}/reports/earnings', [\App\Http\Controllers\Api\Vendor\ReportController::class, 'earnings'])->defaults('ownerType', 'hotel')->middleware('permission:hotels.view.own');
    Route::get('/activities/{activity}/reports/earnings', [\App\Http\Controllers\Api\Vendor\ReportController::class, 'earnings'])->defaults('ownerType', 'activity')->middleware('permission:activities.view.own');

    // Media Library (Vendor needs to upload images too)
    Route::get('/media-library', [\App\Http\Controllers\Api\Vendor\MediaLibraryController::class, 'index'])->middleware('permission:media.view.own');
    Route::post('/media-library/upload', [\App\Http\Controllers\Api\Vendor\MediaLibraryController::class, 'upload'])->middleware('permission:media.upload');
    Route::delete('/media-library', [\App\Http\Controllers\Api\Vendor\MediaLibraryController::class, 'destroy'])->middleware('permission:media.delete.own');

    // Tour Guide Services (Vendor sees only their own guides; admin-created
    // pending approval to go public, same as Hotels/Activities above)
    Route::get('/tour-guides', [\App\Http\Controllers\Api\Vendor\TourGuideController::class, 'index'])->middleware('permission:tour_guides.view.own');
    Route::post('/tour-guides', [\App\Http\Controllers\Api\Vendor\TourGuideController::class, 'store'])->middleware('permission:tour_guides.create');
    Route::get('/tour-guides/{tourGuide}', [\App\Http\Controllers\Api\Vendor\TourGuideController::class, 'show'])->middleware('permission:tour_guides.view.own');
    Route::put('/tour-guides/{tourGuide}', [\App\Http\Controllers\Api\Vendor\TourGuideController::class, 'update'])->middleware('permission:tour_guides.edit.own');
    Route::delete('/tour-guides/{tourGuide}', [\App\Http\Controllers\Api\Vendor\TourGuideController::class, 'destroy'])->middleware('permission:tour_guides.delete.own');

    // Business Profile (the vendor's own public storefront details)
    Route::get('/profile', [\App\Http\Controllers\Api\Vendor\ProfileController::class, 'show']);
    Route::put('/profile', [\App\Http\Controllers\Api\Vendor\ProfileController::class, 'update']);
});

// Admin Routes (Admin and Manager only - full access)
Route::middleware(['auth:sanctum', 'admin.dashboard'])->prefix('admin')->group(function () {
    // Dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'stats'])->middleware('permission:system.analytics');
    Route::get('/dashboard/recent-bookings', [DashboardController::class, 'recentBookings'])->middleware('permission:bookings.view.all');
    Route::get('/dashboard/pending-requests', [DashboardController::class, 'pendingRequests'])->middleware('permission:bookings.view.all');
    Route::get('/dashboard/popular-items', [DashboardController::class, 'popularItems'])->middleware('permission:system.analytics');

    // Hotels Management (Admin sees all hotels)
    Route::get('/hotels', [AdminHotelController::class, 'index'])->middleware('permission:hotels.view.all');
    Route::post('/hotels', [AdminHotelController::class, 'store'])->middleware('permission:hotels.create');
    Route::get('/hotels/{hotel:id}', [AdminHotelController::class, 'show'])->middleware('permission:hotels.view.all');
    Route::put('/hotels/{hotel:id}', [AdminHotelController::class, 'update'])->middleware('permission:hotels.edit.all');
    Route::delete('/hotels/{hotel:id}', [AdminHotelController::class, 'destroy'])->middleware('permission:hotels.delete.all');
    Route::post('/hotels/{hotel:id}/toggle-featured', [AdminHotelController::class, 'toggleFeatured'])->middleware('permission:hotels.edit.all');
    Route::post('/hotels/{hotel:id}/toggle-banner', [AdminHotelController::class, 'toggleBanner'])->middleware('permission:hotels.edit.all');
    Route::post('/hotels/{hotel:id}/banner-order', [AdminHotelController::class, 'updateBannerOrder'])->middleware('permission:hotels.edit.all');
    Route::get('/hotels/banner-items', [AdminHotelController::class, 'getBannerItems'])->middleware('permission:hotels.view.all');

    // Activities Management (Admin sees all activities)
    Route::get('/activities', [AdminActivityController::class, 'index'])->middleware('permission:activities.view.all');
    Route::post('/activities', [AdminActivityController::class, 'store'])->middleware('permission:activities.create');
    Route::get('/activities/{activity:id}', [AdminActivityController::class, 'show'])->middleware('permission:activities.view.all');
    Route::put('/activities/{activity:id}', [AdminActivityController::class, 'update'])->middleware('permission:activities.edit.all');
    Route::delete('/activities/{activity:id}', [AdminActivityController::class, 'destroy'])->middleware('permission:activities.delete.all');
    Route::post('/activities/{activity:id}/toggle-featured', [AdminActivityController::class, 'toggleFeatured'])->middleware('permission:activities.edit.all');
    Route::post('/activities/{activity:id}/toggle-banner', [AdminActivityController::class, 'toggleBanner'])->middleware('permission:activities.edit.all');
    Route::post('/activities/{activity:id}/banner-order', [AdminActivityController::class, 'updateBannerOrder'])->middleware('permission:activities.edit.all');
    Route::get('/activities/banner-items', [AdminActivityController::class, 'getBannerItems'])->middleware('permission:activities.view.all');

    // Approvals (vendor-submitted hotels/activities awaiting review)
    Route::get('/approvals/dashboard', [ApprovalController::class, 'dashboard'])->middleware('permission:hotels.approve');
    Route::get('/approvals/pending-hotels', [ApprovalController::class, 'pendingHotels'])->middleware('permission:hotels.approve');
    Route::get('/approvals/pending-activities', [ApprovalController::class, 'pendingActivities'])->middleware('permission:activities.approve');
    Route::get('/approvals/pending-tour-guides', [ApprovalController::class, 'pendingTourGuides'])->middleware('permission:tour_guides.approve');
    Route::post('/approvals/hotels/{id}/approve', [ApprovalController::class, 'approveHotel'])->middleware('permission:hotels.approve');
    Route::post('/approvals/activities/{id}/approve', [ApprovalController::class, 'approveActivity'])->middleware('permission:activities.approve');
    Route::post('/approvals/tour-guides/{id}/approve', [ApprovalController::class, 'approveTourGuide'])->middleware('permission:tour_guides.approve');
    Route::post('/approvals/hotels/bulk-approve', [ApprovalController::class, 'bulkApproveHotels'])->middleware('permission:hotels.approve');
    Route::post('/approvals/activities/bulk-approve', [ApprovalController::class, 'bulkApproveActivities'])->middleware('permission:activities.approve');
    Route::post('/approvals/tour-guides/bulk-approve', [ApprovalController::class, 'bulkApproveTourGuides'])->middleware('permission:tour_guides.approve');

    // Bookings Management (Admin sees all bookings)
    Route::get('/bookings', [AdminBookingController::class, 'index'])->middleware('permission:bookings.view.all');
    Route::get('/bookings/{booking}', [AdminBookingController::class, 'show'])->middleware('permission:bookings.view.all');
    Route::put('/bookings/{booking}/status', [AdminBookingController::class, 'updateStatus'])->middleware('permission:bookings.edit.all');
    Route::post('/bookings/{booking}/confirm', [AdminBookingController::class, 'confirmBooking'])->middleware('permission:bookings.manage');
    Route::delete('/bookings/{booking}', [AdminBookingController::class, 'deleteBooking'])->middleware('permission:bookings.delete.all');
    Route::post('/bookings/{booking}/refund', [AdminBookingController::class, 'processRefund'])->middleware('permission:bookings.manage');

    // Users Management
    Route::get('/users', [AdminUserController::class, 'index'])->middleware('permission:users.view.all');
    Route::post('/users', [AdminUserController::class, 'store'])->middleware('permission:users.create');
    Route::get('/users/{user}', [AdminUserController::class, 'show'])->middleware('permission:users.view.all');
    Route::put('/users/{user}', [AdminUserController::class, 'update'])->middleware('permission:users.edit.all');
    Route::delete('/users/{user}', [AdminUserController::class, 'destroy'])->middleware('permission:users.delete.all');
    Route::post('/users/{user}/role', [AdminUserController::class, 'updateRole'])->middleware('permission:users.assign_roles');
    Route::post('/users/{user}/status', [AdminUserController::class, 'updateStatus'])->middleware('permission:users.edit.all');
    Route::post('/users/{user}/reset-password', [AdminUserController::class, 'resetPassword'])->middleware('permission:users.edit.all');

    // Reviews Management
    Route::get('/reviews', [AdminReviewController::class, 'index']);
    Route::put('/reviews/{review}/approve', [AdminReviewController::class, 'approve']);
    Route::delete('/reviews/{review}', [AdminReviewController::class, 'delete']);

    // Audit Log (superadmin/admin oversight trail)
    Route::get('/audit-log', [\App\Http\Controllers\Api\Admin\AuditLogController::class, 'index']);

    // Promotions (advertising / promotional banners)
    Route::get('/promotions', [\App\Http\Controllers\Api\Admin\PromotionController::class, 'index']);
    Route::post('/promotions', [\App\Http\Controllers\Api\Admin\PromotionController::class, 'store']);
    Route::get('/promotions/{promotion}', [\App\Http\Controllers\Api\Admin\PromotionController::class, 'show']);
    Route::put('/promotions/{promotion}', [\App\Http\Controllers\Api\Admin\PromotionController::class, 'update']);
    Route::delete('/promotions/{promotion}', [\App\Http\Controllers\Api\Admin\PromotionController::class, 'destroy']);
    Route::post('/promotions/{promotion}/toggle-active', [\App\Http\Controllers\Api\Admin\PromotionController::class, 'toggleActive']);

    // Exchange Rates (multi-currency display)
    Route::get('/exchange-rates', [\App\Http\Controllers\Api\Admin\ExchangeRateController::class, 'index']);
    Route::post('/exchange-rates', [\App\Http\Controllers\Api\Admin\ExchangeRateController::class, 'upsert']);
    Route::delete('/exchange-rates/{exchangeRate}', [\App\Http\Controllers\Api\Admin\ExchangeRateController::class, 'destroy']);

    // Package Bookings (fixed-price holiday packages)
    Route::get('/package-bookings', [\App\Http\Controllers\Api\Admin\PackageBookingController::class, 'index']);
    Route::get('/package-bookings/{packageBooking}', [\App\Http\Controllers\Api\Admin\PackageBookingController::class, 'show']);
    Route::post('/package-bookings/{packageBooking}/status', [\App\Http\Controllers\Api\Admin\PackageBookingController::class, 'updateStatus']);
    Route::post('/package-bookings/{packageBooking}/refund', [\App\Http\Controllers\Api\Admin\PackageBookingController::class, 'processRefund']);

    // Loyalty points
    Route::get('/loyalty/accounts', [\App\Http\Controllers\Api\Admin\LoyaltyController::class, 'accounts']);
    Route::post('/loyalty/accounts/{user}/adjust', [\App\Http\Controllers\Api\Admin\LoyaltyController::class, 'adjust']);
    Route::get('/loyalty/transactions', [\App\Http\Controllers\Api\Admin\LoyaltyController::class, 'transactions']);

    // Coupons (promo/discount codes)
    Route::get('/coupons', [\App\Http\Controllers\Api\Admin\CouponController::class, 'index']);
    Route::post('/coupons', [\App\Http\Controllers\Api\Admin\CouponController::class, 'store']);
    Route::get('/coupons/{coupon}', [\App\Http\Controllers\Api\Admin\CouponController::class, 'show']);
    Route::put('/coupons/{coupon}', [\App\Http\Controllers\Api\Admin\CouponController::class, 'update']);
    Route::delete('/coupons/{coupon}', [\App\Http\Controllers\Api\Admin\CouponController::class, 'destroy']);
    Route::post('/coupons/{coupon}/toggle-active', [\App\Http\Controllers\Api\Admin\CouponController::class, 'toggleActive']);
    Route::get('/coupons/{coupon}/redemptions', [\App\Http\Controllers\Api\Admin\CouponController::class, 'redemptions']);

    // Vendors Management (Admin only)
    Route::get('/vendors', [\App\Http\Controllers\Api\Admin\VendorController::class, 'index']);
    Route::post('/vendors', [\App\Http\Controllers\Api\Admin\VendorController::class, 'store']);
    Route::get('/vendors/{vendor}', [\App\Http\Controllers\Api\Admin\VendorController::class, 'show']);
    Route::put('/vendors/{vendor}', [\App\Http\Controllers\Api\Admin\VendorController::class, 'update']);
    Route::delete('/vendors/{vendor}', [\App\Http\Controllers\Api\Admin\VendorController::class, 'destroy']);
    Route::post('/vendors/{vendor}/toggle-status', [\App\Http\Controllers\Api\Admin\VendorController::class, 'toggleStatus']);
    Route::post('/vendors/{vendor}/reset-password', [\App\Http\Controllers\Api\Admin\VendorController::class, 'resetPassword']);

    // Media Library
    Route::get('/media-library', [\App\Http\Controllers\Api\Admin\MediaLibraryController::class, 'index']);
    Route::post('/media-library/upload', [\App\Http\Controllers\Api\Admin\MediaLibraryController::class, 'upload']);
    Route::delete('/media-library', [\App\Http\Controllers\Api\Admin\MediaLibraryController::class, 'destroy']);

    // Other admin routes...
    Route::get('/seo', [\App\Http\Controllers\Api\Admin\SeoController::class, 'index']);
    Route::post('/seo', [\App\Http\Controllers\Api\Admin\SeoController::class, 'store']);
    Route::put('/seo/{seo}', [\App\Http\Controllers\Api\Admin\SeoController::class, 'update']);
    Route::delete('/seo/{seo}', [\App\Http\Controllers\Api\Admin\SeoController::class, 'destroy']);
    Route::get('/settings', [\App\Http\Controllers\Api\Admin\SiteSettingController::class, 'index']);
    Route::get('/settings/groups', [\App\Http\Controllers\Api\Admin\SiteSettingController::class, 'getGroups']);
    Route::get('/settings/initialize', [\App\Http\Controllers\Api\Admin\SiteSettingController::class, 'initializeDefaults']);
    Route::get('/settings/all', [\App\Http\Controllers\Api\Admin\SiteSettingController::class, 'getAll']);
    Route::get('/settings/group/{group}', [\App\Http\Controllers\Api\Admin\SiteSettingController::class, 'getByGroup']);
    Route::put('/settings/bulk', [\App\Http\Controllers\Api\Admin\SiteSettingController::class, 'bulkUpdate']);
    Route::post('/settings', [\App\Http\Controllers\Api\Admin\SiteSettingController::class, 'store']);
    Route::put('/settings/{setting}', [\App\Http\Controllers\Api\Admin\SiteSettingController::class, 'update']);
    Route::delete('/settings/{setting}', [\App\Http\Controllers\Api\Admin\SiteSettingController::class, 'destroy']);
    Route::get('/about', [\App\Http\Controllers\Api\Admin\AboutPageController::class, 'index']);
    Route::post('/about', [\App\Http\Controllers\Api\Admin\AboutPageController::class, 'store']);
    Route::put('/about/{about}', [\App\Http\Controllers\Api\Admin\AboutPageController::class, 'update']);
    Route::get('/tour-guides', [\App\Http\Controllers\Api\Admin\TourGuideController::class, 'index']);
    Route::post('/tour-guides', [\App\Http\Controllers\Api\Admin\TourGuideController::class, 'store']);
    Route::post('/tour-guides/upload-image', [\App\Http\Controllers\Api\Admin\TourGuideController::class, 'uploadImage']);
    Route::post('/tour-guides/seed-defaults', [TourGuideSeederController::class, 'seedDefaultGuides']);
    Route::get('/tour-guides/{tourGuide}', [\App\Http\Controllers\Api\Admin\TourGuideController::class, 'show']);
    Route::put('/tour-guides/{tourGuide}', [\App\Http\Controllers\Api\Admin\TourGuideController::class, 'update']);
    Route::delete('/tour-guides/{tourGuide}', [\App\Http\Controllers\Api\Admin\TourGuideController::class, 'destroy']);
    Route::get('/tour-guide-bookings', [\App\Http\Controllers\Api\Admin\TourGuideController::class, 'getBookings']);
    Route::post('/tour-guide-bookings/{bookingId}/status', [\App\Http\Controllers\Api\Admin\TourGuideController::class, 'updateBookingStatus']);

    // Itineraries Management (curated packages)
    Route::get('/itineraries', [AdminItineraryController::class, 'index']);
    Route::post('/itineraries', [AdminItineraryController::class, 'store']);
    Route::get('/itineraries/{itinerary:id}', [AdminItineraryController::class, 'show']);
    Route::put('/itineraries/{itinerary:id}', [AdminItineraryController::class, 'update']);
    Route::delete('/itineraries/{itinerary:id}', [AdminItineraryController::class, 'destroy']);
    Route::post('/itineraries/{itinerary:id}/items', [AdminItineraryController::class, 'addItem']);
    Route::put('/itineraries/{itinerary:id}/items/{item}', [AdminItineraryController::class, 'updateItem']);
    Route::delete('/itineraries/{itinerary:id}/items/{item}', [AdminItineraryController::class, 'removeItem']);
    Route::get('/enquiries', [\App\Http\Controllers\Api\Admin\EnquiryController::class, 'index']);
    Route::get('/enquiries/{enquiry}', [\App\Http\Controllers\Api\Admin\EnquiryController::class, 'show']);
    Route::put('/enquiries/{enquiry}/status', [\App\Http\Controllers\Api\Admin\EnquiryController::class, 'updateStatus']);
    Route::post('/enquiries/{enquiry}/respond', [\App\Http\Controllers\Api\Admin\EnquiryController::class, 'respond']);
    Route::delete('/enquiries/{enquiry}', [\App\Http\Controllers\Api\Admin\EnquiryController::class, 'destroy']);
    Route::get('/pages', [\App\Http\Controllers\Api\Admin\PageController::class, 'index']);
    Route::post('/pages', [\App\Http\Controllers\Api\Admin\PageController::class, 'store']);
    Route::get('/pages/{page}', [\App\Http\Controllers\Api\Admin\PageController::class, 'show']);
    Route::put('/pages/{page}', [\App\Http\Controllers\Api\Admin\PageController::class, 'update']);
    Route::delete('/pages/{page}', [\App\Http\Controllers\Api\Admin\PageController::class, 'destroy']);
});
