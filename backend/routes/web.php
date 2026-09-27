<?php

use Illuminate\Support\Facades\Route;

// Serves the built React SPA (backend/public/spa.html + public/assets/*,
// produced by frontend's `npm run build`) for every non-API route, so one
// Laravel document root can host both the API and the frontend on shared
// hosting where a separate Node process/subdomain isn't available. Static
// assets under public/ are served directly by Apache before this ever
// runs; routes/api.php's "/api/*" prefix never reaches this catch-all.
Route::get('/{any?}', function () {
    return response()->file(public_path('spa.html'));
})->where('any', '.*')->name('spa');
