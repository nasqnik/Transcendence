from django.urls import path
from .views import InternalActivityEventView, KidDashboardView

urlpatterns = [
    path('internal/activity/', InternalActivityEventView.as_view(), name='internal-activity'),
    path('kids/<uuid:kid_id>/dashboard/', KidDashboardView.as_view(), name='kid-dashboard'),
]