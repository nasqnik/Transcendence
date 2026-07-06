from rest_framework import serializers
from .models import CATEGORY_CHOICES, KidStat, KidProfile

class CategoryPointSerializer(serializers.Serializer):
    category = serializers.ChoiceField(choices=CATEGORY_CHOICES)
    points = serializers.IntegerField(min_value=0)

class CompletionIngestSerializer(serializers.Serializer):
    completion_id = serializers.UUIDField()
    kid_id = serializers.UUIDField()
    category_points = CategoryPointSerializer(many=True)

class CoinDeductSerializer(serializers.Serializer):
    kid_id = serializers.UUIDField()
    amount = serializers.IntegerField(min_value=1)
    reason = serializers.CharField(max_length=64)

class KidStatSerializer(serializers.ModelSerializer):
    class Meta:
        model = KidStat
        fields = ['category', 'level', 'xp_percent']

class KidProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = KidProfile
        fields = ['main_level', 'overall_xp', 'coins']