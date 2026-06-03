import os
import json
import base64
from email.mime.text import MIMEText
from django.core.mail.backends.base import BaseEmailBackend
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from django.conf import settings

class GmailBackend(BaseEmailBackend):
    """
    A wrapper that implements the Django Email backend utilizing the Gmail HTTP API.
    Bypasses SMTP port blocking on hosts like Render.
    """
    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.credentials = self._get_credentials()

    def _get_credentials(self):
        # We store the token.json contents as a string in Render env vars, or load from file locally
        token_json_str = os.getenv('GMAIL_TOKEN_JSON')
        if token_json_str:
            try:
                token_data = json.loads(token_json_str)
                return Credentials.from_authorized_user_info(token_data)
            except Exception as e:
                if not self.fail_silently:
                    raise e
                return None
        
        # Fallback to local file if running locally
        token_path = os.path.join(settings.BASE_DIR, 'token.json')
        if os.path.exists(token_path):
            return Credentials.from_authorized_user_file(token_path)
        
        return None

    def send_messages(self, email_messages):
        if not email_messages:
            return 0
            
        if not self.credentials:
            if not self.fail_silently:
                raise ValueError("Gmail API credentials not found. Set GMAIL_TOKEN_JSON env var or provide token.json locally.")
            return 0

        try:
            service = build('gmail', 'v1', credentials=self.credentials)
            
            num_sent = 0
            for message in email_messages:
                # We need to construct a MIME message. Django's EmailMessage exposes the raw bytes.
                # However, it's safer to reconstruct it for the Gmail API structure
                
                # Create a MIMEText object based on whether it's HTML or plain text
                # Check if it's an EmailMultiAlternatives with HTML content
                html_body = None
                if hasattr(message, 'alternatives'):
                    for alt_content, alt_type in message.alternatives:
                        if alt_type == 'text/html':
                            html_body = alt_content
                            break
                            
                if html_body:
                    mime_msg = MIMEText(html_body, 'html')
                else:
                    mime_msg = MIMEText(message.body, 'plain')
                    
                mime_msg['To'] = ', '.join(message.to)
                mime_msg['From'] = message.from_email
                mime_msg['Subject'] = message.subject
                
                raw_string = base64.urlsafe_b64encode(mime_msg.as_bytes()).decode()
                raw_message = {'raw': raw_string}

                service.users().messages().send(userId='me', body=raw_message).execute()
                num_sent += 1
                
            return num_sent
            
        except HttpError as error:
            if not self.fail_silently:
                raise error
            return 0
        except Exception as e:
            if not self.fail_silently:
                raise e
            return 0
