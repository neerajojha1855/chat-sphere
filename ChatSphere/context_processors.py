import os

def firebase_config(request):
    return {
        'FIREBASE_API_KEY': os.getenv('FIREBASE_API_KEY', ''),
        'FIREBASE_AUTH_DOMAIN': os.getenv('FIREBASE_AUTH_DOMAIN', ''),
        'FIREBASE_PROJECT_ID': os.getenv('FIREBASE_PROJECT_ID', ''),
        'FIREBASE_STORAGE_BUCKET': os.getenv('FIREBASE_STORAGE_BUCKET', ''),
        'FIREBASE_MESSAGING_SENDER_ID': os.getenv('FIREBASE_MESSAGING_SENDER_ID', ''),
        'FIREBASE_APP_ID': os.getenv('FIREBASE_APP_ID', ''),
        'FIREBASE_MEASUREMENT_ID': os.getenv('FIREBASE_MEASUREMENT_ID', ''),
    }
