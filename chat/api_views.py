from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import ChatRoom, ChatParticipant, Message
from django.contrib.auth import get_user_model
from .serializers import ChatRoomSerializer, MessageSerializer
from django.db.models import Count, Q

User = get_user_model()

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_chat_room(request):
    other_user_username = request.data.get('username')
    is_group = request.data.get('is_group', False)
    room_name = request.data.get('name', '')
    
    if not is_group and other_user_username:
        other_user = get_object_or_404(User, username=other_user_username)
        if other_user == request.user:
            return Response({"error": "Cannot create chat with yourself"}, status=400)
            
        # Check if private room already exists
        common_rooms = ChatRoom.objects.filter(is_group=False, participants__user=request.user).filter(participants__user=other_user)
        
        if common_rooms.exists():
            room = common_rooms.first()
            serializer = ChatRoomSerializer(room)
            return Response(serializer.data)
                
        # Create new private room
        room = ChatRoom.objects.create(is_group=False)
        ChatParticipant.objects.create(user=request.user, chat_room=room)
        ChatParticipant.objects.create(user=other_user, chat_room=room)
        serializer = ChatRoomSerializer(room)
        return Response(serializer.data, status=201)
        
    elif is_group:
        if not room_name:
            return Response({"error": "Group name required"}, status=400)
        room = ChatRoom.objects.create(is_group=True, name=room_name)
        ChatParticipant.objects.create(user=request.user, chat_room=room)
        serializer = ChatRoomSerializer(room)
        return Response(serializer.data, status=201)
        
    return Response({"error": "Invalid request parameters"}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_messages(request, room_id):
    room = get_object_or_404(ChatRoom, id=room_id)
    if not ChatParticipant.objects.filter(chat_room=room, user=request.user).exists():
        return Response({"error": "Not a participant"}, status=403)
        
    messages = Message.objects.filter(chat_room=room).order_by('created_at')
    
    # Mark messages as read for the current user (if sender is someone else)
    unread_messages = messages.filter(is_read=False).exclude(sender=request.user)
    if unread_messages.exists():
        unread_messages.update(is_read=True)
        # Notify clients that messages were read could be done here if needed
        
    serializer = MessageSerializer(messages, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_rooms(request):
    participants = ChatParticipant.objects.filter(user=request.user).select_related('chat_room')
    rooms = [p.chat_room for p in participants]
    
    room_ids = [room.id for room in rooms]
    annotated_rooms = ChatRoom.objects.filter(id__in=room_ids).annotate(
        unread_count=Count(
            'messages',
            filter=Q(messages__is_read=False) & ~Q(messages__sender=request.user)
        )
    ).order_by('-created_at')
    
    serializer = ChatRoomSerializer(annotated_rooms, many=True, context={'request': request})
    return Response(serializer.data)

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_message(request, message_id):
    message = get_object_or_404(Message, id=message_id)
    if message.sender != request.user:
        return Response({"error": "You can only delete your own messages"}, status=403)
    
    message.is_deleted = True
    message.save()
    
    # Broadcast deletion to the room
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'chat_{message.chat_room.id}',
        {
            'type': 'message_deleted',
            'message_id': message.id
        }
    )
    return Response({"success": "Message deleted"})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pin_message(request, message_id):
    message = get_object_or_404(Message, id=message_id)
    # Check if participant
    if not ChatParticipant.objects.filter(chat_room=message.chat_room, user=request.user).exists():
        return Response({"error": "Not a participant in this room"}, status=403)
        
    message.is_pinned = not message.is_pinned
    message.save()
    
    # Broadcast pin event
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'chat_{message.chat_room.id}',
        {
            'type': 'message_pinned',
            'message_id': message.id,
            'is_pinned': message.is_pinned
        }
    )
    return Response({"success": "Message pinned status toggled", "is_pinned": message.is_pinned})
