import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import ChatRoom, Message, ChatParticipant

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
