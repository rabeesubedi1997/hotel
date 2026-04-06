<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AboutPage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AboutPageController extends Controller
{
    public function index(): JsonResponse
    {
        $aboutPage = AboutPage::first();
        
        if (!$aboutPage) {
            $aboutPage = AboutPage::create([
                'hero_title' => 'About Our Company',
                'hero_subtitle' => 'We are dedicated to providing exceptional travel experiences and luxury accommodations in Nepal.',
                'company_name' => 'ReserveNow',
                'company_description' => 'ReserveNow is Nepal\'s premier platform for booking luxury hotels and adventure activities. We connect travelers with the best accommodations and experiences across Nepal.',
                'mission_title' => 'Our Mission',
                'mission_description' => 'To provide seamless, memorable travel experiences by connecting visitors with Nepal\'s finest hotels and adventure activities while supporting local businesses.',
                'vision_title' => 'Our Vision',
                'vision_description' => 'To become Nepal\'s most trusted travel platform, known for exceptional service, authentic experiences, and sustainable tourism practices.',
                'story_title' => 'Our Story',
                'story_content' => 'Founded with a passion for showcasing Nepal\'s beauty, ReserveNow began as a small initiative to help travelers find authentic accommodations. Today, we partner with hundreds of hotels and activity providers across the country.',
                'features' => [
                    ['icon' => 'Shield', 'title' => 'Trusted Partners', 'description' => 'We carefully vet all our hotel and activity partners.'],
                    ['icon' => 'Headphones', 'title' => '24/7 Support', 'description' => 'Our team is available round the clock to assist you.'],
                    ['icon' => 'Tag', 'title' => 'Best Price Guarantee', 'description' => 'We ensure you get the best rates available.'],
                    ['icon' => 'Star', 'title' => 'Quality Assured', 'description' => 'All properties meet our high quality standards.'],
                ],
                'stats' => [
                    ['number' => '500+', 'label' => 'Hotels & Resorts'],
                    ['number' => '200+', 'label' => 'Activities'],
                    ['number' => '50K+', 'label' => 'Happy Travelers'],
                    ['number' => '4.9', 'label' => 'Average Rating'],
                ],
                'team_members' => [
                    ['name' => 'John Doe', 'role' => 'Founder & CEO', 'image' => null],
                    ['name' => 'Jane Smith', 'role' => 'Operations Manager', 'image' => null],
                    ['name' => 'Mike Johnson', 'role' => 'Customer Relations', 'image' => null],
                ],
                'contact_cta_title' => 'Have Questions?',
                'contact_cta_description' => 'We\'d love to hear from you. Send us a message and we\'ll respond as soon as possible.',
            ]);
        }
        
        return response()->json($aboutPage);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'hero_title' => 'required|string|max:255',
            'hero_subtitle' => 'nullable|string',
            'hero_image' => 'nullable|string',
            'company_name' => 'required|string|max:255',
            'company_description' => 'nullable|string',
            'mission_title' => 'nullable|string|max:255',
            'mission_description' => 'nullable|string',
            'vision_title' => 'nullable|string|max:255',
            'vision_description' => 'nullable|string',
            'story_title' => 'nullable|string|max:255',
            'story_content' => 'nullable|string',
            'features' => 'nullable|array',
            'stats' => 'nullable|array',
            'team_members' => 'nullable|array',
            'contact_cta_title' => 'nullable|string|max:255',
            'contact_cta_description' => 'nullable|string',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
            'is_published' => 'boolean',
        ]);

        $aboutPage = AboutPage::first();
        
        if ($aboutPage) {
            $aboutPage->update($validated);
        } else {
            $aboutPage = AboutPage::create($validated);
        }

        return response()->json([
            'message' => 'About page updated successfully',
            'data' => $aboutPage
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        return $this->store($request);
    }

    public function uploadImage(Request $request): JsonResponse
    {
        $request->validate([
            'image' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        if ($request->hasFile('image')) {
            $file = $request->file('image');
            $filename = time() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs('uploads/about', $filename, 'public');
            $url = asset('storage/' . $path);

            return response()->json([
                'message' => 'Image uploaded successfully',
                'url' => $url,
            ]);
        }

        return response()->json(['message' => 'No image provided'], 400);
    }
}
