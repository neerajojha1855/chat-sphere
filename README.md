# ChatSphere

Welcome to ChatSphere! This is a modern, responsive web-based chat application built with **Django** on the backend and HTML/CSS/JS (with **TailwindCSS**) on the frontend. It enables users to engage in real-time conversations seamlessly.

The application architecture utilizes **Django Channels** and **WebSockets** for real-time message delivery.

---

## ✨ Key Features

- **Real-time Messaging**: Instant message delivery using WebSocket connections.
- **User Authentication**: Secure signup, login, and logout flows powered by Django's robust authentication system. User profiles are also supported.
- **Responsive UI & Aesthetics**: Designed with a sleek "glassmorphism" style using TailwindCSS. It's fully responsive, ensuring a great experience on both mobile and desktop.
- **Message Interactions**: Users can intuitively pin important messages for later and delete their own messages using modern SVG/FontAwesome icons.
- **Dynamic Anchored Footer**: A responsive footer featuring copyright info, developer credits, and social media links.

---

## 🛠️ Technology Stack

- **Backend Framework**: Python (Django, Django Channels)
- **Frontend Styling**: TailwindCSS (via CDN), custom CSS
- **Frontend Logic**: Vanilla JavaScript
- **Database**: SQLite (default)
- **Asynchronous Server**: Daphne

---

## 🚀 Installation & Setup

Follow these steps to get ChatSphere running in your local development environment.

### Prerequisites

Ensure you have the following installed on your system:
- **Python** (version 3.8 or higher)
- **pip** (Python package installer)
- **Git**

### Step-by-Step Guide

#### 1. Clone the Repository
```bash
git clone https://github.com/neerajojha1855/chat-sphere.git
cd chat-sphere
```

#### 2. Create a Virtual Environment
It's highly recommended to use a virtual environment to manage project dependencies.
```bash
# On Windows
python -m venv venv
venv\Scripts\activate

# On macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

#### 3. Install Dependencies
Install all required Python packages.
```bash
pip install -r requirements.txt
```
*(If `requirements.txt` is missing, ensure you have `django` and `channels` installed via pip).*

#### 4. Configure Environment Variables
Create a `.env` file in the root directory (where `manage.py` is located) and add necessary configurations.
```
SECRET_KEY=your_secret_key_here
DEBUG=True
ALLOWED_HOSTS=*
```

#### 5. Apply Database Migrations
Initialize the database by running Django's migration command.
```bash
python manage.py migrate
```

#### 6. Create a Superuser (Optional)
Create an administrative account to access the Django admin panel (`/admin/`).
```bash
python manage.py createsuperuser
```

#### 7. Run the Development Server
Start the Daphne ASGI development server to support WebSockets.
```bash
python manage.py runserver
```

#### 8. Access the Application
Open your web browser and navigate to:
```
http://127.0.0.1:8000/
```

---

## 💡 Usage Guide

1. **Sign Up/Login**: Create a new account or log in with your existing credentials.
2. **Start a Chat**: Search for users by username in the sidebar and start a new conversation.
3. **Interact**: Hover over your sent messages to reveal "Pin" and "Delete" actions. Pinned messages will appear highlighted.
4. **Edit Profile**: Click your avatar or username in the top left to navigate to the profile editing page.
