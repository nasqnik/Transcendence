from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0006_pending_email"),
    ]

    operations = [
        migrations.AddField(
            model_name="customuser",
            name="bio",
            field=models.CharField(blank=True, default="", max_length=300),
        ),
        migrations.AddField(
            model_name="kid",
            name="bio",
            field=models.CharField(blank=True, default="", max_length=300),
        ),
    ]
