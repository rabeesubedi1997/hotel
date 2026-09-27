<?php

use App\Http\Controllers\SpaController;
use Illuminate\Support\Facades\Route;

// Serves the built React SPA (backend/public/spa.html + public/assets/*,
// produced by frontend's `npm run build`) for every non-API route, so one
// Laravel document root can host both the API and the frontend on shared
// hosting where a separate Node process/subdomain isn't available. Static
// assets under public/ are served directly by Apache before this ever
// runs; routes/api.php's "/api/*" prefix never reaches this catch-all.
// A controller action, not a closure, so `php artisan route:cache` (used
// in scripts/deploy-server.sh) can actually cache this route.
Route::get('/{any?}', [SpaController::class, 'index'])->where('any', '.*')->name('spa');
