from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)

    def __str__(self):
        return self.username
