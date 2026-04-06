<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AboutPage;
use Illuminate\Http\JsonResponse;

class AboutPageController extends Controller
{
    public function show(): JsonResponse
    {
        $aboutPage = AboutPage::where('is_published', true)->first();
        
        if (!$aboutPage) {
            return response()->json([
                'message' => 'About page not found'
            ], 404);
        }
        
        return response()->json($aboutPage);
    }
}
