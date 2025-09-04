from typing import Optional
from aiosmtplib import SMTP
from email.message import EmailMessage

from .config import settings


async def send_email(to_email: str, subject: str, body_text: str, body_html: Optional[str] = None) -> bool:
    """Send an email using SMTP settings. Returns True if attempted successfully.
    If SMTP is not configured, returns False gracefully.
    """
    # Use settings directly - these are loaded from .env at runtime
    smtp_host = getattr(settings, 'SMTP_HOST', '')
    email_from = getattr(settings, 'EMAIL_FROM', '')

    if not smtp_host or not email_from:
        return False

    msg = EmailMessage()
    msg["From"] = email_from
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body_text)
    if body_html:
        msg.add_alternative(body_html, subtype="html")

    try:
        # Get SMTP settings with fallbacks
        smtp_port = getattr(settings, 'SMTP_PORT', 587)
        smtp_use_tls = getattr(settings, 'SMTP_USE_TLS', True)
        smtp_username = getattr(settings, 'SMTP_USERNAME', '')
        smtp_password = getattr(settings, 'SMTP_PASSWORD', '')

        # Use implicit TLS if connecting to SMTPS port (465). Otherwise, optionally upgrade via STARTTLS.
        implicit_tls = smtp_port == 465
        async with SMTP(hostname=smtp_host, port=smtp_port, use_tls=implicit_tls) as client:
            if smtp_use_tls and not implicit_tls:
                await client.starttls()
            if smtp_username and smtp_password:
                await client.login(smtp_username, smtp_password)
            await client.send_message(msg)
        return True
    except Exception:
        return False


def create_partnership_invitation_email(inviter_name: str, invitee_email: str, invitation_link: str) -> tuple[str, str]:
    """Create email content for partnership invitation.

    Returns:
        tuple: (subject, html_body)
    """
    subject = f"{inviter_name} invited you to join Loom"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Join Loom</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8f9fa;
            }}
            .container {{
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
            }}
            .logo {{
                font-size: 28px;
                font-weight: bold;
                color: #6366f1;
                margin-bottom: 10px;
            }}
            .invitation-text {{
                font-size: 18px;
                margin: 20px 0;
                color: #374151;
            }}
            .cta-button {{
                display: inline-block;
                background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
                color: white;
                text-decoration: none;
                padding: 16px 32px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                margin: 20px 0;
                box-shadow: 0 4px 14px rgba(99, 102, 241, 0.3);
            }}
            .cta-button:hover {{
                background: linear-gradient(135deg, #5855eb 0%, #7c3aed 100%);
                box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
            }}
            .footer {{
                margin-top: 40px;
                padding-top: 20px;
                border-top: 1px solid #e5e7eb;
                font-size: 14px;
                color: #6b7280;
                text-align: center;
            }}
            .highlight {{
                color: #6366f1;
                font-weight: 600;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">Loom</div>
                <p>Connect and coordinate with your partner</p>
            </div>

            <div class="invitation-text">
                <strong>{inviter_name}</strong> has invited you to join <span class="highlight">Loom</span>!
            </div>

            <p>
                Loom helps couples coordinate their schedules, share events, and stay connected.
                Accept the invitation to start planning together.
            </p>

            <div style="text-align: center;">
                <a href="{invitation_link}" class="cta-button">
                    Accept Invitation
                </a>
            </div>

            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="{invitation_link}" style="color: #6366f1; word-break: break-all;">{invitation_link}</a>
            </p>

            <div class="footer">
                <p>
                    This invitation will expire in 7 days.<br>
                    If you didn't expect this invitation, you can safely ignore this email.
                </p>
            </div>
        </div>
    </body>
    </html>
    """

    return subject, html_body


async def send_partnership_invitation(inviter_name: str, invitee_email: str, invitation_link: str) -> bool:
    """Send a partnership invitation email."""
    subject, html_body = create_partnership_invitation_email(inviter_name, invitee_email, invitation_link)

    # Create plain text version
    text_body = f"""
    {inviter_name} has invited you to join Loom!

    Loom helps couples coordinate their schedules, share events, and stay connected.

    Accept the invitation here: {invitation_link}

    This invitation will expire in 7 days.
    """

    return await send_email(
        to_email=invitee_email,
        subject=subject,
        body_text=text_body.strip(),
        body_html=html_body
    )