from django.contrib import admin
from .models import ChatRoom, ChatParticipant, Message

class MessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'chat_room', 'content', 'created_at')
    search_fields = ('sender__username', 'content')
    list_filter = ('created_at',)

admin.site.register(ChatRoom)
admin.site.register(ChatParticipant)
admin.site.register(Message, MessageAdmin)
