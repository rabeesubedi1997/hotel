<?php

namespace App\Http\Controllers;

use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * Serves the built React SPA (backend/public/spa.html + public/assets/*)
 * for every non-API route — see routes/web.php. A controller method
 * rather than a closure, since closure-based routes can't be cached by
 * `php artisan route:cache` (used in scripts/deploy-server.sh).
 */
class SpaController extends Controller
{
    public function index(): BinaryFileResponse
    {
        return response()->file(public_path('spa.html'));
    }
}
