from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import ChatRoom, ChatParticipant, Message
from rest_framework.test import APIClient
from django.urls import reverse

User = get_user_model()

class ChatTestCase(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username='user1', password='password123')
        self.user2 = User.objects.create_user(username='user2', password='password123')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user1)
        
    def test_create_private_chat_room(self):
        url = reverse('chat:api-create-room')
        data = {'username': 'user2', 'is_group': False}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 201)
        
        room_id = response.data['id']
        room = ChatRoom.objects.get(id=room_id)
        self.assertFalse(room.is_group)
        self.assertEqual(room.participants.count(), 2)
        
    def test_create_group_chat_room(self):
        url = reverse('chat:api-create-room')
        data = {'name': 'Test Group', 'is_group': True}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, 201)
        
        room_id = response.data['id']
        room = ChatRoom.objects.get(id=room_id)
        self.assertTrue(room.is_group)
        self.assertEqual(room.name, 'Test Group')
        self.assertEqual(room.participants.count(), 1)
        
    def test_get_messages(self):
        # Create room manually
        room = ChatRoom.objects.create(is_group=False)
        ChatParticipant.objects.create(user=self.user1, chat_room=room)
        ChatParticipant.objects.create(user=self.user2, chat_room=room)
        
        # Create messages
        Message.objects.create(chat_room=room, sender=self.user1, content="Hello user2")
        Message.objects.create(chat_room=room, sender=self.user2, content="Hi user1")
        
        url = reverse('chat:api-messages', args=[room.id])
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 2)
        self.assertEqual(response.data[0]['content'], "Hello user2")
        self.assertEqual(response.data[1]['content'], "Hi user1")
