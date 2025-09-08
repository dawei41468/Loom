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
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #1f2937;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
            }}
            .container {{
                background: white;
                padding: 50px 40px;
                border-radius: 20px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                margin: 40px auto;
                position: relative;
                overflow: hidden;
            }}
            .container::before {{
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #667eea, #764ba2, #f093fb, #f5576c);
            }}
            .header {{
                text-align: center;
                margin-bottom: 40px;
                position: relative;
            }}
            .logo {{
                width: 80px;
                height: 80px;
                margin: 0 auto 20px;
                display: block;
                filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
                background: linear-gradient(135deg, #667eea 0%, #764ba2);
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 32px;
                font-weight: bold;
                text-decoration: none;
            }}
            .logo img {{
                width: 100%;
                height: 100%;
                border-radius: 16px;
            }}
            .logo-text {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 10px;
                letter-spacing: -0.5px;
            }}
            .app-name {{
                font-size: 32px;
                font-weight: 700;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                margin-bottom: 10px;
                letter-spacing: -0.5px;
            }}
            .tagline {{
                font-size: 16px;
                color: #6b7280;
                margin-bottom: 0;
                font-weight: 400;
            }}
            .invitation-card {{
                background: #f8fafc;
                border-radius: 16px;
                padding: 30px;
                margin: 30px 0;
                border: 1px solid #e5e7eb;
                position: relative;
            }}
            .invitation-card::before {{
                content: '💌';
                position: absolute;
                top: -15px;
                left: 20px;
                background: white;
                padding: 10px;
                border-radius: 50%;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                font-size: 20px;
            }}
            .invitation-text {{
                font-size: 20px;
                margin: 20px 0 25px 0;
                color: #1f2937;
                line-height: 1.5;
            }}
            .inviter-name {{
                color: #667eea;
                font-weight: 600;
                font-size: 24px;
            }}
            .description {{
                font-size: 16px;
                color: #4b5563;
                margin: 25px 0;
                line-height: 1.6;
            }}
            .features {{
                display: flex;
                justify-content: space-around;
                margin: 30px 0;
                text-align: center;
            }}
            .feature {{
                flex: 1;
                padding: 0 10px;
            }}
            .feature-icon {{
                font-size: 28px;
                margin-bottom: 8px;
            }}
            .feature-text {{
                font-size: 14px;
                color: #6b7280;
                font-weight: 500;
            }}
            .cta-button {{
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                text-decoration: none;
                padding: 18px 40px;
                border-radius: 12px;
                font-weight: 600;
                font-size: 16px;
                margin: 30px 0;
                box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
                transition: all 0.3s ease;
                text-align: center;
                min-width: 200px;
            }}
            .cta-button:hover {{
                transform: translateY(-2px);
                box-shadow: 0 12px 28px rgba(102, 126, 234, 0.4);
            }}
            .fallback-link {{
                font-size: 14px;
                color: #6b7280;
                margin-top: 20px;
                word-break: break-all;
                background: #f3f4f6;
                padding: 15px;
                border-radius: 8px;
                border: 1px solid #e5e7eb;
            }}
            .footer {{
                margin-top: 40px;
                padding-top: 30px;
                border-top: 2px solid #f3f4f6;
                font-size: 14px;
                color: #6b7280;
                text-align: center;
                position: relative;
            }}
            .footer::before {{
                content: '';
                position: absolute;
                top: -2px;
                left: 50%;
                transform: translateX(-50%);
                width: 60px;
                height: 2px;
                background: linear-gradient(90deg, #667eea, #764ba2);
            }}
            .highlight {{
                color: #667eea;
                font-weight: 600;
            }}
            .security-note {{
                background: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                font-size: 14px;
                color: #92400e;
            }}
            @media (max-width: 480px) {{
                .container {{
                    padding: 30px 20px;
                    margin: 20px;
                }}
                .features {{
                    flex-direction: column;
                    gap: 20px;
                }}
                .cta-button {{
                    width: 100%;
                    box-sizing: border-box;
                }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">
                    <img src="https://loom.studiodtw.net/icons/loom-logo-192.svg" alt="Loom Logo" onerror="this.parentElement.innerHTML='L'">
                </div>
                <div class="app-name">Loom</div>
                <p class="tagline">Connect and coordinate with your partner</p>
            </div>

            <div class="invitation-card">
                <div class="invitation-text">
                    <span class="inviter-name">{inviter_name}</span> has invited you to join <span class="highlight">Loom</span>!
                </div>

                <div class="description">
                    <strong>Loom</strong> helps couples coordinate their schedules, share events, and stay connected.
                    Accept the invitation to start planning together and never miss an important moment.
                </div>

                <div class="features">
                    <div class="feature">
                        <div class="feature-icon">📅</div>
                        <div class="feature-text">Shared Calendar</div>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">❤️</div>
                        <div class="feature-text">Stay Connected</div>
                    </div>
                    <div class="feature">
                        <div class="feature-icon">🎯</div>
                        <div class="feature-text">Plan Together</div>
                    </div>
                </div>
            </div>

            <div style="text-align: center;">
                <a href="{invitation_link}" class="cta-button">
                    ✨ Accept Invitation
                </a>
            </div>

            <div class="fallback-link">
                <strong>If the button doesn't work:</strong><br>
                Copy and paste this link into your browser:<br>
                <a href="{invitation_link}" style="color: #667eea; word-break: break-all;">{invitation_link}</a>
            </div>

            <div class="security-note">
                <strong>🔒 Security Note:</strong> This invitation is personal and expires in 7 days.
                If you didn't expect this invitation, you can safely ignore this email.
            </div>

            <div class="footer">
                <p>
                    <strong>Loom</strong> - Making coordination effortless for couples<br>
                    Questions? Contact us at <a href="mailto:support@studiodtw.net" style="color: #667eea;">support@studiodtw.net</a>
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