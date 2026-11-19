<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductHighlight;
use App\Models\ProductImage;
use App\Models\Store;
use App\Models\StoreHighlight;
use App\Models\StoreImage;
use Illuminate\Database\Seeder;

/**
 * Demo catalog data transcribed from the UI mock dataset
 * (docs/FRONTEND_CONTRACT.md §4) so the rewired frontend looks identical.
 *
 * Idempotent: everything is keyed by natural keys (slug / parent+path /
 * parent+title) and re-running the seeder updates instead of duplicating.
 */
class CatalogSeeder extends Seeder
{
    /** @var array<string, Category> keyed by "{type}:{slug}" */
    private array $categories = [];

    public function run(): void
    {
        $this->seedCategories();
        $this->seedStores();
        $this->seedProducts();
    }

    private function seedCategories(): void
    {
        $topLevel = [
            ['name' => 'Foods & Beverages', 'slug' => 'foods-beverages', 'sort_order' => 1],
            ['name' => 'Electronics', 'slug' => 'electronics', 'sort_order' => 2],
            ['name' => 'Beauty & Personal Care', 'slug' => 'beauty-personal-care', 'sort_order' => 3],
            ['name' => 'Home & Living', 'slug' => 'home-living', 'sort_order' => 4],
            ['name' => 'Health & Wellness', 'slug' => 'health-wellness', 'sort_order' => 5],
            ['name' => 'Toys & Games', 'slug' => 'toys-games', 'sort_order' => 6],
            ['name' => 'Sports & Outdoors', 'slug' => 'sports-outdoors', 'sort_order' => 7],
            ['name' => 'Books & Stationery', 'slug' => 'books-stationery', 'sort_order' => 8],
            ['name' => 'Fashion & Apparel', 'slug' => 'fashion-apparel', 'sort_order' => 9],
            ['name' => 'Computer & Accessories', 'slug' => 'computer-accessories', 'sort_order' => 10],
            ['name' => 'Others', 'slug' => 'others', 'sort_order' => 11],
        ];

        $children = [
            'electronics' => [
                ['name' => 'Audio', 'slug' => 'audio', 'sort_order' => 1],
                ['name' => 'Wearables', 'slug' => 'wearables', 'sort_order' => 2],
            ],
            'fashion-apparel' => [
                ['name' => 'Footwear', 'slug' => 'footwear', 'sort_order' => 1],
                ['name' => "Men's Wear", 'slug' => 'mens-wear', 'sort_order' => 2],
            ],
            'home-living' => [
                ['name' => 'Kitchen', 'slug' => 'kitchen', 'sort_order' => 1],
            ],
        ];

        foreach ([Category::TYPE_PRODUCT, Category::TYPE_STORE] as $type) {
            foreach ($topLevel as $row) {
                $parent = Category::query()->updateOrCreate(
                    ['type' => $type, 'slug' => $row['slug']],
                    ['name' => $row['name'], 'parent_id' => null, 'sort_order' => $row['sort_order']],
                );

                $this->categories[$type.':'.$row['slug']] = $parent;

                if ($type !== Category::TYPE_PRODUCT) {
                    continue;
                }

                foreach ($children[$row['slug']] ?? [] as $child) {
                    $model = Category::query()->updateOrCreate(
                        ['type' => $type, 'slug' => $child['slug']],
                        [
                            'name' => $child['name'],
                            'parent_id' => $parent->id,
                            'sort_order' => $child['sort_order'],
                        ],
                    );

                    $this->categories[$type.':'.$child['slug']] = $model;
                }
            }
        }
    }

    private function seedStores(): void
    {
        foreach ($this->storeData() as $row) {
            $store = Store::withTrashed()->updateOrCreate(
                ['slug' => $row['slug']],
                [
                    'name' => $row['name'],
                    'category_id' => $this->category(Category::TYPE_STORE, $row['category'])?->id,
                    'description' => $row['description'],
                    'operating_hours' => $row['operating_hours'],
                    'phone' => $row['phone'],
                    'image_path' => $this->unsplash($row['photo']),
                    'is_open' => $row['is_open'],
                    'floor_location' => $row['floor_location'],
                    'deleted_at' => null,
                ],
            );

            $sort = 0;
            foreach ($row['gallery'] as $photo) {
                StoreImage::query()->updateOrCreate(
                    ['store_id' => $store->id, 'path' => $this->unsplash($photo)],
                    ['sort_order' => $sort++],
                );
            }

            $sort = 0;
            foreach ($row['highlights'] ?? [] as $highlight) {
                StoreHighlight::query()->updateOrCreate(
                    ['store_id' => $store->id, 'title' => $highlight['title']],
                    ['body' => $highlight['body'], 'sort_order' => $sort++],
                );
            }
        }
    }

