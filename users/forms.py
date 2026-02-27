from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from .models import User

class CustomUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ('username', 'email')

class UserProfileForm(UserChangeForm):
    password = None # We typically don't want to change password in the same basic form
    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'avatar')
