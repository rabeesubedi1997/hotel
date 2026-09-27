<?php

namespace Database\Seeders;

use App\Models\Activity;
use App\Models\Hotel;
use App\Models\Itinerary;
use App\Models\ItineraryItem;
use App\Models\TourGuide;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Seeds curated, publicly-bookable itineraries built from real Hotel/
 * Activity/TourGuide rows already in the database, each with a verified
 * (HTTP-checked) cover image. Existing hotels/activities were seeded with
 * no images at all, so this also backfills featured_image for just the
 * specific listings these itineraries reference — otherwise their
 * day-by-day thumbnails would render as blank placeholders.
 *
 * Idempotent: re-running replaces each itinerary's items rather than
 * duplicating them (matched by slug).
 */
class ItinerarySeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', User::ROLE_ADMIN)->first() ?? User::first();

        $this->backfillImages();

        $this->seedItinerary([
            'slug' => 'everest-base-camp-trek-7-days',
            'title' => 'Everest Base Camp Trek — Classic 7-Day Experience',
            'description' => "Trek through the legendary Khumbu region to the foot of the world's highest mountain. This classic route takes you through Sherpa villages, ancient monasteries, and rhododendron forests before the final push to Everest Base Camp (5,364m) and the sunrise viewpoint at Kala Patthar. Includes an experienced local guide, teahouse lodging, and full acclimatization days for safety.",
            'cover_image' => 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1600&q=80',
            'duration_days' => 7,
            'price_from' => 1350.00,
            'max_travelers' => 10,
            'admin' => $admin,
            'items' => [
                [1, 'hotel', 'Kathmandu Heritage Hotel', 'Arrival in Kathmandu. Trek briefing, gear check, and welcome dinner with your guide.'],
                [2, 'activity', 'Everest Base Camp Trek', 'Scenic mountain flight to Lukla (2,860m), then trek to Phakding.'],
                [3, 'hotel', 'Solu-Khumbu Sherpa Lodge', 'Acclimatization day in Namche Bazaar with a short hike for altitude adjustment.'],
                [4, 'activity', 'Everest Base Camp Trek', 'Trek through rhododendron forest to Tengboche and its famous monastery.'],
                [5, 'tour_guide', 'Rajesh Head', 'Guided high-altitude trekking day to Dingboche, with acclimatization checks along the way.'],
                [6, 'activity', 'Everest Base Camp Trek', 'Reach Everest Base Camp (5,364m) and climb Kala Patthar for sunrise views of Everest.'],
                [7, 'hotel', 'Kathmandu Heritage Hotel', 'Fly back to Kathmandu. Farewell dinner and departure.'],
            ],
        ]);

        $this->seedItinerary([
            'slug' => 'pokhara-adventure-lakeside-escape-5-days',
            'title' => 'Pokhara Adventure & Lakeside Escape — 5 Days',
            'description' => "Nepal's adventure capital, at a gentler pace. Paraglide above the Annapurna foothills, ride one of the world's steepest zip lines, take a short taster hike for panoramic mountain views, and unwind on the shores of Phewa Lake beneath the iconic Machapuchare (Fishtail) peak.",
            'cover_image' => 'https://images.unsplash.com/photo-1571401835393-8c5f35328320?w=1600&q=80',
            'duration_days' => 5,
            'price_from' => 520.00,
            'max_travelers' => 12,
            'admin' => $admin,
            'items' => [
                [1, 'hotel', 'Pokhara Lakeside Resort', 'Arrival in Pokhara, sunset boating on Phewa Lake with views of Machapuchare.'],
                [2, 'activity', 'Paragliding Over Phewa Lake', 'Tandem paragliding above the Annapurna range.'],
                [3, 'activity', 'Zip Flying Pokhara', "Ride one of the world's steepest and fastest zip lines."],
                [4, 'activity', 'Annapurna Base Camp Trek', 'Short day hike to Australian Camp for panoramic Annapurna views (day-hike portion only).'],
                [5, 'hotel', 'Pokhara Lakeside Resort', 'Free morning at leisure, departure.'],
            ],
        ]);

        $this->seedItinerary([
            'slug' => 'chitwan-jungle-safari-wildlife-expedition-4-days',
            'title' => 'Chitwan Jungle Safari & Wildlife Expedition — 4 Days',
            'description' => "A wildlife-focused escape to Chitwan National Park's subtropical lowlands. Spot one-horned rhinos and, if you're lucky, Bengal tigers on a guided jeep safari and canoe ride along the Rapti River, with jungle canyoning and a Tharu cultural evening rounding out the trip.",
            'cover_image' => 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1600&q=80',
            'duration_days' => 4,
            'price_from' => 380.00,
            'max_travelers' => 14,
            'admin' => $admin,
            'items' => [
                [1, 'hotel', 'Chitwan Jungle Lodge', 'Arrival, jungle orientation walk, and a Tharu cultural stick dance in the evening.'],
                [2, 'activity', 'Canyoning at Jalbire', 'Full-day canyoning adventure through jungle waterfalls.'],
                [3, 'tour_guide', 'Sarah Mitchell', 'Guided jeep safari and canoe ride along the Rapti River, spotting rhinos and crocodiles.'],
                [4, 'hotel', 'Chitwan Jungle Lodge', 'Morning birdwatching walk, departure.'],
            ],
        ]);

        $this->seedItinerary([
            'slug' => 'annapurna-base-camp-trek-8-days',
            'title' => 'Annapurna Base Camp Trek — 8 Days',
            'description' => 'A classic Himalayan trek through rhododendron forests, terraced villages, and the dramatic Modi Khola gorge, ending at Annapurna Base Camp (4,130m) — an amphitheater of 7,000m+ peaks. Includes a sunrise stop at Poon Hill and a relaxing soak in the natural hot springs at Jhinu Danda on the way back.',
            'cover_image' => 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=1600&q=80',
            'duration_days' => 8,
            'price_from' => 980.00,
            'max_travelers' => 10,
            'admin' => $admin,
            'items' => [
                [1, 'hotel', 'Pokhara Lakeside Resort', 'Arrival in Pokhara, trek briefing and equipment check.'],
                [2, 'activity', 'Annapurna Base Camp Trek', 'Drive to Nayapul, trek to Tikhedhunga.'],
                [3, 'activity', 'Annapurna Base Camp Trek', 'Trek through rhododendron forests to Ghorepani, with sunrise at Poon Hill.'],
                [4, 'hotel', 'Annapurna Base Camp Lodge', 'Trek to Chhomrong village, first close-up views of Annapurna South.'],
                [5, 'activity', 'Annapurna Base Camp Trek', 'Continue through the Modi Khola gorge to Himalaya Lodge.'],
                [6, 'activity', 'Annapurna Base Camp Trek', 'Reach Annapurna Base Camp (4,130m), ringed by an amphitheater of peaks.'],
                [7, 'hotel', 'Annapurna Base Camp Lodge', 'Descend to Jhinu Danda, relax in the natural hot springs.'],
                [8, 'hotel', 'Pokhara Lakeside Resort', 'Return to Pokhara, farewell dinner.'],
            ],
        ]);

        $this->seedItinerary([
            'slug' => 'nepal-grand-explorer-10-days',
            'title' => 'Nepal Grand Explorer — Kathmandu, Pokhara & Chitwan — 10 Days',
            'description' => "The best of Nepal in one trip: Kathmandu Valley's UNESCO heritage squares, Pokhara's adventure sports on the shores of Phewa Lake, and a wildlife safari through Chitwan's jungle lowlands. Ideal for first-time visitors who want culture, adrenaline, and wildlife without committing to a multi-week trek.",
            'cover_image' => 'https://images.unsplash.com/photo-1598091383021-15ddea10925d?w=1600&q=80',
            'duration_days' => 10,
            'price_from' => 1450.00,
            'max_travelers' => 8,
            'admin' => $admin,
            'items' => [
                [1, 'hotel', 'Kathmandu Heritage Hotel', 'Arrival, welcome dinner, Kathmandu Durbar Square walking tour.'],
                [2, 'hotel', 'Bhaktapur Durbar Square Inn', 'Full-day heritage tour of Bhaktapur and Patan Durbar Squares.'],
                [3, 'activity', 'Rock Climbing at Nagarjun', 'Optional rock climbing and forest hike at Nagarjun.'],
                [4, 'hotel', 'Pokhara Lakeside Resort', 'Drive to Pokhara, evening at Phewa Lake.'],
                [5, 'activity', 'Paragliding Over Phewa Lake', 'Tandem paragliding over the Annapurna foothills.'],
                [6, 'activity', 'Zip Flying Pokhara', 'Adrenaline zip-line ride above the Seti River gorge.'],
                [7, 'hotel', 'Chitwan Jungle Lodge', 'Drive to Chitwan, evening Tharu cultural program.'],
                [8, 'tour_guide', 'Sarah Mitchell', 'Guided jungle jeep safari and canoe ride on the Rapti River.'],
                [9, 'activity', 'Canyoning at Jalbire', 'Canyoning adventure through jungle waterfalls.'],
                [10, 'hotel', 'Kathmandu Heritage Hotel', 'Return to Kathmandu, farewell dinner and departure.'],
            ],
        ]);
    }

    private function backfillImages(): void
    {
        $hotelImages = [
            'Pokhara Lakeside Resort' => 'https://images.unsplash.com/photo-1571401835393-8c5f35328320?w=1200&q=80',
            'Kathmandu Heritage Hotel' => 'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=1200&q=80',
            'Chitwan Jungle Lodge' => 'https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1200&q=80',
            'Annapurna Base Camp Lodge' => 'https://images.unsplash.com/photo-1533130061792-64b345e4a833?w=1200&q=80',
            'Bhaktapur Durbar Square Inn' => 'https://images.unsplash.com/photo-1585409677983-0f6c41ca9c3b?w=1200&q=80',
            'Solu-Khumbu Sherpa Lodge' => 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&q=80',
        ];

        foreach ($hotelImages as $name => $url) {
            Hotel::where('name', $name)->update(['featured_image' => $url]);
        }

        $activityImages = [
            'Everest Base Camp Trek' => 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1200&q=80',
            'Annapurna Base Camp Trek' => 'https://images.unsplash.com/photo-1526772662000-3f88f10405ff?w=1200&q=80',
            'Paragliding Over Phewa Lake' => 'https://images.unsplash.com/photo-1571401835393-8c5f35328320?w=1200&q=80',
            'Zip Flying Pokhara' => 'https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=1200&q=80',
            'Canyoning at Jalbire' => 'https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?w=1200&q=80',
            'Rock Climbing at Nagarjun' => 'https://images.unsplash.com/photo-1522163182402-834f871fd851?w=1200&q=80',
        ];

        foreach ($activityImages as $name => $url) {
            Activity::where('name', $name)->update(['featured_image' => $url]);
        }
    }

    private function seedItinerary(array $data): void
    {
        $itinerary = Itinerary::updateOrCreate(
            ['slug' => $data['slug']],
            [
                'title' => $data['title'],
                'description' => $data['description'],
                'cover_image' => $data['cover_image'],
                'type' => Itinerary::TYPE_CURATED,
                'user_id' => $data['admin']?->id,
                'is_public' => true,
                'status' => Itinerary::STATUS_PUBLISHED,
                'duration_days' => $data['duration_days'],
                'price_from' => $data['price_from'],
                'max_travelers' => $data['max_travelers'],
                'approval_status' => Itinerary::APPROVAL_STATUS_APPROVED,
                'approved_by' => $data['admin']?->id,
                'approved_at' => now(),
            ]
        );

        // Re-seeding replaces the day-by-day plan rather than appending to it.
        $itinerary->items()->delete();

        $sortOrders = [];
        foreach ($data['items'] as [$day, $type, $name, $notes]) {
            $bookableClass = ItineraryItem::classForType($type);
            $bookable = $bookableClass::where('name', $name)->first();

            if (!$bookable) {
                continue;
            }

            $sortOrders[$day] = ($sortOrders[$day] ?? -1) + 1;

            ItineraryItem::create([
                'itinerary_id' => $itinerary->id,
                'bookable_type' => $bookableClass,
                'bookable_id' => $bookable->id,
                'day_number' => $day,
                'sort_order' => $sortOrders[$day],
                'notes' => $notes,
            ]);
        }
    }
}