    private function seedProducts(): void
    {
        foreach ($this->productData() as $row) {
            $store = Store::query()->where('slug', $row['store'])->first();

            $product = Product::withTrashed()->updateOrCreate(
                ['slug' => $row['slug']],
                [
                    'store_id' => $store?->id,
                    'category_id' => $this->category(Category::TYPE_PRODUCT, $row['category'])?->id,
                    'name' => $row['name'],
                    'sku' => $row['sku'],
                    'description' => $row['description'],
                    'price' => $row['price'],
                    'original_price' => $row['original_price'] ?? null,
                    'stock' => $row['stock'],
                    'is_new' => $row['is_new'] ?? false,
                    'is_active' => $row['is_active'] ?? true,
                    'deleted_at' => null,
                ],
            );

            $sort = 0;
            foreach ($row['photos'] as $photo) {
                ProductImage::query()->updateOrCreate(
                    ['product_id' => $product->id, 'path' => $this->unsplash($photo)],
                    ['sort_order' => $sort++],
                );
            }

            $sort = 0;
            foreach ($row['highlights'] ?? [] as $highlight) {
                ProductHighlight::query()->updateOrCreate(
                    ['product_id' => $product->id, 'title' => $highlight['title']],
                    ['body' => $highlight['body'], 'sort_order' => $sort++],
                );
            }
        }
    }

    private function category(string $type, string $slug): ?Category
    {
        return $this->categories[$type.':'.$slug] ?? null;
    }

