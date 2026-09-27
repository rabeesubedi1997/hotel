<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Concerns\ActsForVendor;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class MediaLibraryController extends Controller
{
    use ActsForVendor;

    public function index(Request $request): JsonResponse
    {
        $folder = $request->input('folder', '');
        $search = $request->input('search', '');
        $userId = $this->vendorId($request);
        $vendorFolder = "vendor_{$userId}";
        
        $directories = [];
        $files = [];
        
        // Get vendor's folders
        if (Storage::exists("uploads/$vendorFolder")) {
            $directories = Storage::directories("uploads/$vendorFolder");
            
            foreach ($directories as $dir) {
                $directories[] = [
                    'name' => $dir,
                    'path' => "$vendorFolder/$dir"
                ];
            }
        }
        
        // Get files from the requested folder
        if ($folder) {
            $folderPath = "$vendorFolder/$folder";
            if (Storage::exists("uploads/$folderPath")) {
                $allFiles = Storage::files("uploads/$folderPath");
                
                foreach ($allFiles as $file) {
                    if (str_contains(strtolower($file), strtolower($search))) {
                        $files[] = [
                            'name' => $file,
                            'path' => "$folderPath/$file",
                            'url' => url("uploads/$folderPath/$file"),
                            'size' => Storage::size("uploads/$folderPath/$file"),
                            'modified' => Storage::lastModified("uploads/$folderPath/$file")
                        ];
                    }
                }
            }
        }
        
        return response()->json([
            'files' => $files,
            'folders' => $directories
        ]);
    }
    
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,jpg,png,gif,webp|max:5120'
        ]);
        
        $file = $request->file('image');
        $folder = $request->input('folder', 'general');
        $userId = $this->vendorId($request);
        
        if ($file) {
            $filename = time() . '_' . $file->getClientOriginalName();
            
            // Create vendor-specific folder structure
            $vendorFolder = "vendor_{$userId}";
            $fullPath = "$vendorFolder/$folder";
            
            // Ensure directories exist
            if (!Storage::exists("uploads/$vendorFolder")) {
                Storage::makeDirectory("uploads/$vendorFolder");
            }
            if (!Storage::exists("uploads/$fullPath")) {
                Storage::makeDirectory("uploads/$fullPath");
            }
            
            $path = $file->storeAs($filename, "uploads/$fullPath");
            
            return response()->json([
                'url' => url("uploads/$fullPath/$filename"),
                'filename' => $filename
            ]);
        }
        
        return response()->json(['error' => 'No file uploaded'], 422);
    }
    
    public function destroy(Request $request): JsonResponse
    {
        $path = $request->input('path');
        $userId = $this->vendorId($request);
        
        // Check if file belongs to current vendor
        $isVendorFile = $this->isVendorFile(storage_path("app/public/uploads/$path"), $userId);
        
        if (!$isVendorFile) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }
        
        if (Storage::exists("uploads/$path")) {
            Storage::delete("uploads/$path");
        }
        
        return response()->json(['message' => 'File deleted successfully']);
    }
    
    private function isVendorFile($filePath, $userId): bool
    {
        // Check if file belongs to vendor's folder
        $userFolder = "vendor_{$userId}";
        return str_contains($filePath, $userFolder) || 
               str_contains($filePath, 'general') ||
               str_contains($filePath, 'temp');
    }
}
