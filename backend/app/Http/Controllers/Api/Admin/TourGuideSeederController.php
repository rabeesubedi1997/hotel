<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\TourGuide;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TourGuideSeederController extends Controller
{
    public function seedDefaultGuides(): JsonResponse
    {
        $defaultGuides = [
            [
                'name' => 'John Anderson',
                'role' => 'Senior Tour Guide',
                'bio' => 'With over 15 years of experience guiding tourists through the most breathtaking destinations, John brings unparalleled expertise and passion to every tour. Specializing in historical and cultural tours, he has led more than 500 successful trips across the region.',
                'trips_completed' => 528,
                'rating' => 4.9,
                'total_reviews' => 312,
                'is_available_for_hire' => true,
                'hire_price_per_day' => 120,
                'languages' => ['English', 'Spanish', 'French'],
                'specialties' => ['Historical Tours', 'Cultural Tours', 'Adventure'],
                'certifications' => ['Licensed Tour Guide', 'First Aid Certified', 'Mountain Trekking Expert'],
                'phone' => '+1 555-0101',
                'email' => 'john.anderson@example.com',
                'is_active' => true,
                'display_order' => 1,
            ],
            [
                'name' => 'Sarah Mitchell',
                'role' => 'Adventure Specialist',
                'bio' => 'Sarah is an adventure enthusiast with a deep love for nature. Having completed over 350 trips, she specializes in hiking, wildlife tours, and eco-friendly adventures. Her knowledge of local flora and fauna is unmatched.',
                'trips_completed' => 347,
                'rating' => 4.8,
                'total_reviews' => 256,
                'is_available_for_hire' => true,
                'hire_price_per_day' => 110,
                'languages' => ['English', 'German'],
                'specialties' => ['Adventure', 'Wildlife Tours', 'Hiking'],
                'certifications' => ['Wildlife Expert', 'Eco-Tourism Certified', 'CPR Certified'],
                'phone' => '+1 555-0102',
                'email' => 'sarah.mitchell@example.com',
                'is_active' => true,
                'display_order' => 2,
            ],
            [
                'name' => 'Michael Chen',
                'role' => 'Cultural Expert',
                'bio' => 'Michael brings the rich cultural heritage of the region to life through his engaging storytelling and deep historical knowledge. With 420+ trips completed, he is a favorite among travelers seeking authentic cultural experiences.',
                'trips_completed' => 421,
                'rating' => 5.0,
                'total_reviews' => 289,
                'is_available_for_hire' => true,
                'hire_price_per_day' => 130,
                'languages' => ['English', 'Mandarin', 'Japanese'],
                'specialties' => ['Cultural Tours', 'Historical Tours', 'Food Tours'],
                'certifications' => ['Cultural Heritage Expert', 'Food Safety Certified', 'Professional Storyteller'],
                'phone' => '+1 555-0103',
                'email' => 'michael.chen@example.com',
                'is_active' => true,
                'display_order' => 3,
            ],
            [
                'name' => 'Emma Rodriguez',
                'role' => 'Family Tour Specialist',
                'bio' => 'Emma excels at creating memorable experiences for families and groups of all ages. Her patient and friendly approach has made her one of our most requested guides, with 290+ family trips completed successfully.',
                'trips_completed' => 294,
                'rating' => 4.9,
                'total_reviews' => 198,
                'is_available_for_hire' => true,
                'hire_price_per_day' => 100,
                'languages' => ['English', 'Spanish', 'Portuguese'],
                'specialties' => ['Family Tours', 'Educational Tours', 'Cultural Tours'],
                'certifications' => ['Child Safety Certified', 'Educational Tourism Expert', 'First Aid Certified'],
                'phone' => '+1 555-0104',
                'email' => 'emma.rodriguez@example.com',
                'is_active' => true,
                'display_order' => 4,
            ],
            [
                'name' => 'David Thompson',
                'role' => 'Photography Guide',
                'bio' => 'David combines his passion for photography with expert guiding skills. He knows all the best spots for capturing stunning memories and has helped countless travelers improve their photography skills during tours.',
                'trips_completed' => 183,
                'rating' => 4.7,
                'total_reviews' => 142,
                'is_available_for_hire' => true,
                'hire_price_per_day' => 95,
                'languages' => ['English'],
                'specialties' => ['Photography Tours', 'Sunrise/Sunset Tours', 'Nature Tours'],
                'certifications' => ['Professional Photographer', 'Landscape Expert', 'Drone Pilot License'],
                'phone' => '+1 555-0105',
                'email' => 'david.thompson@example.com',
                'is_active' => true,
                'display_order' => 5,
            ],
            [
                'name' => 'Lisa Park',
                'role' => 'Luxury Experience Curator',
                'bio' => 'Lisa specializes in creating premium, bespoke experiences for discerning travelers. From exclusive wine tastings to private historical tours, she ensures every detail is perfect for an unforgettable luxury journey.',
                'trips_completed' => 156,
                'rating' => 5.0,
                'total_reviews' => 98,
                'is_available_for_hire' => true,
                'hire_price_per_day' => 200,
                'languages' => ['English', 'Korean', 'French'],
                'specialties' => ['Luxury Tours', 'Wine Tours', 'VIP Experiences'],
                'certifications' => ['Sommelier Level 2', 'Luxury Hospitality Certified', 'VIP Protocol Training'],
                'phone' => '+1 555-0106',
                'email' => 'lisa.park@example.com',
                'is_active' => true,
                'display_order' => 6,
            ],
        ];

        $created = 0;
        foreach ($defaultGuides as $guideData) {
            TourGuide::firstOrCreate(
                ['email' => $guideData['email']],
                $guideData
            );
            $created++;
        }

        return response()->json([
            'message' => 'Default tour guides seeded successfully',
            'count' => $created,
        ]);
    }
}
