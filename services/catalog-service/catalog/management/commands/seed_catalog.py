from django.core.management.base import BaseCommand
from catalog.models import AvatarItem

class Command(BaseCommand):
    help = 'Seeds the catalogue with default avatar items.'

    ITEMS = [
    # Long Hair (60 coins each)
    {
        'name': 'Long Hair 1',
        'type': 'hair',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&hairVariant=long03',
        'coin_cost': 60,
        'param_key': 'hairVariant',
        'param_value': 'long03',
    },
    {
        'name': 'Long Hair 2',
        'type': 'hair',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&hairVariant=long08',
        'coin_cost': 60,
        'param_key': 'hairVariant',
        'param_value': 'long08',
    },
    {
        'name': 'Long Hair 3',
        'type': 'hair',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&hairVariant=long09',
        'coin_cost': 60,
        'param_key': 'hairVariant',
        'param_value': 'long09',
    },
    {
        'name': 'Long Hair 4',
        'type': 'hair',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&hairVariant=long11',
        'coin_cost': 60,
        'param_key': 'hairVariant',
        'param_value': 'long11',
    },
    {
        'name': 'Long Hair 5',
        'type': 'hair',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&hairVariant=long18',
        'coin_cost': 60,
        'param_key': 'hairVariant',
        'param_value': 'long18',
    },
    {
        'name': 'Long Hair 6',
        'type': 'hair',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&hairVariant=long26',
        'coin_cost': 60,
        'param_key': 'hairVariant',
        'param_value': 'long26',
    },

    # Short Hair (50 coins each)
    {
        'name': 'Short Hair 1',
        'type': 'hair',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&hairVariant=short01',
        'coin_cost': 50,
        'param_key': 'hairVariant',
        'param_value': 'short01',
    },
    {
        'name': 'Short Hair 2',
        'type': 'hair',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&hairVariant=short03',
        'coin_cost': 50,
        'param_key': 'hairVariant',
        'param_value': 'short03',
    },
    {
        'name': 'Short Hair 3',
        'type': 'hair',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&hairVariant=short09',
        'coin_cost': 50,
        'param_key': 'hairVariant',
        'param_value': 'short09',
    },
    {
        'name': 'Short Hair 4',
        'type': 'hair',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&hairVariant=short16',
        'coin_cost': 50,
        'param_key': 'hairVariant',
        'param_value': 'short16',
    },
    {
        'name': 'Short Hair 5',
        'type': 'hair',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&hairVariant=short17',
        'coin_cost': 50,
        'param_key': 'hairVariant',
        'param_value': 'short17',
    },

    # Glasses (30 coins each)
    {
        'name': 'Sunglasses',
        'type': 'glasses',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&glassesProbability=100&glassesVariant=variant01',
        'coin_cost': 30,
        'param_key': 'glassesVariant',
        'param_value': 'variant01',
    },
    {
        'name': 'Round Glasses',
        'type': 'glasses',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&glassesProbability=100&glassesVariant=variant02',
        'coin_cost': 30,
        'param_key': 'glassesVariant',
        'param_value': 'variant02',
    },
    {
        'name': 'Square Glasses',
        'type': 'glasses',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&glassesProbability=100&glassesVariant=variant04',
        'coin_cost': 30,
        'param_key': 'glassesVariant',
        'param_value': 'variant04',
    },
    {
        'name': 'Cool Glasses',
        'type': 'glasses',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&glassesProbability=100&glassesVariant=variant05',
        'coin_cost': 30,
        'param_key': 'glassesVariant',
        'param_value': 'variant05',
    },

    # Earrings (25 coins each)
    {
        'name': 'Stud Earrings',
        'type': 'earrings',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&earringsProbability=100&earringsVariant=variant01',
        'coin_cost': 25,
        'param_key': 'earringsVariant',
        'param_value': 'variant01',
    },
    {
        'name': 'Hoop Earrings',
        'type': 'earrings',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&earringsProbability=100&earringsVariant=variant02',
        'coin_cost': 25,
        'param_key': 'earringsVariant',
        'param_value': 'variant02',
    },
    {
        'name': 'Drop Earrings',
        'type': 'earrings',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&earringsProbability=100&earringsVariant=variant04',
        'coin_cost': 25,
        'param_key': 'earringsVariant',
        'param_value': 'variant04',
    },
    {
        'name': 'Crystal Earrings',
        'type': 'earrings',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&earringsProbability=100&earringsVariant=variant06',
        'coin_cost': 25,
        'param_key': 'earringsVariant',
        'param_value': 'variant06',
    },

    # Backgrounds (40-80 coins)
    {
        'name': 'Ocean Blue',
        'type': 'background',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&backgroundColor=b6e3f4',
        'coin_cost': 40,
        'param_key': 'backgroundColor',
        'param_value': 'b6e3f4',
    },
    {
        'name': 'Forest Green',
        'type': 'background',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&backgroundColor=d1f4d1',
        'coin_cost': 40,
        'param_key': 'backgroundColor',
        'param_value': 'd1f4d1',
    },
    {
        'name': 'Sunset Pink',
        'type': 'background',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&backgroundColor=ffd5dc',
        'coin_cost': 50,
        'param_key': 'backgroundColor',
        'param_value': 'ffd5dc',
    },
    {
        'name': 'Royal Purple',
        'type': 'background',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&backgroundColor=c0aede',
        'coin_cost': 60,
        'param_key': 'backgroundColor',
        'param_value': 'c0aede',
    },
    {
        'name': 'Golden Yellow',
        'type': 'background',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&backgroundColor=ffe4c4',
        'coin_cost': 60,
        'param_key': 'backgroundColor',
        'param_value': 'ffe4c4',
    },
    {
        'name': 'Night Sky',
        'type': 'background',
        'image_url': 'https://api.dicebear.com/10.x/adventurer/svg?seed=test&backgroundColor=1a1a2e',
        'coin_cost': 80,
        'param_key': 'backgroundColor',
        'param_value': '1a1a2e',
    },
]

    def handle(self, *args, **kwargs):
        created = 0
        skipped = 0
        for item_data in self.ITEMS:
            _, was_created = AvatarItem.objects.get_or_create(
                name=item_data['name'],
                type=item_data['type'],
                defaults={
                    'image_url': item_data['image_url'],
                    'coin_cost': item_data['coin_cost'],
                    'is_active': True,
                    'param_key': item_data['param_key'],
                    'param_value': item_data['param_value'],
                }
            )
            if was_created:
                created += 1
            else:
                skipped += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Seeded catalogue with {created} new items and skipped {skipped} existing items.'
            )
        )