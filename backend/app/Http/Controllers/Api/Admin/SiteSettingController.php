<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SiteSetting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SiteSettingController extends Controller
{
    public function index(): JsonResponse
    {
        // Get settings from database
        $dbSettings = SiteSetting::all();
        
        // Create a map of existing settings
        $existingKeys = $dbSettings->pluck('key')->toArray();
        
        // Add default settings that don't exist in database
        foreach (SiteSetting::DEFAULTS as $key => $default) {
            if (!in_array($key, $existingKeys)) {
                $dbSettings->push(new SiteSetting([
                    'key' => $key,
                    'value' => $default['value'],
                    'type' => $default['type'],
                    'group' => $default['group'],
                    'label' => $default['label'],
                    'description' => $default['description'],
                ]));
            }
        }
        
        $settings = $dbSettings->groupBy('group');
        
        return response()->json([
            'settings' => $settings,
            'groups' => SiteSetting::GROUPS,
            'defaults' => SiteSetting::DEFAULTS,
        ]);
    }

    public function getByGroup(string $group): JsonResponse
    {
        $settings = SiteSetting::getGroup($group);
        return response()->json($settings);
    }

    public function getAll(): JsonResponse
    {
        $settings = SiteSetting::getAll();
        return response()->json($settings);
    }

    public function show(string $key): JsonResponse
    {
        $setting = SiteSetting::where('key', $key)->first();
        
        if (!$setting && isset(SiteSetting::DEFAULTS[$key])) {
            $default = SiteSetting::DEFAULTS[$key];
            return response()->json([
                'key' => $key,
                'value' => $default['value'],
                'type' => $default['type'],
                'group' => $default['group'],
                'label' => $default['label'],
                'description' => $default['description'],
            ]);
        }
        
        if (!$setting) {
            return response()->json(['message' => 'Setting not found'], 404);
        }
        
        return response()->json($setting);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'key' => 'required|string|unique:site_settings,key',
            'value' => 'nullable',
            'type' => 'required|string|in:text,textarea,image,color,boolean,url,menu,json,email,number',
            'group' => 'required|string',
            'label' => 'required|string',
            'description' => 'nullable|string',
        ]);

        $setting = SiteSetting::create($validated);

        return response()->json([
            'message' => 'Setting created successfully',
            'data' => $setting
        ], 201);
    }

    public function update(Request $request, string $key): JsonResponse
    {
        $setting = SiteSetting::where('key', $key)->first();

        $validated = $request->validate([
            'value' => 'nullable',
            'type' => 'sometimes|string|in:text,textarea,image,color,boolean,url,menu,json,email,number',
            'group' => 'sometimes|string',
            'label' => 'sometimes|string',
            'description' => 'nullable|string',
        ]);

        if ($setting) {
            $setting->update($validated);
        } else {
            // Create new setting if it doesn't exist
            $validated['key'] = $key;
            if (!isset($validated['type'])) {
                $validated['type'] = 'text';
            }
            if (!isset($validated['group'])) {
                $validated['group'] = 'general';
            }
            if (!isset($validated['label'])) {
                $validated['label'] = ucfirst(str_replace('_', ' ', $key));
            }
            $setting = SiteSetting::create($validated);
        }

        return response()->json([
            'message' => 'Setting updated successfully',
            'data' => $setting
        ]);
    }

    public function bulkUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'nullable',
        ]);

        foreach ($validated['settings'] as $item) {
            $setting = SiteSetting::where('key', $item['key'])->first();
            
            if ($setting) {
                $setting->update(['value' => $item['value']]);
            } else if (isset(SiteSetting::DEFAULTS[$item['key']])) {
                $default = SiteSetting::DEFAULTS[$item['key']];
                SiteSetting::create([
                    'key' => $item['key'],
                    'value' => $item['value'],
                    'type' => $default['type'],
                    'group' => $default['group'],
                    'label' => $default['label'],
                    'description' => $default['description'],
                ]);
            }
        }

        return response()->json([
            'message' => 'Settings updated successfully'
        ]);
    }

    public function destroy(string $key): JsonResponse
    {
        $setting = SiteSetting::where('key', $key)->firstOrFail();
        
        // Don't allow deletion of default settings, just reset to default
        if (isset(SiteSetting::DEFAULTS[$key])) {
            $setting->update(['value' => SiteSetting::DEFAULTS[$key]['value']]);
            return response()->json([
                'message' => 'Setting reset to default'
            ]);
        }
        
        $setting->delete();
        return response()->json([
            'message' => 'Setting deleted successfully'
        ]);
    }

    public function getGroups(): JsonResponse
    {
        return response()->json([
            'groups' => SiteSetting::GROUPS,
            'defaults' => SiteSetting::DEFAULTS,
        ]);
    }

    public function initializeDefaults(): JsonResponse
    {
        SiteSetting::initializeDefaults();
        
        return response()->json([
            'message' => 'Default settings initialized successfully'
        ]);
    }
}
