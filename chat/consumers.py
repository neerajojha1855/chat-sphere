import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import ChatRoom, Message, ChatParticipant
from asgiref.sync import sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        if not self.user.is_authenticated:
            await self.close()
            return

        self.notification_group_name = f'notify_{self.user.id}'
        await self.channel_layer.group_add(
            self.notification_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'notification_group_name'):
            await self.channel_layer.group_discard(
                self.notification_group_name,
                self.channel_name
            )

    async def new_message_notification(self, event):
        await self.send(text_data=json.dumps(event))

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'
        self.user = self.scope['user']

        if not self.user.is_authenticated:
            await self.close()
            return

        is_participant = await self.check_participant(self.room_id, self.user)
        if not is_participant:
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        
        if data.get('type') == 'typing':
            is_typing = data.get('is_typing', False)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_typing',
                    'username': self.user.username,
                    'is_typing': is_typing
                }
            )
            return

        message_content = data.get('message', '')
        
        if message_content:
            message = await self.save_message(self.room_id, self.user, message_content)
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'id': message.id,
                    'message': message_content,
                    'sender': self.user.username,
                    'created_at': str(message.created_at)
                }
            )
            
            # Notify other participants globally
            participants = await self.get_other_participants(self.room_id, self.user)
            room = await self.get_room(self.room_id)
            for participant in participants:
                notify_group = f'notify_{participant.id}'
                
                # Check if it's a new room for this participant (if they don't know about it, they won't have it open)
                # But for our notification, we just send standard format
                room_name = room.name
                if not room.is_group:
                    room_name = self.user.username
                    
                await self.channel_layer.group_send(
                    notify_group,
                    {
                        'type': 'new_message_notification',
                        'room_id': self.room_id,
                        'room_name': room_name,
                        'is_group': room.is_group,
                        'sender': self.user.username,
                        'message': message_content,
                        'created_at': str(message.created_at),
                        'message_id': message.id
                    }
                )

    async def user_typing(self, event):
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'username': event['username'],
            'is_typing': event['is_typing']
        }))

    async def chat_message(self, event):
        message_id = event.get('id')
        message = event['message']
        sender = event['sender']
        created_at = event['created_at']

        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'id': message_id,
            'message': message,
            'sender': sender,
            'created_at': created_at
        }))

    async def message_deleted(self, event):
        message_id = event['message_id']
        await self.send(text_data=json.dumps({
            'type': 'message_deleted',
            'message_id': message_id
        }))

    async def message_pinned(self, event):
        message_id = event['message_id']
        is_pinned = event['is_pinned']
        await self.send(text_data=json.dumps({
            'type': 'message_pinned',
            'message_id': message_id,
            'is_pinned': is_pinned
        }))

    @database_sync_to_async
    def check_participant(self, room_id, user):
        return ChatParticipant.objects.filter(chat_room_id=room_id, user=user).exists()

    @database_sync_to_async
    def save_message(self, room_id, user, content):
        room = ChatRoom.objects.get(id=room_id)
        return Message.objects.create(chat_room=room, sender=user, content=content)

    @database_sync_to_async
    def get_other_participants(self, room_id, exclude_user):
        participants = ChatParticipant.objects.filter(chat_room_id=room_id).exclude(user=exclude_user).select_related('user')
        return [p.user for p in participants]

    @database_sync_to_async
    def get_room(self, room_id):
        return ChatRoom.objects.get(id=room_id)
