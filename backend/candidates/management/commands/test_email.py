from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings

class Command(BaseCommand):
    help = 'Test email configuration'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, help='Email to send test to', default='test@example.com')

    def handle(self, *args, **options):
        email_to = options['email']
        
        self.stdout.write(f"Testing email configuration...")
        self.stdout.write(f"EMAIL_HOST_USER: {settings.EMAIL_HOST_USER}")
        self.stdout.write(f"EMAIL_HOST: {settings.EMAIL_HOST}")
        self.stdout.write(f"EMAIL_PORT: {settings.EMAIL_PORT}")
        self.stdout.write(f"EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
        self.stdout.write(f"EMAIL_HOST_PASSWORD: {'SET' if settings.EMAIL_HOST_PASSWORD else 'NOT SET'}")
        
        try:
            result = send_mail(
                'HireIQ Test Email',
                'This is a test email from HireIQ system to verify email configuration.',
                settings.EMAIL_HOST_USER,
                [email_to],
                fail_silently=False,
            )
            self.stdout.write(
                self.style.SUCCESS(f'✅ Email sent successfully to {email_to}! Result: {result}')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Failed to send email: {e}')
            )
            import traceback
            traceback.print_exc()
