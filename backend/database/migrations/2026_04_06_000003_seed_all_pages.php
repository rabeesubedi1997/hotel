<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Pages table already exists, just add more pages
        $pages = [
            [
                'slug' => 'hotels',
                'title' => 'Hotels',
                'meta_description' => 'Find the best hotels in Nepal. Browse luxury 5-star hotels, budget accommodations, and boutique stays in Kathmandu, Pokhara, and more.',
                'sections' => json_encode([
                    'hero' => [
                        'title' => 'Hotels in Nepal',
                        'subtitle' => 'Find your perfect stay from luxury resorts to budget-friendly accommodations',
                        'background_image' => null,
                    ],
                    'filters' => [
                        'search_placeholder' => 'Search hotels...',
                        'city_label' => 'All Cities',
                        'city_all' => 'All Cities',
                        'rating_label' => 'All Ratings',
                        'rating_all' => 'All Ratings',
                        'rating_5' => '5 Star',
                        'rating_4' => '4 Star',
                        'rating_3' => '3 Star',
                        'min_price_label' => 'Min Price',
                        'max_price_label' => 'Max Price',
                        'search_button' => 'Search',
                        'clear_button' => 'Clear Filters',
                    ],
                    'results' => [
                        'showing_text' => 'Showing {count} of {total} hotels',
                        'per_page_label' => 'Rows per page:',
                        'no_results' => 'No hotels found matching your criteria',
                    ],
                    'empty_state' => [
                        'title' => 'No hotels found',
                        'description' => 'Try adjusting your filters or search criteria',
                        'button_text' => 'Clear Filters',
                    ],
                    'hotel_card' => [
                        'per_night' => '/night',
                        'star_rating' => 'Star',
                        'view_details' => 'View Details',
                        'book_now' => 'Book Now',
                    ],
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'activities',
                'title' => 'Activities',
                'meta_description' => 'Discover thrilling adventures in Nepal. From bungee jumping to paragliding, find your next exciting experience.',
                'sections' => json_encode([
                    'hero' => [
                        'title' => 'Adventures in Nepal',
                        'subtitle' => 'Experience the thrill of bungee jumping, paragliding, trekking and more',
                        'background_image' => null,
                    ],
                    'filters' => [
                        'search_placeholder' => 'Search activities...',
                        'type_label' => 'All Types',
                        'type_all' => 'All Types',
                        'difficulty_label' => 'All Difficulties',
                        'difficulty_all' => 'All Difficulties',
                        'difficulty_easy' => 'Easy',
                        'difficulty_moderate' => 'Moderate',
                        'difficulty_challenging' => 'Challenging',
                        'difficulty_extreme' => 'Extreme',
                        'city_label' => 'All Cities',
                        'city_all' => 'All Cities',
                        'min_price_label' => 'Min Price',
                        'max_price_label' => 'Max Price',
                        'search_button' => 'Search',
                        'clear_button' => 'Clear Filters',
                    ],
                    'results' => [
                        'showing_text' => 'Showing {count} of {total} activities',
                        'per_page_label' => 'Rows per page:',
                        'no_results' => 'No activities found matching your criteria',
                    ],
                    'empty_state' => [
                        'title' => 'No activities found',
                        'description' => 'Try adjusting your filters or search criteria',
                        'button_text' => 'Clear Filters',
                    ],
                    'activity_card' => [
                        'per_person' => '/person',
                        'max_participants' => 'Max {count} participants',
                        'view_details' => 'View Details',
                        'book_now' => 'Book Now',
                        'difficulty' => 'Difficulty',
                    ],
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'about',
                'title' => 'About Us',
                'meta_description' => 'Learn about Reserve Now - your trusted partner for booking hotels and adventures in Nepal.',
                'sections' => json_encode([
                    'hero' => [
                        'title' => 'About Reserve Now',
                        'subtitle' => 'Your trusted partner for unforgettable experiences in Nepal',
                        'background_image' => null,
                    ],
                    'company_info' => [
                        'title' => 'Who We Are',
                        'content' => 'Reserve Now is Nepal\'s premier platform for booking hotels and adventure activities. We connect travelers with the best accommodations and experiences across the country.',
                    ],
                    'mission' => [
                        'title' => 'Our Mission',
                        'content' => 'To make travel planning in Nepal seamless and enjoyable, offering curated experiences and trusted accommodations for every type of traveler.',
                    ],
                    'vision' => [
                        'title' => 'Our Vision',
                        'content' => 'To become the go-to platform for all travel needs in Nepal, promoting sustainable tourism and supporting local businesses.',
                    ],
                    'features' => [
                        ['icon' => 'shield', 'title' => 'Secure Booking', 'description' => '100% secure payment with instant confirmation'],
                        ['icon' => 'clock', 'title' => '24/7 Support', 'description' => 'Round the clock customer service'],
                        ['icon' => 'star', 'title' => 'Best Price', 'description' => 'Lowest rates guaranteed'],
                        ['icon' => 'award', 'title' => 'Verified', 'description' => 'All hotels and activities verified'],
                    ],
                    'stats' => [
                        ['label' => 'Hotels', 'value' => '100+'],
                        ['label' => 'Activities', 'value' => '50+'],
                        ['label' => 'Happy Travelers', 'value' => '10,000+'],
                        ['label' => 'Cities', 'value' => '15+'],
                    ],
                    'team_section' => [
                        'title' => 'Meet Our Team',
                        'subtitle' => 'The people behind your amazing experiences',
                    ],
                    'team_members' => [
                        [
                            'name' => 'John Doe',
                            'role' => 'Founder & CEO',
                            'bio' => 'Travel enthusiast with 15 years experience',
                            'image' => '',
                        ],
                        [
                            'name' => 'Jane Smith',
                            'role' => 'Operations Manager',
                            'bio' => 'Expert in hospitality management',
                            'image' => '',
                        ],
                        [
                            'name' => 'Mike Johnson',
                            'role' => 'Head of Marketing',
                            'bio' => 'Digital marketing specialist',
                            'image' => '',
                        ],
                    ],
                    'contact_cta' => [
                        'title' => 'Get in Touch',
                        'description' => 'Have questions? We\'d love to hear from you.',
                        'button_text' => 'Contact Us',
                        'button_link' => '/contact',
                    ],
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'tour-guides',
                'title' => 'Tour Guides',
                'meta_description' => 'Connect with experienced local tour guides in Nepal. Find expert guides for trekking, sightseeing, and cultural tours.',
                'sections' => json_encode([
                    'hero' => [
                        'title' => 'Expert Tour Guides',
                        'subtitle' => 'Connect with experienced local guides for unforgettable journeys',
                        'background_image' => null,
                    ],
                    'filters' => [
                        'specialty_label' => 'All Specialties',
                        'language_label' => 'All Languages',
                        'search_placeholder' => 'Search guides...',
                    ],
                    'results' => [
                        'showing_text' => 'Showing {count} tour guides',
                    ],
                    'guide_card' => [
                        'trips_label' => 'trips completed',
                        'price_label' => 'per day',
                        'languages_label' => 'Languages',
                        'specialties_label' => 'Specialties',
                        'book_button' => 'Book Now',
                        'available_badge' => 'Available',
                        'hire_button' => 'Hire',
                        'contact_for_price' => 'Contact for pricing',
                        'view_profile' => 'View Profile',
                    ],
                    'empty_state' => [
                        'title' => 'No guides found',
                        'description' => 'Try adjusting your filters',
                    ],
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'contact',
                'title' => 'Contact Us',
                'meta_description' => 'Get in touch with Reserve Now. We\'re here to help with your bookings and inquiries.',
                'sections' => json_encode([
                    'hero' => [
                        'title' => 'Contact Us',
                        'subtitle' => 'Have a question or need assistance? We\'re here to help!',
                        'background_image' => null,
                    ],
                    'contact_info' => [
                        'title' => 'Get in Touch',
                        'address' => 'Thamel, Kathmandu, Nepal',
                        'phone' => '+977 1 4XXXXXX',
                        'email' => 'info@reservenow.com',
                        'hours' => 'Sunday - Friday: 9:00 AM - 6:00 PM',
                    ],
                    'form' => [
                        'name_label' => 'Your Name',
                        'email_label' => 'Email Address',
                        'phone_label' => 'Phone Number',
                        'subject_label' => 'Subject',
                        'message_label' => 'Message',
                        'submit_button' => 'Send Message',
                        'success_message' => 'Thank you! We\'ll get back to you soon.',
                    ],
                    'social_links' => [
                        'facebook' => '',
                        'instagram' => '',
                        'twitter' => '',
                        'youtube' => '',
                    ],
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'slug' => 'quote',
                'title' => 'Get a Quote',
                'meta_description' => 'Request a custom travel quote. Let us help you plan your perfect Nepal adventure.',
                'sections' => json_encode([
                    'hero' => [
                        'title' => 'Get a Custom Quote',
                        'subtitle' => 'Let us help you plan your perfect Nepal adventure',
                        'background_image' => null,
                    ],
                    'form' => [
                        'name_label' => 'Full Name',
                        'email_label' => 'Email Address',
                        'phone_label' => 'Phone Number',
                        'travel_date_label' => 'Travel Date',
                        'duration_label' => 'Duration (days)',
                        'travelers_label' => 'Number of Travelers',
                        'budget_label' => 'Budget Range',
                        'preferences_label' => 'Travel Preferences',
                        'preferences_placeholder' => 'Tell us about your preferred activities, destinations, and any special requirements...',
                        'submit_button' => 'Request Quote',
                        'success_message' => 'Thank you! We\'ll send you a customized quote within 24 hours.',
                    ],
                    'why_us' => [
                        'title' => 'Why Choose Us?',
                        'items' => [
                            ['icon' => 'check', 'text' => 'Personalized itineraries tailored to your preferences'],
                            ['icon' => 'check', 'text' => 'Best price guarantee on all bookings'],
                            ['icon' => 'check', 'text' => '24/7 support during your trip'],
                            ['icon' => 'check', 'text' => 'Expert local guides and recommendations'],
                        ],
                    ],
                ]),
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        foreach ($pages as $page) {
            DB::table('pages')->insert($page);
        }
    }

    public function down(): void
    {
        // Remove the additional pages
        DB::table('pages')->whereIn('slug', ['hotels', 'activities', 'about', 'tour-guides', 'contact', 'quote'])->delete();
    }
};
