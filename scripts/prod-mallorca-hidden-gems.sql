-- Run in the PRODUCTION Supabase project
-- Safe to re-run (ON CONFLICT / delete+reinsert places).
-- Second public guide after North Wales: bright Mediterranean + FIBI sky/lilac energy.

-- Archive the incomplete earlier Mallorca draft if present
UPDATE travel_guides
SET status = 'archived', featured = false, updated_at = now()
WHERE slug = 'mallorca-places-worth-saving'
  AND status <> 'archived';

-- ========== Mallorca Hidden Gems ==========
INSERT INTO travel_guides (
  title, slug, excerpt, introduction,
  destination_name, region, country,
  cover_image_url, seo_title, seo_description,
  status, featured, author_name
) VALUES (
  '8 Mallorca Hidden Gems Worth Saving',
  'mallorca-hidden-gems',
  'Beyond Palma and the obvious beach clubs — mountain villages, tiny coves and old fishing ports for your Travel Board.',
  $intro$
Beyond Palma and the obvious beach clubs, Mallorca is full of mountain villages, tiny coves and old fishing ports that deserve their own Travel Board.

The island has far more than beaches: the official tourism board highlights its mountain landscapes, historic villages, secluded corners and small fishing ports as some of Mallorca’s key attractions.
$intro$,
  'Mallorca',
  'Balearic Islands',
  'Spain',
  'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=1600&q=80',
  '8 Mallorca Hidden Gems Worth Saving | FIBI',
  'Mountain villages, tiny coves and old fishing ports in Mallorca worth saving to your FIBI Travel Board.',
  'published',
  true,
  'FIBI'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  excerpt = EXCLUDED.excerpt,
  introduction = EXCLUDED.introduction,
  destination_name = EXCLUDED.destination_name,
  region = EXCLUDED.region,
  country = EXCLUDED.country,
  cover_image_url = EXCLUDED.cover_image_url,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  status = 'published',
  featured = true,
  updated_at = now();

DELETE FROM travel_guide_places
WHERE guide_id = (SELECT id FROM travel_guides WHERE slug = 'mallorca-hidden-gems');

INSERT INTO travel_guide_places (
  guide_id, name, description, section, display_order,
  latitude, longitude, location_city, location_country,
  source_url, source_platform, image_url
)
SELECT g.id, v.name, v.description, v.section, v.display_order,
  v.latitude, v.longitude, v.location_city, v.location_country,
  v.source_url, v.source_platform, v.image_url
FROM travel_guides g
CROSS JOIN (VALUES
  (
    'Cala Tuent',
    $d1$
A quieter alternative to some of Mallorca’s better-known coves, Cala Tuent sits beneath Puig Major surrounded by cliffs and pine forest.

It’s largely undeveloped and has no full beach-service setup, which is a big part of the appeal. The drive down is steep and winding, so this is one to save before you set off rather than randomly discovering at 4pm.

Good for: swimming · road trips · dramatic scenery
FIBI category: Beach / Nature
$d1$,
    'Hidden beaches', 0, 39.8425::float8, 2.7803::float8,
    'Serra de Tramuntana', 'Spain',
    'https://www.illesbalears.travel/en/mallorca/',
    'Web', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80'
  ),
  (
    'Fornalutx',
    $d2$
Stone houses, cobbled streets, orange and lemon trees and mountains rising behind the rooftops.

Fornalutx sits above the Sóller valley and is recognised for its unusually well-preserved traditional architecture. It’s also close to the GR-221 walking route through the Tramuntana.

Good for: wandering · cafés · photography · slow travel
FIBI category: Village
$d2$,
    'Mountain villages', 1, 39.7828::float8, 2.7411::float8,
    'Sóller Valley', 'Spain',
    'https://www.illesbalears.travel/en/mallorca/',
    'Web', 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80'
  ),
  (
    'Banyalbufar',
    $d3$
This might be my favourite type of FIBI save: somewhere you see once in a Reel and immediately think where IS that?

Banyalbufar clings to the Tramuntana coast above terraced vineyards, with mountain and sea views and smaller coves nearby. The official tourism guide describes it as less touristy than some of Mallorca’s other famous villages.

Good for: sunset · wine · coastal drives
FIBI category: Village / Viewpoint
$d3$,
    'Mountain villages', 2, 39.6872::float8, 2.5139::float8,
    'West Mallorca', 'Spain',
    'https://www.illesbalears.travel/en/mallorca/',
    'Web', 'https://images.unsplash.com/photo-1483683804023-6ccdb62f86ef?auto=format&fit=crop&w=1200&q=80'
  ),
  (
    'S''Amarador',
    $d4$
If you want turquoise water without simply adding another generic “Mallorca beach” to your list, save S'Amarador.

It sits within Mondragó Natural Park and is described as an almost unspoilt beach without development immediately around it. There are also short walking routes through forest, wetlands and coastline nearby.

Good for: swimming · walking · nature
FIBI category: Beach
$d4$,
    'Hidden beaches', 3, 39.3514::float8, 3.1864::float8,
    'Mondragó Natural Park', 'Spain',
    'https://www.illesbalears.travel/en/mallorca/',
    'Web', 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?auto=format&fit=crop&w=1200&q=80'
  ),
  (
    'Caló des Borgit',
    $d5$
A smaller cove tucked into the protected Mondragó landscape.

It can be incorporated into one of the park’s walking routes, so rather than driving from beach to beach you can save several places into one little Mondragó Travel Board and connect them on foot.

Good for: quieter swimming · coastal walks
FIBI category: Hidden beach
$d5$,
    'Hidden beaches', 4, 39.3482::float8, 3.1798::float8,
    'Mondragó', 'Spain',
    'https://www.illesbalears.travel/en/mallorca/',
    'Web', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80'
  ),
  (
    'Portocolom',
    $d6$
An old fishing port rather than a polished resort marina.

Mallorca’s tourism board includes Portocolom among the island’s traditional ports that still retain fishing boats, fishermen’s houses and the character of their maritime past.

Go late afternoon, walk around the harbour and stay for dinner.

Good for: seafood · harbour walks · evenings
FIBI category: Food / Village
$d6$,
    'Fishing harbours', 5, 39.4183::float8, 3.2561::float8,
    'East Mallorca', 'Spain',
    'https://www.illesbalears.travel/en/mallorca/',
    'Web', 'https://images.unsplash.com/photo-1493558103817-58b2924bce98?auto=format&fit=crop&w=1200&q=80'
  ),
  (
    'Cala Figuera',
    $d7$
Another traditional fishing harbour, but with a very different feel from Mallorca’s broad sandy resorts.

White buildings, boats, narrow harbour inlets and waterfront restaurants make this one particularly good for an evening stop. It’s also listed among Mallorca’s characterful historic fishing ports.

Good for: harbour views · food · photography
FIBI category: Village / Food
$d7$,
    'Fishing harbours', 6, 39.3314::float8, 3.1711::float8,
    'Santanyí', 'Spain',
    'https://www.illesbalears.travel/en/mallorca/',
    'Web', 'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?auto=format&fit=crop&w=1200&q=80'
  ),
  (
    'Sant Elm & Sa Dragonera',
    $d8$
Sant Elm sits on Mallorca’s western coast facing Sa Dragonera, the dramatic island just offshore.

The Balearic tourism board specifically highlights Sant Elm and Sa Dragonera when recommending the island’s western coastline.

Save Sant Elm as the base, then add a boat trip or Dragonera separately so it becomes a little cluster rather than one vague bookmark.

Good for: boat trips · sunset · coast
FIBI category: Activity / Nature
$d8$,
    'West coast', 7, 39.5792::float8, 2.3497::float8,
    'West Mallorca', 'Spain',
    'https://www.illesbalears.travel/en/mallorca/',
    'Web', 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?auto=format&fit=crop&w=1200&q=80'
  )
) AS v(name, description, section, display_order, latitude, longitude, location_city, location_country, source_url, source_platform, image_url)
WHERE g.slug = 'mallorca-hidden-gems';