    private function unsplash(string $photoId, int $width = 600): string
    {
        return "https://images.unsplash.com/{$photoId}?w={$width}&auto=format&fit=crop&q=80";
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function storeData(): array
    {
        return [
            [
                'name' => "McDonald's",
                'slug' => 'mcdonalds',
                'category' => 'foods-beverages',
                'phone' => '0953967329',
                'is_open' => true,
                'operating_hours' => '6:00AM - 11:00PM',
                'floor_location' => 'Ground Floor, Unit G-01',
                'description' => "Welcome to McDonald's Cordova branch! Enjoy your favorite world-famous burgers, crispy fries, chicken McDo, and refreshing drinks right inside the mall. Fast service, comfortable dine-in area, and quick mall pick-up options available.",
                'photo' => 'photo-1552566626-52f8b828add9',
                'gallery' => [
                    'photo-1555396273-367ea4eb4db5',
                    'photo-1543007630-9710e4a00a20',
                    'photo-1517248135467-4c7edcad34c4',
                    'photo-1466978913421-dad2ebd01d17',
                ],
                'highlights' => [
                    ['title' => 'Dine-In & Takeout', 'body' => 'Spacious seating area with air conditioning, perfect for families, students, and groups looking for a quick meal.'],
                    ['title' => 'Mall Pick-Up Ready', 'body' => 'Skip the long queues by ordering online through Online Mall Cordova and picking up your freshly prepared orders directly at our counter.'],
                    ['title' => 'Operating Schedule', 'body' => 'Open daily from 6:00 AM to 11:00 PM to serve your breakfast, lunch, dinner, and late-night cravings.'],
                    ['title' => 'Quality Service', 'body' => 'Dedicated crew members ensuring fast, clean, and friendly customer service at all times.'],
                ],
            ],
            [
                'name' => 'Mang Inasal',
                'slug' => 'mang-inasal',
                'category' => 'foods-beverages',
                'phone' => '0953967329',
                'is_open' => false,
                'operating_hours' => '6:00AM - 11:00PM',
                'floor_location' => 'Ground Floor, Unit G-02',
                'description' => 'Home of the famous unlimited rice and grilled chicken inasal. Enjoy smoky, flavorful Filipino favorites with family and friends inside the mall.',
                'photo' => 'photo-1555396273-367ea4eb4db5',
                'gallery' => [
                    'photo-1552566626-52f8b828add9',
                    'photo-1466978913421-dad2ebd01d17',
                ],
                'highlights' => [
                    ['title' => 'Unlimited Rice', 'body' => 'Every chicken inasal meal comes with unlimited rice so you never leave hungry.'],
                    ['title' => 'Mall Pick-Up Ready', 'body' => 'Order online and claim your freshly grilled meals at the counter.'],
                ],
            ],
            [
                'name' => 'Jollibee',
                'slug' => 'jollibee',
                'category' => 'foods-beverages',
                'phone' => '0953967334',
                'is_open' => true,
                'operating_hours' => '6:00AM - 11:00PM',
                'floor_location' => 'Ground Floor, Unit G-03',
                'description' => 'Filipino fast-food favorite serving Chickenjoy, Jolly Spaghetti, and sweet-style burgers for dine-in or mall pick-up.',
                'photo' => 'photo-1552566626-52f8b828add9',
                'gallery' => [
                    'photo-1555396273-367ea4eb4db5',
                    'photo-1517248135467-4c7edcad34c4',
                ],
                'highlights' => [],
            ],
            [
                'name' => 'Shein',
                'slug' => 'shein',
                'category' => 'fashion-apparel',
                'phone' => '0953967335',
                'is_open' => true,
                'operating_hours' => '10:00AM - 9:00PM',
                'floor_location' => 'Second Floor, Unit S-12',
                'description' => 'Trendy fashion, footwear, and accessories at affordable prices. Find the latest styles for every occasion.',
                'photo' => 'photo-1441986300917-64674bd600d8',
                'gallery' => [
                    'photo-1489987707025-afc232f7ea0f',
                    'photo-1445205170230-053b83016050',
                ],
                'highlights' => [
                    ['title' => 'New Arrivals Weekly', 'body' => 'Fresh styles land every week so there is always something new to discover.'],
                    ['title' => 'Affordable Fashion', 'body' => 'On-trend clothing and accessories priced for everyday shopping.'],
                ],
            ],
            [
                'name' => 'Hair Salon',
                'slug' => 'hair-salon',
                'category' => 'beauty-personal-care',
                'phone' => '0953967329',
                'is_open' => true,
                'operating_hours' => '6:00AM - 11:00PM',
                'floor_location' => 'Second Floor, Unit S-05',
                'description' => 'Professional hair care services from cuts and color to treatments and styling. Walk in or book ahead for a relaxing salon visit.',
                'photo' => 'photo-1560066984-138dadb4c035',
                'gallery' => [
                    'photo-1522337360788-8b13dee7a37e',
                    'photo-1516975080664-ed2fc6a32937',
                ],
                'highlights' => [
                    ['title' => 'Certified Stylists', 'body' => 'Experienced stylists trained in the latest cutting and coloring techniques.'],
                    ['title' => 'Premium Products', 'body' => 'Only salon-grade hair care products are used for every treatment.'],
                ],
            ],
            [
                'name' => 'Cebuana',
                'slug' => 'cebuana',
                'category' => 'others',
                'phone' => '0953967336',
                'is_open' => true,
                'operating_hours' => '8:00AM - 6:00PM',
                'floor_location' => 'Ground Floor, Unit G-15',
                'description' => 'Pawnshop, remittance, and micro-financial services conveniently located inside the mall.',
                'photo' => 'photo-1486406146926-c627a92ad1ab',
                'gallery' => [
                    'photo-1441986300917-64674bd600d8',
                ],
                'highlights' => [],
            ],
            [
                'name' => "Watson's Pharmacy",
                'slug' => 'watsons-pharmacy',
                'category' => 'health-wellness',
                'phone' => '0953967330',
                'is_open' => true,
                'operating_hours' => '8:00AM - 9:00PM',
                'floor_location' => 'Ground Floor, Unit G-20',
                'description' => 'Your health and wellness partner for medicines, vitamins, personal care, and daily essentials.',
                'photo' => 'photo-1576602976047-174e57a47881',
                'gallery' => [
                    'photo-1584308666744-24d5c474f2ae',
                ],
                'highlights' => [],
            ],
            [
                'name' => 'Supermarket',
                'slug' => 'supermarket',
                'category' => 'foods-beverages',
                'phone' => '0953967331',
                'is_open' => true,
                'operating_hours' => '6:00AM - 10:00PM',
                'floor_location' => 'Ground Floor, Unit G-30',
                'description' => 'Complete grocery shopping under one roof: fresh produce, pantry staples, snacks, and household essentials.',
                'photo' => 'photo-1578916171728-46686eac8d58',
                'gallery' => [
                    'photo-1586201375761-83865001e31c',
                    'photo-1579871494447-9811cf80d66c',
                ],
                'highlights' => [],
            ],
            [
                'name' => 'Department Store',
                'slug' => 'department-store',
                'category' => 'home-living',
                'phone' => '0953967332',
                'is_open' => true,
                'operating_hours' => '9:00AM - 9:00PM',
                'floor_location' => 'First Floor, Unit F-01',
                'description' => 'Home and lifestyle finds: appliances, kitchenware, electronics, bags, and everyday essentials for the whole family.',
                'photo' => 'photo-1441986300917-64674bd600d8',
                'gallery' => [
                    'photo-1523275335684-37898b6baf30',
                    'photo-1553062407-98eeb64c6a62',
                ],
                'highlights' => [],
            ],
            [
                'name' => 'Coffee Shop',
                'slug' => 'coffee-shop',
                'category' => 'foods-beverages',
                'phone' => '0953967333',
                'is_open' => true,
                'operating_hours' => '7:00AM - 11:00PM',
                'floor_location' => 'Ground Floor, Unit G-08',
                'description' => 'Cozy coffee corner for handcrafted coffee, pastries, and light meals while you shop.',
                'photo' => 'photo-1501339847302-ac426a4a7cbb',
                'gallery' => [
                    'photo-1495474472287-4d71bcdd2085',
                ],
                'highlights' => [],
            ],
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function productData(): array
    {
        return [
            [
                'name' => 'Wireless Earbuds',
                'slug' => 'wireless-earbuds',
                'category' => 'audio',
                'store' => 'department-store',
                'sku' => 'SKU-EAR-001',
                'price' => 1299,
                'original_price' => 1999,
                'stock' => 25,
                'is_new' => true,
                'description' => 'Experience high-quality sound with these wireless earbuds. Designed for comfort, long battery life, and seamless connectivity. Perfect for music, calls, and everyday use.',
                'photos' => [
                    'photo-1590658268037-6bf12165a8df',
                    'photo-1572536147248-ac59a8abfa4b',
                    'photo-1600294037681-c80b4cb5b434',
                ],
                'highlights' => [
                    ['title' => 'Premium Sound Quality', 'body' => 'Enjoy rich, clear audio with deep bass and crisp highs. Perfect for music, podcasts, and calls.'],
                    ['title' => 'Long Battery Life', 'body' => 'Get up to 24 hours of total playtime with the charging case. Spend less time charging and more time listening.'],
                    ['title' => 'Comfortable Fit', 'body' => 'Lightweight and ergonomic design for all-day comfort. Comes with multiple ear tip sizes for the perfect fit.'],
                    ['title' => 'Seamless Connectivity', 'body' => 'Bluetooth 5.3 ensures a faster, more stable connection with your devices.'],
                ],
            ],
            [
                'name' => 'Sports Shoes',
                'slug' => 'sports-shoes',
                'category' => 'footwear',
                'store' => 'shein',
                'sku' => 'SKU-SHOE-002',
                'price' => 1899,
                'stock' => 0,
                'is_new' => true,
                'description' => 'Durable and comfortable sports shoes for running and training.',
                'photos' => ['photo-1542291026-7eec264c27ff'],
                'highlights' => [
                    ['title' => 'Breathable Upper', 'body' => 'Lightweight mesh upper keeps feet cool through long training sessions.'],
                    ['title' => 'Cushioned Sole', 'body' => 'Responsive foam midsole absorbs impact on every stride.'],
                ],
            ],
            [
                'name' => 'Laptop Backpack',
                'slug' => 'laptop-backpack',
                'category' => 'computer-accessories',
                'store' => 'department-store',
                'sku' => 'SKU-BAG-003',
                'price' => 999,
                'stock' => 0,
                'description' => 'Water-resistant laptop backpack with USB charging port.',
                'photos' => ['photo-1553062407-98eeb64c6a62'],
                'highlights' => [],
            ],
            [
                'name' => 'Skincare Set',
                'slug' => 'skincare-set',
                'category' => 'beauty-personal-care',
                'store' => 'watsons-pharmacy',
                'sku' => 'SKU-SKIN-004',
                'price' => 1499,
                'stock' => 12,
                'description' => 'Organic daily skincare set for glowing and healthy skin.',
                'photos' => ['photo-1556228720-195a672e8a03'],
                'highlights' => [
                    ['title' => 'Complete Daily Routine', 'body' => 'Cleanser, toner, serum, and moisturizer in one set for morning and night.'],
                    ['title' => 'Gentle Formula', 'body' => 'Dermatologist-tested ingredients suitable for sensitive skin.'],
                ],
            ],
            [
                'name' => 'Instant Noodles',
                'slug' => 'instant-noodles',
                'category' => 'foods-beverages',
                'store' => 'supermarket',
                'sku' => 'SKU-NOODLE-005',
                'price' => 49,
                'stock' => 150,
                'description' => 'Delicious spicy instant noodles pack of 5.',
                'photos' => ['photo-1612929606404-7471ffae7a29'],
                'highlights' => [],
            ],
            [
                'name' => 'Smart Watch',
                'slug' => 'smart-watch',
                'category' => 'wearables',
                'store' => 'department-store',
                'sku' => 'SKU-WATCH-006',
                'price' => 2499,
                'stock' => 0,
                'description' => 'Fitness tracker smartwatch with heart rate monitor.',
                'photos' => ['photo-1523275335684-37898b6baf30'],
                'highlights' => [],
            ],
            [
                'name' => 'Graphic T-Shirt',
                'slug' => 'graphic-tshirt',
                'category' => 'mens-wear',
                'store' => 'shein',
                'sku' => 'SKU-TSHIRT-007',
                'price' => 499,
                'stock' => 40,
                'description' => '100% cotton casual graphic t-shirt.',
                'photos' => ['photo-1521572267360-ee0c2909d518'],
                'highlights' => [],
            ],
            [
                'name' => 'Microwave Oven',
                'slug' => 'microwave-oven',
                'category' => 'kitchen',
                'store' => 'department-store',
                'sku' => 'SKU-MICRO-008',
                'price' => 3499,
                'stock' => 8,
                'description' => 'Compact digital microwave oven with grill function.',
                'photos' => ['photo-1574269909862-7e1d70bb8078'],
                'highlights' => [],
            ],
            [
                'name' => 'Bluetooth Headphones',
                'slug' => 'bluetooth-headphones',
                'category' => 'audio',
                'store' => 'department-store',
                'sku' => 'SKU-HEAD-009',
                'price' => 1799,
                'original_price' => 2299,
                'stock' => 18,
                'description' => 'Wireless over-ear headphones with immersive sound and long battery life.',
                'photos' => ['photo-1505740420928-5e560c06d30e'],
                'highlights' => [
                    ['title' => 'Active Noise Cancellation', 'body' => 'Block out background noise for focused listening anywhere.'],
                    ['title' => 'All-Day Battery', 'body' => 'Up to 40 hours of playback on a single charge.'],
                ],
            ],
            [
                'name' => 'Hair Care Set',
                'slug' => 'hair-care-set',
                'category' => 'beauty-personal-care',
                'store' => 'hair-salon',
                'sku' => 'SKU-HAIR-010',
                'price' => 1099,
                'stock' => 0,
                'description' => 'Complete hair care set with shampoo, conditioner, and treatment.',
                'photos' => ['photo-1535585209827-a15fcdbc4c2d'],
                'highlights' => [],
            ],
            [
                'name' => 'Yoga Mat',
                'slug' => 'yoga-mat',
                'category' => 'sports-outdoors',
                'store' => 'supermarket',
                'sku' => 'SKU-YOGA-011',
                'price' => 599,
                'stock' => 30,
                'description' => 'Non-slip exercise yoga mat with carrying strap.',
                'photos' => ['photo-1601925260368-ae2f83cf8b7f'],
                'highlights' => [
                    ['title' => 'Non-Slip Surface', 'body' => 'Textured grip keeps the mat stable through every pose.'],
                    ['title' => 'Easy to Carry', 'body' => 'Lightweight design with included carrying strap.'],
                ],
            ],
            [
                'name' => 'Stainless Tumbler',
                'slug' => 'stainless-tumbler',
                'category' => 'home-living',
                'store' => 'department-store',
                'sku' => 'SKU-TUMBLER-012',
                'price' => 450,
                'stock' => 50,
                'is_new' => true,
                'description' => 'Insulated stainless steel tumbler that keeps drinks cold for 24 hours.',
                'photos' => ['photo-1602143407151-7111542de6e8'],
                'highlights' => [],
            ],
        ];
    }
}
