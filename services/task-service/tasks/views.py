from django.http import StreamingHttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from common.actors import KidActor, ParentActor
# permissions in settings.py
from common.permissions import IsKid, IsParent

from .ai_evaluation.streaming import stream_task_create_events, stream_task_update_events, task_fields_text_changed
from .models import Task, KidCategoryVisibility, TaskCompletion
from .notifications import (
    notify_task_confirmed,
    notify_task_rejected,
    push_completion_confirmed,
)
from .serializers import (
    KidCategoryVisibilitySerializer,
    TaskCompletionCreateSerializer,
    TaskCompletionReviewSerializer,
    TaskCompletionSerializer,
    TaskCreateSerializer,
    TaskSerializer,
    TaskUpdateSerializer,
)
from .throttles import KidAIClassifyThrottle


@extend_schema_view(
    get=extend_schema(
        summary='List tasks',
        description="Kid lists their own active tasks.",
        responses=TaskSerializer(many=True),
    ),
    post=extend_schema(
        summary='Create a task (streaming AI)',
        description=(
            'Kid creates a task. OpenRouter tokens stream as SSE (`token` events), '
            'then a `done` event saves the same classification to the database and '
            'returns the created task. On failure, an `error` event is sent and '
            'nothing is saved.'
        ),
        request=TaskCreateSerializer,
        responses={200: {'description': 'text/event-stream'}},
    ),
)
class TaskListCreateView(generics.ListCreateAPIView):
    def get_throttles(self):
        if self.request.method == 'POST':
            return [KidAIClassifyThrottle()]
        return []

    def get_queryset(self):
        user = self.request.user
        if isinstance(user, KidActor):
            return (
                Task.objects
                .filter(kid_id=user.kid_id, is_active=True)
                .prefetch_related('category_rewards')
            )
        return Task.objects.none()

    def get_serializer_context(self):
        # Fetch the kid's visibility once so review_mode doesn't query per task.
        context = super().get_serializer_context()
        user = self.request.user
        if isinstance(user, KidActor):
            context['kid_visibility'] = KidCategoryVisibility.objects.get_or_create(
                kid_id=user.kid_id,
            )[0]
        return context

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TaskCreateSerializer
        return TaskSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsKid()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        response = StreamingHttpResponse(
            stream_task_create_events(
                request.user.kid_id,
                title=data['title'],
                description=data.get('description', ''),
                due_date=data.get('due_date'),
            ),
            content_type='text/event-stream; charset=utf-8',
        )
        response['Cache-Control'] = 'no-cache'
        response['X-Accel-Buffering'] = 'no'
        return response


@extend_schema_view(
    get=extend_schema(
        summary='Get one task',
        description="Kid retrieves a single one of their own tasks by id.",
        responses=TaskSerializer,
    ),
    patch=extend_schema(
        summary='Edit a task',
        description=(
            'Kid edits one of their own tasks. Changing title or description '
            'streams AI re-classification as SSE (same events as create), then '
            'saves the result. Editing only due_date returns normal JSON immediately.'
        ),
        request=TaskUpdateSerializer,
        responses={
            200: {
                'description': 'text/event-stream when title/description change; '
                'Task JSON when only due_date changes',
            },
        },
    ),
    delete=extend_schema(
        summary='Delete a task',
        description=(
            "Kid soft-deletes one of their own tasks (sets is_active=false). "
            "The task disappears from list/get; completion history is kept."
        ),
        responses={204: None},
    ),
)
class TaskDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsKid]
    lookup_url_kwarg = 'task_id'
    http_method_names = ['get', 'patch', 'delete']

    def get_throttles(self):
        if self.request.method != 'PATCH':
            return []
        instance = self.get_object()
        serializer = TaskUpdateSerializer(instance, data=self.request.data, partial=True)
        if serializer.is_valid() and task_fields_text_changed(instance, serializer.validated_data):
            return [KidAIClassifyThrottle()]
        return []

    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return TaskUpdateSerializer
        return TaskSerializer

    def get_queryset(self):
        user = self.request.user
        if isinstance(user, KidActor):
            return (
                Task.objects
                .filter(kid_id=user.kid_id, is_active=True)
                .prefetch_related('category_rewards')
            )
        return Task.objects.none()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if task_fields_text_changed(instance, data):
            response = StreamingHttpResponse(
                stream_task_update_events(instance.pk, data),
                content_type='text/event-stream; charset=utf-8',
            )
            response['Cache-Control'] = 'no-cache'
            response['X-Accel-Buffering'] = 'no'
            return response

        for attr, value in data.items():
            setattr(instance, attr, value)
        instance.save()

        fresh = self.get_queryset().get(pk=instance.pk)
        return Response(TaskSerializer(fresh).data)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active'])


