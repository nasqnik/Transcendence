from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('api/notification/schema/', SpectacularAPIView.as_view(), name='notification-schema'),
    path('api/notification/docs/', SpectacularSwaggerView.as_view(url_name='notification-schema')),
    path('api/notification/', include('common.urls')),
]
