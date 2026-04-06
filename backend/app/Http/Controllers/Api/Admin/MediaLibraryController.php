<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MediaLibraryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $folder = $request->get('folder', '');
        $search = $request->get('search', '');
        
        $basePath = storage_path('app/public/uploads');
        $searchPath = $folder ? "$basePath/$folder" : $basePath;
        
        if (!is_dir($searchPath)) {
            return response()->json(['files' => [], 'folders' => []]);
        }
        
        $files = [];
        $folders = [];
        
        $iterator = new \DirectoryIterator($searchPath);
        
        foreach ($iterator as $file) {
            if ($file->isDot()) continue;
            
            if ($file->isDir()) {
                $folders[] = [
                    'name' => $file->getFilename(),
                    'path' => $folder ? "$folder/" . $file->getFilename() : $file->getFilename(),
                ];
            } else {
                $filename = $file->getFilename();
                
                // Filter by search term
                if ($search && !str_contains(strtolower($filename), strtolower($search))) {
                    continue;
                }
                
                // Only include image files
                $ext = strtolower($file->getExtension());
                if (!in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
                    continue;
                }
                
                $relativePath = $folder ? "uploads/$folder/$filename" : "uploads/$filename";
                // Build absolute URL using request info to ensure correct port
                $baseUrl = request()->getSchemeAndHttpHost();
                $url = $baseUrl . '/storage/' . $relativePath;
                
                $files[] = [
                    'name' => $filename,
                    'url' => $url,
                    'path' => $relativePath,
                    'size' => $this->formatBytes($file->getSize()),
                    'modified' => date('Y-m-d H:i:s', $file->getMTime()),
                    'type' => $ext,
                ];
            }
        }
        
        // Sort files by modified date (newest first)
        usort($files, function($a, $b) {
            return strtotime($b['modified']) - strtotime($a['modified']);
        });
        
        // Sort folders alphabetically
        usort($folders, function($a, $b) {
            return strcmp($a['name'], $b['name']);
        });
        
        return response()->json([
            'files' => $files,
            'folders' => $folders,
            'current_folder' => $folder,
        ]);
    }
    
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif,webp|max:5120',
            'folder' => 'nullable|string',
        ]);
        
        $folder = $request->get('folder', 'general');
        $folder = preg_replace('/[^a-zA-Z0-9_-]/', '', $folder);
        
        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $filename = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $file->getClientOriginalName());
            $folder = $request->get('folder', 'general');
            $folder = preg_replace('/[^a-zA-Z0-9_-]/', '', $folder);
            $path = $file->storeAs("uploads/$folder", $filename, 'public');
            // Build absolute URL using request info to ensure correct port
            $baseUrl = request()->getSchemeAndHttpHost();
            $url = $baseUrl . '/storage/' . $path;
            
            return response()->json([
                'message' => 'Image uploaded successfully',
                'url' => $url,
                'path' => $path,
                'name' => $filename,
            ]);
        }
        
        return response()->json(['message' => 'No image provided'], 400);
    }
    
    public function destroy(Request $request): JsonResponse
    {
        $request->validate([
            'path' => 'required|string',
        ]);
        
        $path = $request->get('path');
        $fullPath = storage_path('app/public/' . $path);
        
        // Security check - make sure path is within uploads directory
        if (!str_starts_with($path, 'uploads/')) {
            return response()->json(['message' => 'Invalid path'], 400);
        }
        
        if (file_exists($fullPath)) {
            unlink($fullPath);
            return response()->json(['message' => 'Image deleted successfully']);
        }
        
        return response()->json(['message' => 'File not found'], 404);
    }
    
    private function formatBytes($bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $unitIndex = 0;
        
        while ($bytes >= 1024 && $unitIndex < count($units) - 1) {
            $bytes /= 1024;
            $unitIndex++;
        }
        
        return round($bytes, 2) . ' ' . $units[$unitIndex];
    }
}
