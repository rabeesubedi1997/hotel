<?php

namespace App\Console\Commands;

use App\Models\Activity;
use App\Models\Hotel;
use App\Models\MenuCategory;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\RestaurantTable;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

/**
 * One-shot demo data for QA'ing Restaurant POS end to end (Menu, Kitchen,
 * Tables, Reports) on a real hotel AND a real activity — the two owner
 * types the feature now supports. Re-runnable: categories/items/tables are
 * upserted by name/sku/table_number, orders are only seeded once per owner
 * (skipped on rerun) so report numbers don't inflate every time this runs.
 */
class SeedRestaurantPosDemo extends Command
{
    protected $signature = 'restaurant-pos:seed-demo {--hotel=} {--activity=}';

    protected $description = 'Seed one hotel and one activity with a full demo Restaurant POS menu (categories, items with images, tables, and sample orders) for QA';

    public function handle(): int
    {
        $hotel = $this->option('hotel')
            ? Hotel::find($this->option('hotel'))
            : Hotel::where('approval_status', Hotel::APPROVAL_STATUS_APPROVED)->orderBy('id')->first();

        $activity = $this->option('activity')
            ? Activity::find($this->option('activity'))
            : Activity::where('approval_status', Activity::APPROVAL_STATUS_APPROVED)->orderBy('id')->first();

        if (!$hotel) {
            $this->error('No hotel found (pass --hotel=ID or approve one first).');
            return self::FAILURE;
        }
        if (!$activity) {
            $this->error('No activity found (pass --activity=ID or approve one first).');
            return self::FAILURE;
        }

        $this->info("Seeding hotel #{$hotel->id} \"{$hotel->name}\"...");
        $this->seedOwner($hotel, $this->hotelPlan());

        $this->info("Seeding activity #{$activity->id} \"{$activity->name}\"...");
        $this->seedOwner($activity, $this->activityPlan());

        $this->newLine();
        $this->info('Done. Restaurant POS is now fully populated for both.');
        $this->line("Hotel POS:    /vendor/hotels/{$hotel->id}/restaurant");
        $this->line("Activity POS: /vendor/activities/{$activity->id}/restaurant");

        return self::SUCCESS;
    }

    private function seedOwner($owner, array $plan): void
    {
        $categoryIds = [];
        foreach ($plan['categories'] as $index => $name) {
            $category = $owner->menuCategories()->updateOrCreate(
                ['name' => $name],
                ['sort_order' => $index]
            );
            $categoryIds[$name] = $category->id;
        }

        $items = [];
        foreach ($plan['items'] as $data) {
            $items[] = $owner->menuItems()->updateOrCreate(
                ['sku' => $data['sku']],
                $data
            );
        }

        $tables = [];
        foreach ($plan['tables'] as $data) {
            $tables[] = $owner->restaurantTables()->updateOrCreate(
                ['table_number' => $data['table_number']],
                $data
            );
        }

        if ($owner->orders()->exists()) {
            $this->line('  Orders already exist for this owner — skipping order seeding.');
            return;
        }

        $this->seedOrders($owner, $items, $tables);
    }

