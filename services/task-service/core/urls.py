from django.conf import settings
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('api/task/', include('common.urls')),
    path('api/task/', include('tasks.urls')),
]

if settings.DEBUG:
    urlpatterns = [
        path('api/task/schema/', SpectacularAPIView.as_view(), name='task-schema'),
        path(
            'api/task/docs/',
            SpectacularSwaggerView.as_view(url_name='task-schema'),
            name='task-docs',
        ),
        *urlpatterns,
    ]
