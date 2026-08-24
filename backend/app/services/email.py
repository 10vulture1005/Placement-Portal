import logging
import resend
from app.core.config import settings

logger = logging.getLogger(__name__)

if settings.resend_api_key:
    resend.api_key = settings.resend_api_key

def _is_placeholder_key(key: str | None) -> bool:
    if not key or not key.strip():
        return True
    lowered = key.strip().lower()
    return any(p in lowered for p in ["placeholder", "your-api-key", "your_api_key", "dummy", "example", "re_xxx"])

def send_notification_email(to_email: str, subject: str, message: str, html_content: str | None = None):
    """
    Sends an email notification via Resend.
    If the API key is missing or set to a placeholder, or if the API call fails,
    logs a warning and returns None without raising an exception.
    """
    if _is_placeholder_key(settings.resend_api_key):
        logger.info("Skipping email delivery to %s: RESEND_API_KEY is not configured or is a placeholder.", to_email)
        return None
        
    try:
        res = resend.Emails.send({
            "from": settings.email_from,
            "to": to_email,
            "subject": subject,
            "html": html_content or f"<p>{message}</p>"
        })
        logger.info("Email successfully sent to %s (subject: %s)", to_email, subject)
        return res
    except Exception as e:
        logger.warning("Failed to send email to %s: %s", to_email, e)
        return None

