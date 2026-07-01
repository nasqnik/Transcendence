from django.core.management.base import BaseCommand
from catalog.models import AvatarItem

class Command(BaseCommand):
    help = 'Seeds the catalogue with default avatar items.'

    ITEMS = [
        {
            'name' : 'Explorer Hat',
            'type' : 'hat',
            'image_url' : 'https://api.dicebear.com/7.x/adventurer/svg?seed=explorer-hat',
            'coin_cost' : 50,
        },
        {
            'name' : 'Space Helmet',
            'type' : 'hat',
            'image_url' : 'https://api.dicebear.com/7.x/adventurer/svg?seed=space-helmet',
            'coin_cost' : 80,
        },
        {
            'name' : 'Hero Cape',
            'type' : 'outfit',
            'image_url' : 'https://api.dicebear.com/7.x/adventurer/svg?seed=hero-cape',
            'coin_cost' : 100,
        },
        {
            'name' : 'Golden Star',
            'type' : 'accessory',
            'image_url' : 'https://api.dicebear.com/7.x/adventurer/svg?seed=golden-star',
            'coin_cost' : 30,
        },
        {
            'name' : 'Rainbow Wings',
            'type' : 'accessory',
            'image_url' : 'https://api.dicebear.com/7.x/adventurer/svg?seed=rainbow-wings',
            'coin_cost' : 60,
        },
        {
            'name' : 'Forest Background',
            'type' : 'background',
            'image_url' : 'https://api.dicebear.com/7.x/adventurer/svg?seed=forest-background',
            'coin_cost' : 40,
        },
        {
            'name' : 'Space Background',
            'type' : 'background',
            'image_url' : 'https://api.dicebear.com/7.x/adventurer/svg?seed=space-background',
            'coin_cost' : 70,
        }
    ]

    def handle(self, *args, **kwargs):
        created = 0;
        skipped = 0;
        for item_data in self.ITEMS:
            _, was_created = AvatarItem.objects.get_or_create(
                name=item_data['name'],
                type=item_data['type'],
                defaults={
                    'image_url': item_data['image_url'],
                    'coin_cost': item_data['coin_cost'],
                    'is_active': True,
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