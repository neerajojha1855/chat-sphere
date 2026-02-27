from rest_framework import serializers
from .models import ChatRoom, ChatParticipant, Message
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'is_online', 'last_seen', 'avatar']

class ChatRoomSerializer(serializers.ModelSerializer):
    participants = serializers.SerializerMethodField()

    class Meta:
        model = ChatRoom
        fields = ['id', 'name', 'is_group', 'created_at', 'participants']
        
    def get_participants(self, obj):
        participants = obj.participants.all()
        return UserSerializer([p.user for p in participants], many=True).data

class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'chat_room', 'sender', 'content', 'message_type', 'is_read', 'is_deleted', 'is_pinned', 'created_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.is_deleted:
            data['content'] = 'This message was deleted'
        return data
