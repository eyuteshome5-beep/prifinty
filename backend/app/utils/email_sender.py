import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_verification_email(email_to, code):
    """
    Sends a password reset verification email.
    If SMTP environment variables are set, it sends a real email.
    Otherwise, it simulates sending the email in the console.
    """
    smtp_server = os.environ.get('SMTP_SERVER') or 'smtp.gmail.com'
    smtp_port = int(os.environ.get('SMTP_PORT') or 587)
    smtp_user = os.environ.get('SMTP_USER')
    smtp_password = os.environ.get('SMTP_PASSWORD')

    if not smtp_user or not smtp_password:
        print(f"\n[EMAIL SIMULATION] To: {email_to}")
        print(f"[EMAIL SIMULATION] Your Prefinity AI Verification Code is: {code}")
        print("[EMAIL SIMULATION] Real email not sent because SMTP_USER or SMTP_PASSWORD environment variables are not set.\n")
        return False

    try:
        # Create message container
        msg = MIMEMultipart('alternative')
        msg['Subject'] = "Your Prefinity AI Verification Code"
        msg['From'] = smtp_user
        msg['To'] = email_to

        # Create HTML content
        html = f"""
        <html>
          <body style="font-family: Arial, sans-serif; background-color: #09090b; color: #ffffff; padding: 30px;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #141417; border: 1px solid #27272a; border-radius: 16px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
              <h2 style="color: #a855f7; font-size: 24px; font-weight: bold; margin-bottom: 20px; text-align: center;">🧠 PREFINITY AI</h2>
              <p style="font-size: 16px; color: #a1a1aa; line-height: 1.5;">Hello,</p>
              <p style="font-size: 16px; color: #a1a1aa; line-height: 1.5;">We received a request to reset your password. Use the verification code below to proceed:</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <span style="display: inline-block; background-color: #27272a; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: 6px; padding: 12px 30px; border-radius: 8px; border: 1px solid #a855f7; box-shadow: 0 0 10px rgba(168,85,247,0.2);">{code}</span>
              </div>
              
              <p style="font-size: 14px; color: #71717a; line-height: 1.5; text-align: center;">This code will expire in 15 minutes. If you did not request this, you can safely ignore this email.</p>
              <hr style="border: 0; border-top: 1px solid #27272a; margin: 30px 0;">
              <p style="font-size: 12px; color: #52525b; text-align: center; margin-bottom: 0;">© 2026 Prefinity Recommendations. All rights reserved.</p>
            </div>
          </body>
        </html>
        """

        part2 = MIMEText(html, 'html')
        msg.attach(part2)

        # Connect and send
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, email_to, msg.as_string())
        server.quit()
        print(f"[EMAIL] Successfully sent real email to {email_to}")
        return True
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send real email: {e}")
        return False
