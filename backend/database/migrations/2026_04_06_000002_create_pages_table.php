<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique(); // home, about, contact, etc.
            $table->string('title');
            $table->string('meta_description')->nullable();
            $table->json('sections'); // Store all page sections as JSON
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Insert default home page
        DB::table('pages')->insert([
            'slug' => 'home',
            'title' => 'Home',
            'meta_description' => 'Discover luxury hotels and thrilling adventures in Nepal. Book your perfect stay or exciting activities today.',
            'sections' => json_encode([
                'hero' => [
                    'title' => 'Discover Nepal',
                    'subtitle' => 'Luxury hotels and thrilling adventures await',
                    'button_text' => 'Browse Hotels',
                    'button_link' => '/hotels',
                    'secondary_button_text' => 'Explore Activities',
                    'secondary_button_link' => '/activities',
                    'background_image' => null,
                ],
                'trust_badges' => [
                    [
                        'icon' => 'shield',
                        'title' => 'Secure Booking',
                        'subtitle' => '100% secure payment',
                    ],
                    [
                        'icon' => 'clock',
                        'title' => '24/7 Support',
                        'subtitle' => 'Always here to help',
                    ],
                    [
                        'icon' => 'star',
                        'title' => 'Best Price Guarantee',
                        'subtitle' => 'Lowest rates guaranteed',
                    ],
                ],
                'hotels_section' => [
                    'subtitle' => 'Premium Stays',
                    'title' => 'Featured Hotels',
                    'description' => 'Experience luxury and comfort at Nepal\'s finest hotels',
                    'button_text' => 'View All Hotels',
                    'button_link' => '/hotels',
                ],
                'adventure_banner' => [
                    'title' => 'Ready for Adventure?',
                    'description' => 'From bungee jumping to paragliding, experience the thrill of Nepal\'s most exciting activities',
                    'button_text' => 'Explore Activities',
                    'button_link' => '/activities',
                    'background_image' => null,
                ],
                'activities_section' => [
                    'subtitle' => 'Thrilling Experiences',
                    'title' => 'Featured Adventures',
                    'description' => 'Push your limits with our curated selection of activities',
                    'button_text' => 'View All Activities',
                    'button_link' => '/activities',
                ],
                'newsletter' => [
                    'title' => 'Get Exclusive Deals',
                    'description' => 'Subscribe to receive special offers on hotels and activities',
                    'button_text' => 'Subscribe',
                    'placeholder' => 'Enter your email',
                ],
            ]),
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('pages');
    }
};
