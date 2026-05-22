from django.urls import path

from .views import (
    AcceptGuardianInviteView,
    GoogleLoginView,
    GuardianInviteDetailView,
    InviteSecondParentView,
    KidGoogleLoginView,
    KidGoogleSignupView,
    KidSignupView,
    KidTokenObtainView,
    KidTokenRefreshView,
    KidVerifyEmailView,
    ParentRegisterView,
    ParentVerifyEmailView,
)

urlpatterns = [
    path("kids/signup/", KidSignupView.as_view()),
    path("kids/signup/google/", KidGoogleSignupView.as_view()),
    path("kids/invite-parent/", InviteSecondParentView.as_view()),
    path("auth/register/", ParentRegisterView.as_view()),
    path("auth/verify-email/", ParentVerifyEmailView.as_view()),
    path("auth/google/", GoogleLoginView.as_view()),
    path("auth/kid/verify-email/", KidVerifyEmailView.as_view()),
    path("auth/kid/token/", KidTokenObtainView.as_view()),
    path("auth/kid/token/refresh/", KidTokenRefreshView.as_view()),
    path("auth/kid/google/", KidGoogleLoginView.as_view()),
    path(
        "guardian-invitations/<uuid:token>/",
        GuardianInviteDetailView.as_view(),
    ),
    path("guardian-invitations/accept/", AcceptGuardianInviteView.as_view()),
]
