<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SeoSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'page',
        'title',
        'description',
        'keywords',
        'og_image',
        'canonical',
        'noindex',
        'json_ld',
    ];

    protected $casts = [
        'noindex' => 'boolean',
        'json_ld' => 'json',
    ];

    // Predefined pages
    const PAGES = [
        'home' => 'Home Page',
        'hotels' => 'Hotels List',
        'activities' => 'Activities List',
        'login' => 'Login',
        'register' => 'Register',
        'contact' => 'Contact',
        'about' => 'About Us',
    ];

    public static function getSetting($page)
    {
        return self::where('page', $page)->first();
    }

    public static function getGlobalSettings()
    {
        return self::where('page', 'global')->first();
    }
}