@extend_schema_view(
    get=extend_schema(
        summary='List completions',
        description=(
            "Kid lists their own completions. Parent lists completions for "
            "the kids they guard."
        ),
        responses=TaskCompletionSerializer(many=True),
    ),
    post=extend_schema(
        summary='Submit a completion',
        description="Kid marks one of their tasks as completed (status pending).",
        request=TaskCompletionCreateSerializer,
        responses=TaskCompletionSerializer,
    ),
)
class TaskCompletionListCreateView(generics.ListCreateAPIView):
    def get_queryset(self):
        user = self.request.user
        if isinstance(user, KidActor):
            return TaskCompletion.objects.select_related('task').filter(kid_id=user.kid_id)
        if isinstance(user, ParentActor):
            return TaskCompletion.objects.select_related('task').filter(kid_id__in=user.kid_ids)
        return TaskCompletion.objects.none()

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TaskCompletionCreateSerializer
        return TaskCompletionSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsKid()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        completion = serializer.save()
        out = TaskCompletionSerializer(completion)
        return Response(out.data, status=status.HTTP_201_CREATED)


@extend_schema_view(
    post=extend_schema(
        summary='Review a completion',
        description=(
            "Parent confirms or rejects a completion for one of their kids. "
            "Returns 404 if the completion does not belong to a guarded kid."
        ),
        request=TaskCompletionReviewSerializer,
        responses=TaskCompletionSerializer,
    ),
)
class TaskCompletionReviewView(APIView):
    permission_classes = [IsParent]

    def post(self, request, completion_id):
        completion = get_object_or_404(
            TaskCompletion,
            id=completion_id,
            kid_id__in=request.user.kid_ids,
        )

        serializer = TaskCompletionReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']
        # Only push when the completion actually transitions into confirmed,
        # so re-confirming an already-confirmed completion won't push twice.
        became_confirmed = (
            new_status == TaskCompletion.Status.CONFIRMED
            and completion.status != TaskCompletion.Status.CONFIRMED
        )
        became_rejected = (
            new_status == TaskCompletion.Status.REJECTED
            and completion.status != TaskCompletion.Status.REJECTED
        )

        completion.status = new_status
        completion.review_note = serializer.validated_data['review_note']
        completion.reviewer_id = request.user.user_id
        completion.reviewed_at = timezone.now()
        completion.save(
            update_fields=['status', 'review_note', 'reviewer_id', 'reviewed_at'],
        )

        if became_confirmed:
            push_completion_confirmed(completion)
            notify_task_confirmed(completion)
        elif became_rejected:
            notify_task_rejected(completion)

        return Response(TaskCompletionSerializer(completion).data)


@extend_schema_view(
    get=extend_schema(
        summary='Get category visibility settings',
        description='Kid reads which task categories their parent can see.',
        responses=KidCategoryVisibilitySerializer,
    ),
    put=extend_schema(
        summary='Update category visibility settings',
        description='Kid toggles which categories are visible to their parent.',
        request=KidCategoryVisibilitySerializer,
        responses=KidCategoryVisibilitySerializer,
    ),
)
class KidCategoryVisibilityView(APIView):
    permission_classes = [IsKid]

    def _get_settings(self, request):
        return KidCategoryVisibility.objects.get_or_create(
            kid_id=request.user.kid_id,
        )

    def get(self, request):
        settings, _ = self._get_settings(request)
        serializer = KidCategoryVisibilitySerializer(settings)
        return Response(serializer.data)

    def put(self, request):
        settings, _ = self._get_settings(request)
        serializer = KidCategoryVisibilitySerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


