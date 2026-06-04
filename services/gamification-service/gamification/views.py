from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from common.permissions import IsInternalService, IsKid, IsParent
from .models import KidStat, KidProfile
from .serializers import (
    CompletionIngestSerializer,
    KidStatSerializer,
    KidProfileSerializer,
)
from .engine import apply_completion

class InternalCompletionView(APIView):
    authentication_classes = []          # no JWT for internal calls
    permission_classes = [IsInternalService]

    def post(self, request):
        serializer = CompletionIngestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        apply_completion(
            kid_id=data['kid_id'],
            completion_id=data['completion_id'],
            category_points=data['category_points'],
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
    

class KidStatListView(APIView):
    permission_classes = [IsKid]

    def get(self, request):
        stats = KidStat.objects.filter(kid_id=request.user.kid_id)
        return Response(KidStatSerializer(stats, many=True).data)

class KidProfileView(APIView):
    permission_classes = [IsKid]

    def get(self, request):
        profile, _ = KidProfile.objects.get_or_create(kid_id=request.user.kid_id)
        return Response(KidProfileSerializer(profile).data)

class KidStatListViewParent(APIView):
    permission_classes = [IsParent]

    def get(self, request, kid_id):
        if kid_id not in request.user.kid_ids:
            return Response(status=status.HTTP_403_FORBIDDEN)
        stats = KidStat.objects.filter(kid_id=kid_id)
        return Response(KidStatSerializer(stats, many=True).data)