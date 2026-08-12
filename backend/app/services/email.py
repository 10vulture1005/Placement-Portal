import resend
from app.core.config import settings

resend.api_key = settings.resend_api_key

def send_notification_email(to_email: str, subject: str, message: str, html_content: str = None):
    if not settings.resend_api_key:
        print(f"Skipping email to {to_email}: No RESEND_API_KEY")
        return
        
    try:
        res = resend.Emails.send({
            "from": settings.email_from,
            "to": to_email,
            "subject": subject,
            "html": html_content or f"<p>{message}</p>"
        })
        return res
    except Exception as e:
        print(f"Error sending email: {e}")
        return None
