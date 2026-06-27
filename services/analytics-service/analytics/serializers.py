from rest_framework import serializers

class ActivityEventCreateSerializer(serializers.Serializer):
    completion_id = serializers.UUIDField(
        help_text="Unique ID of the completion event (idempotency key)."
    )
    kid_id = serializers.UUIDField(
        help_text="ID of the kid who completed the task."
    )
    payload = serializers.ListField(
        child=serializers.DictField(),
        default=list,
        help_text="Raw gamification payload from the gamification service.",
    )

class CategoryBreakdownSerializer(serializers.Serializer):
    category = serializers.CharField(
         help_text="Task category name (e.g. 'Chores', 'Homework')."
    )
    total_points = serializers.IntegerField(
        help_text="Total XP points earned in this category."
    )

class DailyTrendSerializer(serializers.Serializer):
    date = serializers.CharField(
        help_text="Date in YYYY-MM-DD format."
    )
    points = serializers.IntegerField(
        help_text="Total XP points earned on this date."
    )

class CompletionRateSerializer(serializers.Serializer):
    total = serializers.IntegerField(
        help_text="Total number of completions."
    )
    confirmed = serializers.IntegerField(
        help_text="Number of confirmed completions."
    )
    rejected = serializers.IntegerField(
        help_text="Number of rejected completions."
    )
    pending = serializers.IntegerField(
        help_text="Number of pending completions."
    )
    rate = serializers.FloatField(
        help_text="Confirmation rate as a percentage (0-100)."
    )

class KidDashboardSerializer(serializers.Serializer):
    category_breakdown = CategoryBreakdownSerializer(
        many=True,
        help_text="List of categories with total points earned."
    )
    daily_trend = DailyTrendSerializer(
        many=True,
        help_text="Daily XP trend for the kid over recent days."
    )
    completion_rates = CompletionRateSerializer(
        help_text="Overall completion rates fetched from the task service.",
    )
