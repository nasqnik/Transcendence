from django.urls import include, path
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    path('api/catalog/schema/', SpectacularAPIView.as_view(), name='catalog-schema'),
    path('api/catalog/docs/', SpectacularSwaggerView.as_view(url_name='catalog-schema'), name='catalog-docs'),
    path('api/catalog/', include('common.urls')),
    path('api/catalog/', include('catalog.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
