from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Task, TaskCategoryReward, TaskCompletion, KidCategoryVisibility
from .notifications import notify_task_submitted, push_completion_confirmed


# Review modes from category visibility toggles (no per-completion choice).
REVIEW_ALWAYS = 'always'  # at least one category shown -> completion is pending
REVIEW_NEVER = 'never'    # no categories shown -> completion auto-confirms


def compute_review_mode(task, kid_id, visibility=None):
    """Decide whether completing this task needs parent review.

    Driven only by KidCategoryVisibility toggles. Single source of truth shared
    by TaskSerializer.review_mode and completion create.

    Pass `visibility` to reuse an already-fetched settings row (avoids an
    N+1 query when serializing a list of tasks).
    """
    # .all() (not values_list) so a prefetch_related cache is reused.
    categories = [r.category for r in task.category_rewards.all()]
    if not categories:
        return REVIEW_NEVER

    if visibility is None:
        visibility, _ = KidCategoryVisibility.objects.get_or_create(kid_id=kid_id)
    if any(getattr(visibility, f'show_{c}') for c in categories):
        return REVIEW_ALWAYS
    return REVIEW_NEVER


class TaskCategoryRewardSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskCategoryReward
        fields = ('category', 'points_value')


class TaskSerializer(serializers.ModelSerializer):
    category_rewards = TaskCategoryRewardSerializer(many=True, read_only=True)
    review_mode = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = (
            'id', 'kid_id', 'title', 'description',
            'xp_reward', 'ai_summary', 'ai_evaluated',
            'due_date', 'is_active', 'created_at',
            'category_rewards', 'review_mode',
        )

    def get_review_mode(self, task):
        # The task owner's visibility settings decide the mode.
        # Reuse a cached row from the view's context when present (list view).
        visibility = self.context.get('kid_visibility')
        return compute_review_mode(task, task.kid_id, visibility=visibility)

class TaskCreateSerializer(serializers.ModelSerializer):
    """Validates task input; AI + save happen in the streaming create view."""

    class Meta:
        model = Task
        fields = ('title', 'description', 'due_date')


class TaskUpdateSerializer(serializers.ModelSerializer):
    """Validates task edits; streaming re-classify is handled in the view."""

    class Meta:
        model = Task
        fields = ('title', 'description', 'due_date')

    def validate_title(self, value):
        if not value.strip():
            raise serializers.ValidationError('Title cannot be empty.')
        return value

class KidCategoryVisibilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = KidCategoryVisibility
        fields = ('show_health', 'show_learning', 'show_responsibility', 'show_creativity')


class TaskCompletionSerializer(serializers.ModelSerializer):
    task_title = serializers.CharField(source='task.title', read_only=True)
    task_description = serializers.CharField(source='task.description', read_only=True)
    task_due_date = serializers.DateField(source='task.due_date', read_only=True)
    reward = serializers.SerializerMethodField()

    class Meta:
        model = TaskCompletion
        fields = (
            'id', 'task', 'task_title', 'task_description', 'task_due_date',
            'kid_id', 'status', 'completed_at', 'reviewed_at', 'review_note',
            'reward',
        )

    @extend_schema_field(serializers.JSONField(allow_null=True))
    def get_reward(self, completion):
        """Coins and category level-ups this request just earned.

        Only filled in on the response to the call that confirmed the
        completion; null everywhere else, including list responses.
        """
        return getattr(completion, 'reward_summary', None)


class TaskCompletionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskCompletion
        fields = ('task',)

    def validate_task(self, task):
        kid_id = self.context['request'].user.kid_id
        if task.kid_id != kid_id:
            raise serializers.ValidationError('This task is not yours.')
        return task

    def create(self, validated_data):
        kid_id = self.context['request'].user.kid_id
        task = validated_data['task']

        new_status = self._resolve_status(task, kid_id)
        completion = TaskCompletion.objects.create(
            kid_id=kid_id,
            status=new_status,
            **validated_data,
        )

        # Auto-confirmed completions skip parent review, so push here too.
        if new_status == TaskCompletion.Status.CONFIRMED:
            completion.reward_summary = push_completion_confirmed(completion)
        elif new_status == TaskCompletion.Status.PENDING:
            notify_task_submitted(completion)

        return completion

    def _resolve_status(self, task, kid_id):
        if compute_review_mode(task, kid_id) == REVIEW_ALWAYS:
            return TaskCompletion.Status.PENDING
        return TaskCompletion.Status.CONFIRMED


class TaskCompletionReviewSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=[
            TaskCompletion.Status.CONFIRMED,
            TaskCompletion.Status.REJECTED,
        ],
    )
    review_note = serializers.CharField(required=False, allow_blank=True, default='')