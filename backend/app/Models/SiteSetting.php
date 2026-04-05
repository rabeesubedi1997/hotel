<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SiteSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'key',
        'value',
        'type',
        'group',
        'label',
        'description',
    ];

    protected $casts = [
        'value' => 'json',
    ];

    // Predefined settings groups
    const GROUPS = [
        'general' => 'General Settings',
        'branding' => 'Branding & Logo',
        'navigation' => 'Navigation & Menus',
        'contact' => 'Contact Information',
        'social' => 'Social Media',
        'advanced' => 'Advanced Settings',
    ];

    // Predefined settings with defaults
    const DEFAULTS = [
        // General
        'site_name' => [
            'value' => 'ReserveNow',
            'type' => 'text',
            'group' => 'general',
            'label' => 'Site Name',
            'description' => 'The name of your website',
        ],
        'site_tagline' => [
            'value' => 'Your gateway to luxury hotels and adventure activities in Nepal',
            'type' => 'textarea',
            'group' => 'general',
            'label' => 'Site Tagline',
            'description' => 'A short description of your website',
        ],
        'site_logo' => [
            'value' => '/logo.png',
            'type' => 'image',
            'group' => 'branding',
            'label' => 'Site Logo',
            'description' => 'Main website logo',
        ],
        'site_favicon' => [
            'value' => '/favicon.ico',
            'type' => 'image',
            'group' => 'branding',
            'label' => 'Favicon',
            'description' => 'Browser tab icon',
        ],
        'primary_color' => [
            'value' => '#4f46e5',
            'type' => 'color',
            'group' => 'branding',
            'label' => 'Primary Color',
            'description' => 'Main brand color',
        ],
        // Navigation
        'header_menu' => [
            'value' => [
                ['label' => 'Hotels', 'url' => '/hotels', 'icon' => 'Building2'],
                ['label' => 'Activities', 'url' => '/activities', 'icon' => 'Compass'],
                ['label' => 'About', 'url' => '/about', 'icon' => 'Info'],
                ['label' => 'Contact', 'url' => '/contact', 'icon' => 'Mail'],
            ],
            'type' => 'menu',
            'group' => 'navigation',
            'label' => 'Header Menu',
            'description' => 'Main navigation menu items',
        ],
        'footer_menu' => [
            'value' => [
                ['label' => 'Hotels', 'url' => '/hotels'],
                ['label' => 'Activities', 'url' => '/activities'],
                ['label' => 'About Us', 'url' => '/about'],
                ['label' => 'Contact', 'url' => '/contact'],
            ],
            'type' => 'menu',
            'group' => 'navigation',
            'label' => 'Footer Menu',
            'description' => 'Footer navigation links',
        ],
        // Contact
        'contact_address' => [
            'value' => 'Thamel, Kathmandu, Nepal',
            'type' => 'textarea',
            'group' => 'contact',
            'label' => 'Address',
            'description' => 'Business address',
        ],
        'contact_email' => [
            'value' => 'info@reservenow.com',
            'type' => 'email',
            'group' => 'contact',
            'label' => 'Email',
            'description' => 'Contact email address',
        ],
        'contact_phone' => [
            'value' => '+977 1 4412345',
            'type' => 'text',
            'group' => 'contact',
            'label' => 'Phone',
            'description' => 'Contact phone number',
        ],
        // Social
        'social_facebook' => [
            'value' => '',
            'type' => 'url',
            'group' => 'social',
            'label' => 'Facebook URL',
            'description' => 'Facebook page link',
        ],
        'social_instagram' => [
            'value' => '',
            'type' => 'url',
            'group' => 'social',
            'label' => 'Instagram URL',
            'description' => 'Instagram profile link',
        ],
        'social_twitter' => [
            'value' => '',
            'type' => 'url',
            'group' => 'social',
            'label' => 'Twitter URL',
            'description' => 'Twitter profile link',
        ],
        'social_youtube' => [
            'value' => '',
            'type' => 'url',
            'group' => 'social',
            'label' => 'YouTube URL',
            'description' => 'YouTube channel link',
        ],
        // Advanced
        'maintenance_mode' => [
            'value' => false,
            'type' => 'boolean',
            'group' => 'advanced',
            'label' => 'Maintenance Mode',
            'description' => 'Put site in maintenance mode',
        ],
        'analytics_code' => [
            'value' => '',
            'type' => 'textarea',
            'group' => 'advanced',
            'label' => 'Analytics Code',
            'description' => 'Google Analytics or other tracking code',
        ],
    ];

    public static function getValue($key, $default = null)
    {
        $setting = self::where('key', $key)->first();
        if ($setting) {
            return $setting->value;
        }
        
        // Return default if exists
        if (isset(self::DEFAULTS[$key])) {
            return self::DEFAULTS[$key]['value'];
        }
        
        return $default;
    }

    public static function getGroup($group)
    {
        $settings = self::where('group', $group)->get();
        $result = [];
        
        foreach ($settings as $setting) {
            $result[$setting->key] = $setting->value;
        }
        
        // Fill in defaults for missing settings
        foreach (self::DEFAULTS as $key => $config) {
            if ($config['group'] === $group && !isset($result[$key])) {
                $result[$key] = $config['value'];
            }
        }
        
        return $result;
    }

    public static function getAll()
    {
        $settings = self::all()->keyBy('key');
        $result = [];
        
        foreach (self::DEFAULTS as $key => $config) {
            if (isset($settings[$key])) {
                $result[$key] = $settings[$key]->value;
            } else {
                $result[$key] = $config['value'];
            }
        }
        
        return $result;
    }

    public static function initializeDefaults()
    {
        foreach (self::DEFAULTS as $key => $config) {
            self::firstOrCreate(
                ['key' => $key],
                [
                    'value' => $config['value'],
                    'type' => $config['type'],
                    'group' => $config['group'],
                    'label' => $config['label'],
                    'description' => $config['description'],
                ]
            );
        }
    }
}