    /** @param MenuItem[] $items @param RestaurantTable[] $tables */
    private function seedOrders($owner, array $items, array $tables): void
    {
        // A spread of orders across the last 14 days in every status, so
        // Reports has real revenue/cancellation numbers and Kitchen has
        // live tickets to work through immediately after seeding.
        $scenarios = [
            ['status' => Order::STATUS_COMPLETED, 'days_ago' => 6, 'table' => 0],
            ['status' => Order::STATUS_COMPLETED, 'days_ago' => 5, 'table' => 1],
            ['status' => Order::STATUS_COMPLETED, 'days_ago' => 3, 'table' => 0],
            ['status' => Order::STATUS_SERVED, 'days_ago' => 2, 'table' => 2],
            ['status' => Order::STATUS_CANCELLED, 'days_ago' => 2, 'table' => 1],
            ['status' => Order::STATUS_READY, 'days_ago' => 0, 'table' => 0],
            ['status' => Order::STATUS_PREPARING, 'days_ago' => 0, 'table' => 2],
            ['status' => Order::STATUS_PENDING, 'days_ago' => 0, 'table' => null],
        ];

        foreach ($scenarios as $scenario) {
            $when = Carbon::now()->subDays($scenario['days_ago'])->subMinutes(rand(5, 240));
            $lineItems = collect($items)->random(min(count($items), rand(2, 3)));
            $table = $scenario['table'] !== null && isset($tables[$scenario['table']]) ? $tables[$scenario['table']] : null;

            $subtotal = 0;
            $lines = [];
            foreach ($lineItems as $item) {
                $qty = rand(1, 2);
                $lineSubtotal = $item->price * $qty;
                $subtotal += $lineSubtotal;
                $lines[] = [
                    'menu_item_id' => $item->id,
                    'quantity' => $qty,
                    'unit_price' => $item->price,
                    'subtotal' => $lineSubtotal,
                    'status' => in_array($scenario['status'], [Order::STATUS_PENDING, Order::STATUS_CONFIRMED])
                        ? OrderItem::STATUS_PENDING
                        : (in_array($scenario['status'], [Order::STATUS_PREPARING]) ? OrderItem::STATUS_PREPARING : OrderItem::STATUS_SERVED),
                ];
            }

            $order = $owner->orders()->create([
                'table_id' => $table?->id,
                'order_type' => $table ? Order::TYPE_DINE_IN : Order::TYPE_TAKEAWAY,
                'channel' => Order::CHANNEL_DIRECT,
                'status' => $scenario['status'],
                'subtotal' => $subtotal,
                'total_amount' => $subtotal,
            ]);

            foreach ($lines as $line) {
                $order->items()->create($line);
            }

            $order->forceFill(['created_at' => $when, 'updated_at' => $when])->saveQuietly();

            if ($table && $scenario['status'] === Order::STATUS_PREPARING) {
                $table->update(['status' => RestaurantTable::STATUS_OCCUPIED]);
            }
        }
    }

