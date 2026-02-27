from django.urls import path
from . import views, api_views

app_name = 'chat'

urlpatterns = [
    path('', views.index_view, name='index'),
    path('api/create/', api_views.create_chat_room, name='api-create-room'),
    path('api/<int:room_id>/messages/', api_views.get_messages, name='api-messages'),
    path('api/rooms/', api_views.get_user_rooms, name='api-rooms'),
    path('api/messages/<int:message_id>/delete/', api_views.delete_message, name='api-delete-message'),
    path('api/messages/<int:message_id>/pin/', api_views.pin_message, name='api-pin-message'),
]
