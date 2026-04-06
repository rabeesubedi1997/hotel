<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Page extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug',
        'title',
        'meta_description',
        'sections',
        'is_active',
    ];

    protected $casts = [
        'sections' => 'array',
        'is_active' => 'boolean',
    ];

    public function getSection($key, $default = null)
    {
        return data_get($this->sections, $key, $default);
    }

    public function setSection($key, $value)
    {
        $sections = $this->sections ?? [];
        data_set($sections, $key, $value);
        $this->sections = $sections;
        return $this;
    }
}
