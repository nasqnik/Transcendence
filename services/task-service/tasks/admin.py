from django.contrib import admin

from .models import ModerationLog, Task, TaskCompletion


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'kid_id', 'created_by', 'xp_reward', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('title', 'kid_id')


@admin.register(TaskCompletion)
class TaskCompletionAdmin(admin.ModelAdmin):
    list_display = ('task', 'kid_id', 'status', 'completed_at', 'reviewed_at')
    list_filter = ('status',)


@admin.register(ModerationLog)
class ModerationLogAdmin(admin.ModelAdmin):
    list_display = ('action', 'kid_id', 'title', 'created_at')
    list_filter = ('action',)
    search_fields = ('title', 'kid_id', 'reason')
    readonly_fields = (
        'id', 'kid_id', 'title', 'description', 'action', 'reason', 'created_at',
    )
