import random
import string
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
from datetime import timedelta

class User(AbstractUser):
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)

    def __str__(self):
        return self.username

class PasswordResetCode(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reset_codes')
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)

    def generate_code(self):
        self.code = ''.join(random.choices(string.digits, k=6))
        self.save()
    
    def is_valid(self):
        expiration_time = self.created_at + timedelta(minutes=15)

        return not self.is_used and timezone.now() <= expiration_time
    
    def __str__(self):
        return f"Reset code for {self.user.first_name} {self.user.last_name} ({self.user.username})"