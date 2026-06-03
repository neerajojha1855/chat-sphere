from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from .models import User
from django import forms
from django.contrib.auth import get_user_model

class CustomUserCreationForm(UserCreationForm):
    class Meta(UserCreationForm.Meta):
        model = User
        fields = ('username', 'email')

class UserProfileForm(UserChangeForm):
    password = None # We typically don't want to change password in the same basic form
    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'avatar')

User = get_user_model()

class ForgotPasswordForm(forms.Form):
    email = forms.EmailField(widget=forms.EmailInput(attrs={'class': 'form-control','placholder': 'Enter your email address'}))

    def clean_email(self):
        email = self.cleaned_data.get('email')
        if not User.objects.filter(email=email).exists():
            raise forms.ValidationError("No account was found with this Email")
        
        return email

class ResetPasswordForm(forms.Form):
    code = forms.CharField(
        max_length=6,
        widget=forms.TextInput(attrs={
            'class': 'form-control',
            'placeholder': '6 digit code'
        })
    )

    new_pass = forms.CharField(
        label="New Password",
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'New Password'
        })
    )

    confirm_pass = forms.CharField(
        label="Confirm Password",
        widget=forms.PasswordInput(attrs={
            'class': 'form-control',
            'placeholder': 'Confirm New Password'
        })
    )

    def clean(self):
        cleaned_data = super().clean()
        new_pass = cleaned_data.get('new_pass')
        confirm_pass = cleaned_data.get('confirm_pass')

        if new_pass and confirm_pass and new_pass != confirm_pass:
            self.add_error('confirm_pass', "Password do not match")
        
        return cleaned_data
