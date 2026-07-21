from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('api/social/schema/', SpectacularAPIView.as_view(), name='social-schema'),
    path(
        'api/social/docs/',
        SpectacularSwaggerView.as_view(url_name='social-schema'),
        name='social-docs',
    ),
    path('api/social/', include('common.urls')),
    path('api/social/', include('social.urls')),
]