    private function hotelPlan(): array
    {
        $img = fn ($id) => "https://images.unsplash.com/{$id}?w=600&auto=format&fit=crop&q=60";

        return [
            'categories' => ['Starters', 'Main Course', 'Woodfire Pizza & Pasta', 'Desserts', 'Beverages'],
            'tables' => [
                ['table_number' => '1', 'capacity' => 2, 'status' => 'available'],
                ['table_number' => '2', 'capacity' => 4, 'status' => 'available'],
                ['table_number' => '3', 'capacity' => 4, 'status' => 'available'],
                ['table_number' => '4', 'capacity' => 6, 'status' => 'available'],
                ['table_number' => '5', 'capacity' => 2, 'status' => 'available'],
                ['table_number' => '6', 'capacity' => 8, 'status' => 'reserved'],
            ],
            'items' => [
                ['sku' => 'DEMO-H01', 'name' => 'Roasted Tomato Soup', 'description' => 'Slow-roasted tomatoes, fresh basil, a swirl of cream.', 'price' => 6.50, 'cost_price' => 1.80, 'category' => 'Starters', 'station' => 'saute', 'allergens' => ['dairy'], 'prep_time_minutes' => 10, 'image' => $img('photo-1547592166-23ac45744acd'), 'is_available' => true],
                ['sku' => 'DEMO-H02', 'name' => 'Garden Fresh Salad', 'description' => 'Mixed greens, cherry tomatoes, cucumber, house vinaigrette.', 'price' => 7.00, 'cost_price' => 2.10, 'category' => 'Starters', 'station' => 'cold', 'allergens' => [], 'prep_time_minutes' => 8, 'image' => $img('photo-1512621776951-a57141f2eefd'), 'is_available' => true],
                ['sku' => 'DEMO-H03', 'name' => 'Chicken Momo (Nepali Dumplings)', 'description' => 'Steamed dumplings, house-made tomato achar.', 'price' => 8.50, 'cost_price' => 2.50, 'category' => 'Starters', 'station' => 'saute', 'allergens' => ['gluten'], 'prep_time_minutes' => 15, 'image' => $img('photo-1610192244261-3f33de3f55e4'), 'is_available' => true, 'stock_quantity' => 24, 'low_stock_threshold' => 5],
                ['sku' => 'DEMO-H04', 'name' => 'Wagyu Style Burger', 'description' => 'Beef patty, aged cheddar, brioche bun, house fries.', 'price' => 15.00, 'cost_price' => 5.20, 'category' => 'Main Course', 'station' => 'grill', 'allergens' => ['gluten', 'dairy'], 'prep_time_minutes' => 18, 'image' => $img('photo-1568901346375-23c9450c58cd'), 'is_available' => true],
                ['sku' => 'DEMO-H05', 'name' => 'Grilled Ribeye Steak', 'description' => '10oz ribeye, chimichurri, roasted vegetables.', 'price' => 26.00, 'cost_price' => 10.40, 'category' => 'Main Course', 'station' => 'grill', 'allergens' => [], 'prep_time_minutes' => 22, 'image' => $img('photo-1544025162-d76694265947'), 'is_available' => true, 'stock_quantity' => 12, 'low_stock_threshold' => 4],
                ['sku' => 'DEMO-H06', 'name' => 'Grilled Salmon', 'description' => 'Pan-seared salmon fillet, lemon butter sauce.', 'price' => 19.50, 'cost_price' => 7.80, 'category' => 'Main Course', 'station' => 'grill', 'allergens' => ['fish'], 'prep_time_minutes' => 16, 'image' => $img('photo-1600891964092-4316c288032e'), 'is_available' => true],
                ['sku' => 'DEMO-H07', 'name' => 'Margherita Pizza', 'description' => 'San Marzano tomato, fresh mozzarella, basil.', 'price' => 13.00, 'cost_price' => 3.50, 'category' => 'Woodfire Pizza & Pasta', 'station' => 'pizza', 'allergens' => ['gluten', 'dairy'], 'prep_time_minutes' => 12, 'image' => $img('photo-1546069901-ba9599a7e63c'), 'is_available' => true],
                ['sku' => 'DEMO-H08', 'name' => 'Creamy Alfredo Pasta', 'description' => 'Fettuccine, parmesan cream sauce, cracked pepper.', 'price' => 12.50, 'cost_price' => 3.20, 'category' => 'Woodfire Pizza & Pasta', 'station' => 'pizza', 'allergens' => ['gluten', 'dairy'], 'prep_time_minutes' => 14, 'image' => $img('photo-1551183053-bf91a1d81141'), 'is_available' => false],
                ['sku' => 'DEMO-H09', 'name' => 'Chocolate Lava Cake', 'description' => 'Warm chocolate cake, molten center, vanilla ice cream.', 'price' => 7.50, 'cost_price' => 1.90, 'category' => 'Desserts', 'station' => 'pastry', 'allergens' => ['gluten', 'dairy', 'egg'], 'prep_time_minutes' => 10, 'image' => $img('photo-1578985545062-69928b1d9587'), 'is_available' => true],
                ['sku' => 'DEMO-H10', 'name' => 'Fresh Fruit Platter', 'description' => 'Seasonal fruit, mint, honey drizzle.', 'price' => 6.00, 'cost_price' => 2.00, 'category' => 'Desserts', 'station' => 'pastry', 'allergens' => [], 'prep_time_minutes' => 6, 'image' => $img('photo-1600335895229-6e75511892c8'), 'is_available' => true],
                ['sku' => 'DEMO-H11', 'name' => 'Fresh Brewed Coffee', 'description' => 'Locally roasted Nepali coffee beans.', 'price' => 3.50, 'cost_price' => 0.80, 'category' => 'Beverages', 'station' => 'bar', 'allergens' => [], 'prep_time_minutes' => 4, 'image' => $img('photo-1495474472287-4d71bcdd2085'), 'is_available' => true],
                ['sku' => 'DEMO-H12', 'name' => 'Iced Lemonade', 'description' => 'Fresh-squeezed lemon, mint, sparkling water.', 'price' => 4.00, 'cost_price' => 0.90, 'category' => 'Beverages', 'station' => 'bar', 'allergens' => [], 'prep_time_minutes' => 3, 'image' => $img('photo-1600271886742-f049cd451bba'), 'is_available' => true],
            ],
        ];
    }

