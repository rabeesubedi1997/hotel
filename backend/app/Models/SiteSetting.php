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
        'footer' => 'Footer',
        'loyalty' => 'Loyalty Program',
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
            'group' => 'footer',
            'label' => 'Footer Quick Links',
            'description' => 'Link list shown in the footer\'s "Quick Links" column',
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
        // Footer
        'footer_description' => [
            'value' => 'Handpicked hotels, activities, and local guides across Nepal — planned, booked, and supported by a team that knows the ground.',
            'type' => 'textarea',
            'group' => 'footer',
            'label' => 'Footer Description',
            'description' => 'Short blurb shown under the logo in the footer brand column',
        ],
        'footer_newsletter_enabled' => [
            'value' => true,
            'type' => 'boolean',
            'group' => 'footer',
            'label' => 'Show Newsletter Signup',
            'description' => 'Show the "Stay in the loop" email signup bar above the footer columns',
        ],
        'footer_newsletter_heading' => [
            'value' => 'Deals, new stays, and adventure ideas — straight to your inbox.',
            'type' => 'text',
            'group' => 'footer',
            'label' => 'Newsletter Heading',
            'description' => 'Headline shown in the footer newsletter signup bar',
        ],
        'footer_directory' => [
            'value' => [
                ['label' => 'Hotels & Stays', 'url' => '/hotels'],
                ['label' => 'Activities', 'url' => '/activities'],
                ['label' => 'Tour Guides', 'url' => '/tour-guides'],
                ['label' => 'Holiday Packages', 'url' => '/itineraries'],
                ['label' => 'Trip Planner', 'url' => '/trip-planner'],
                ['label' => 'Get a Quote', 'url' => '/quote'],
                ['label' => 'Become a Partner', 'url' => '/register'],
                ['label' => 'Support', 'url' => '/contact'],
            ],
            'type' => 'menu',
            'group' => 'footer',
            'label' => 'Footer Directory Grid',
            'description' => 'Department-style link grid shown above the payment row in the footer',
        ],
        'footer_payment_methods' => [
            'value' => 'Cash on Delivery, Khalti, Stripe',
            'type' => 'text',
            'group' => 'footer',
            'label' => 'Accepted Payment Methods',
            'description' => 'Comma-separated list of payment badges shown in the footer ("We accept" row)',
        ],
        'footer_copyright_text' => [
            'value' => 'All rights reserved.',
            'type' => 'text',
            'group' => 'footer',
            'label' => 'Copyright Text',
            'description' => 'Text shown after the site name and year in the footer\'s bottom bar',
        ],
        // Loyalty Program
        'loyalty_earn_rate_percent' => [
            'value' => 5,
            'type' => 'number',
            'group' => 'loyalty',
            'label' => 'Points Earn Rate (%)',
            'description' => 'Points earned per confirmed booking, as a percentage of the amount paid (1 point = $1 of redemption value)',
        ],
        'loyalty_redemption_rate' => [
            'value' => 100,
            'type' => 'number',
            'group' => 'loyalty',
            'label' => 'Points Per $1 Redeemed',
            'description' => 'How many points a customer spends to redeem $1 of discount at checkout',
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
