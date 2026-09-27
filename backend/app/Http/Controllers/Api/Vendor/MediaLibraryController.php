<?php

namespace App\Http\Controllers\Api\Vendor;

use App\Http\Controllers\Concerns\ActsForVendor;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaLibraryController extends Controller
{
    use ActsForVendor;

    public function index(Request $request): JsonResponse
    {
        $folder = $request->get('folder', '');
        $search = $request->get('search', '');
        $vendorRoot = 'vendor_' . $this->vendorId($request);
        $relativeFolder = $folder ? "$vendorRoot/$folder" : $vendorRoot;

        $basePath = storage_path("app/public/uploads/$relativeFolder");

        if (!is_dir($basePath)) {
            return response()->json(['files' => [], 'folders' => []]);
        }

        $files = [];
        $folders = [];

        $iterator = new \DirectoryIterator($basePath);

        foreach ($iterator as $file) {
            if ($file->isDot()) {
                continue;
            }

            if ($file->isDir()) {
                $folders[] = [
                    'name' => $file->getFilename(),
                    'path' => $folder ? "$folder/" . $file->getFilename() : $file->getFilename(),
                ];
                continue;
            }

            $filename = $file->getFilename();

            if ($search && !str_contains(strtolower($filename), strtolower($search))) {
                continue;
            }

            $ext = strtolower($file->getExtension());
            if (!in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp'])) {
                continue;
            }

            $relativePath = "uploads/$relativeFolder/$filename";
            $baseUrl = $request->getSchemeAndHttpHost();

            $files[] = [
                'name' => $filename,
                'url' => $baseUrl . '/storage/' . $relativePath,
                'path' => $relativePath,
                'size' => $this->formatBytes($file->getSize()),
                'modified' => date('Y-m-d H:i:s', $file->getMTime()),
                'type' => $ext,
            ];
        }

        usort($files, fn ($a, $b) => strtotime($b['modified']) - strtotime($a['modified']));
        usort($folders, fn ($a, $b) => strcmp($a['name'], $b['name']));

        return response()->json([
            'files' => $files,
            'folders' => $folders,
        ]);
    }

    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,jpg,png,gif,webp|max:5120',
            'folder' => 'nullable|string',
        ]);

        $folder = preg_replace('/[^a-zA-Z0-9_-]/', '', $request->get('folder', 'general'));
        $vendorRoot = 'vendor_' . $this->vendorId($request);

        $file = $request->file('image');
        $filename = time() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '', $file->getClientOriginalName());

        $path = $file->storeAs("uploads/$vendorRoot/$folder", $filename, 'public');

        $baseUrl = $request->getSchemeAndHttpHost();

        return response()->json([
            'message' => 'Image uploaded successfully',
            'url' => $baseUrl . '/storage/' . $path,
            'path' => $path,
            'name' => $filename,
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $request->validate([
            'path' => 'required|string',
        ]);

        $path = $request->get('path');
        $userId = $this->vendorId($request);

        if (!str_starts_with($path, 'uploads/') || !$this->isVendorFile($path, $userId)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $fullPath = storage_path('app/public/' . $path);

        if (file_exists($fullPath)) {
            unlink($fullPath);
            return response()->json(['message' => 'Image deleted successfully']);
        }

        return response()->json(['message' => 'File not found'], 404);
    }

    private function isVendorFile(string $path, $userId): bool
    {
        return str_contains($path, "vendor_{$userId}/");
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