    private function activityPlan(): array
    {
        $img = fn ($id) => "https://images.unsplash.com/{$id}?w=600&auto=format&fit=crop&q=60";

        return [
            'categories' => ['Energy Snacks', 'Drinks', 'Combo Packs'],
            'tables' => [
                ['table_number' => 'Counter 1', 'capacity' => 4, 'status' => 'available'],
                ['table_number' => 'Counter 2', 'capacity' => 4, 'status' => 'available'],
            ],
            'items' => [
                ['sku' => 'DEMO-A01', 'name' => 'Energy Protein Bar', 'description' => 'High-protein bar to refuel after your jump.', 'price' => 3.00, 'cost_price' => 0.90, 'category' => 'Energy Snacks', 'station' => 'cold', 'allergens' => ['nuts'], 'prep_time_minutes' => 1, 'image' => $img('photo-1571091718767-18b5b1457add'), 'is_available' => true, 'stock_quantity' => 40, 'low_stock_threshold' => 10],
                ['sku' => 'DEMO-A02', 'name' => 'Trail Mix Pack', 'description' => 'Nuts, dried fruit, dark chocolate chips.', 'price' => 3.50, 'cost_price' => 1.10, 'category' => 'Energy Snacks', 'station' => 'cold', 'allergens' => ['nuts'], 'prep_time_minutes' => 1, 'image' => $img('photo-1622597467836-f3285f2131b8'), 'is_available' => true],
                ['sku' => 'DEMO-A03', 'name' => 'Fresh Sandwich Wrap', 'description' => 'Grilled chicken, greens, house sauce, tortilla wrap.', 'price' => 6.50, 'cost_price' => 2.20, 'category' => 'Energy Snacks', 'station' => 'saute', 'allergens' => ['gluten'], 'prep_time_minutes' => 8, 'image' => $img('photo-1567620905732-2d1ec7ab7445'), 'is_available' => true],
                ['sku' => 'DEMO-A04', 'name' => 'Hot Ginger Tea', 'description' => 'Warming ginger tea for after your descent.', 'price' => 2.50, 'cost_price' => 0.50, 'category' => 'Drinks', 'station' => 'bar', 'allergens' => [], 'prep_time_minutes' => 4, 'image' => $img('photo-1517686469429-8bdb88b9f907'), 'is_available' => true],
                ['sku' => 'DEMO-A05', 'name' => 'Bottled Sports Drink', 'description' => 'Electrolyte replenishment, chilled.', 'price' => 2.00, 'cost_price' => 0.60, 'category' => 'Drinks', 'station' => 'bar', 'allergens' => [], 'prep_time_minutes' => 1, 'image' => $img('photo-1600271886742-f049cd451bba'), 'is_available' => true],
                ['sku' => 'DEMO-A06', 'name' => 'Adventure Combo Box', 'description' => 'Protein bar + trail mix + sports drink, bundled and discounted.', 'price' => 7.00, 'cost_price' => 2.30, 'category' => 'Combo Packs', 'station' => 'cold', 'allergens' => ['nuts'], 'prep_time_minutes' => 2, 'image' => $img('photo-1622597467836-f3285f2131b8'), 'is_available' => true],
            ],
        ];
    }
}
