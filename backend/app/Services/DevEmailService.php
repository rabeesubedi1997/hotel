<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;

class DevEmailService
{
    public static function saveEmailAsHtml($to, $subject, $view, $data): string
    {
        $html = view($view, $data)->render();
        $filename = date('Y-m-d_H-i-s') . '_' . uniqid() . '.html';
        $path = 'emails/' . $filename;
        
        Storage::disk('local')->put($path, $html);
        
        // Also save metadata
        $meta = [
            'to' => $to,
            'subject' => $subject,
            'sent_at' => now()->toDateTimeString(),
            'file' => $filename,
        ];
        Storage::disk('local')->put('emails/' . date('Y-m-d_H-i-s') . '_' . uniqid() . '.json', json_encode($meta, JSON_PRETTY_PRINT));
        
        return storage_path('app/' . $path);
    }
    
    public static function getRecentEmails(int $limit = 10): array
    {
        $files = Storage::disk('local')->files('emails');
        $htmlFiles = array_filter($files, fn($f) => str_ends_with($f, '.html'));
        rsort($htmlFiles);
        
        $emails = [];
        foreach (array_slice($htmlFiles, 0, $limit) as $file) {
            $emails[] = [
                'file' => $file,
                'path' => storage_path('app/' . $file),
                'url' => url('/storage/emails/' . basename($file)),
                'time' => Storage::disk('local')->lastModified($file),
            ];
        }
        
        return $emails;
    }
}
