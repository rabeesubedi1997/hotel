<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;

class UploadController extends Controller
{
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $filename = time() . '_' . $file->getClientOriginalName();
            
            // Store in public disk under uploads folder
            $path = $file->storeAs('uploads', $filename, 'public');
            
            // Return the public URL
            $url = asset('storage/' . $path);
            
            return response()->json([
                'message' => 'Image uploaded successfully',
                'url' => $url,
                'path' => $path,
            ]);
        }

        return response()->json([
            'message' => 'No image provided'
        ], 400);
    }
}
