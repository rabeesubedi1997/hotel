<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AboutPage extends Model
{
    use HasFactory;

    protected $fillable = [
        'hero_title',
        'hero_subtitle',
        'hero_image',
        'company_name',
        'company_description',
        'mission_title',
        'mission_description',
        'vision_title',
        'vision_description',
        'story_title',
        'story_content',
        'features',
        'stats',
        'team_members',
        'contact_cta_title',
        'contact_cta_description',
        'meta_title',
        'meta_description',
        'is_published',
    ];

    protected $casts = [
        'features' => 'array',
        'stats' => 'array',
        'team_members' => 'array',
        'is_published' => 'boolean',
    ];

    protected static function boot()
    {
        parent::boot();

        static::creating(function ($about) {
            if (empty($about->meta_title)) {
                $about->meta_title = $about->hero_title ?? 'About Us';
            }
        });
    }
}
