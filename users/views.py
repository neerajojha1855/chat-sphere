from django.shortcuts import render, redirect
from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.forms import AuthenticationForm
from django.conf import settings
from django.core.mail import send_mail
from .models import User, PasswordResetCode
from .forms import CustomUserCreationForm, UserProfileForm ,ForgotPasswordForm, ResetPasswordForm
from django.contrib.auth.decorators import login_required

def signup_view(request):
    if request.user.is_authenticated:
        return redirect('chat:index')
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, f"Welcome to ChatSphere, {user.first_name or user.username}!")
            return redirect('chat:index')
    else:
        form = CustomUserCreationForm()
    return render(request, 'users/signup.html', {'form': form})

def login_view(request):
    if request.user.is_authenticated:
        return redirect('chat:index')
    if request.method == 'POST':
        form = AuthenticationForm(data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            messages.success(request, f"Welcome back, {user.first_name or user.username}!")
            return redirect('chat:index')
    else:
        form = AuthenticationForm()
    return render(request, 'users/login.html', {'form': form})

def logout_view(request):
    logout(request)
    return redirect('users:login')

def forgot_password_view(request):
    if request.method == 'POST':
        form = ForgotPasswordForm(request.POST)
        if form.is_valid():
            email = form.cleaned_data.get('email')
            user = User.objects.filter(email=email).first()

            reset_obj = PasswordResetCode(user=user)
            reset_obj.generate_code()

            try:
                subject = "Chat Sphere: Password Reset Code"
                message = f"Your password reset code is: {reset_obj.code}\n\nThis code is valid for 15 minutes."
                html_msg = f"<p>Your password reset code is: <strong>{reset_obj.code}</strong></p><p>This code is valid for 15 minutes.</p>"

                send_mail(subject=subject, message=message, from_email=settings.DEFAULT_FROM_EMAIL, recipient_list=[email], fail_silently=False, html_message=html_msg)

                request.session['reset_email'] = email
                messages.success(request, "A reset code has been sent to your email.")

                return redirect('users:reset_password')
            
            except Exception as e:
                messages.error(request, "Error sending email. Please try again later.")
    
    else:
        form = ForgotPasswordForm()
    
    return render(request, 'users/forgot_password.html', {'form': form})

def reset_password_view(request):
    email = request.session.get('reset_email')
    if not email:
        return redirect('users:forgot_password')
    
    if request.method == 'POST':
        form = ResetPasswordForm(request.POST)
        if form.is_valid():
            code = form.cleaned_data.get('code')
            new_pass = form.cleaned_data.get('new_pass')
            user = User.objects.filter(email=email).first()
            reset_obj = PasswordResetCode.objects.filter(user=user, code=code).last()

            if reset_obj and reset_obj.is_valid():
                user.set_password(new_pass)
                user.save()

                reset_obj.is_used = True
                reset_obj.save()

                del request.session['reset_email']
                messages.success(request, "Password has been reset sucessfully.")

                return redirect('users:login')
            
            else:
                messages.error(request, "Invalid or expired reset code.")
    
    else:
        form = ResetPasswordForm()
        
    return render(request, 'users/reset_password.html', {'form': form, 'email': email})

@login_required
def edit_profile_view(request):
    if request.method == 'POST':
        form = UserProfileForm(request.POST, request.FILES, instance=request.user)
        if form.is_valid():
            form.save()
            messages.success(request, 'Your profile was successfully updated!')
            return redirect('users:edit_profile')
    else:
        form = UserProfileForm(instance=request.user)
    return render(request, 'users/edit_profile.html', {'form': form})

@login_required
def delete_account_view(request):
    if request.method == 'POST':
        user = request.user
        logout(request)
        user.delete()
        messages.success(request, 'Your account has been permanently deleted.')
        return redirect('users:login')
    return redirect('users:edit_profile')
