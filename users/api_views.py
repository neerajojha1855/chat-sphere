from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model

User = get_user_model()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_public_key(request):
    public_key = request.data.get('public_key')
    if not public_key:
        return Response({"error": "Public key is required"}, status=400)
    
    request.user.public_key = public_key
    request.user.save()
    return Response({"success": "Public key updated"})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_public_key(request, user_id):
    user = get_object_or_404(User, id=user_id)
    if not user.public_key:
        return Response({"error": "User does not have a public key"}, status=404)
        
    return Response({"public_key": user.public_key})
