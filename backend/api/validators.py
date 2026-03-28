import re
from django.core.exceptions import ValidationError


class PasswordComplexityValidator:
    """
    Enforces that passwords contain at least one uppercase letter,
    one digit, and one special character.
    Applied via AUTH_PASSWORD_VALIDATORS — runs automatically whenever
    validate_password() is called (registration, password change, admin create).
    """

    SPECIAL = r'[!@#$%^&*()\-_=+\[\]{}|;:\'",.<>?/`~\\]'

    def validate(self, password, user=None):
        errors = []
        if not re.search(r'[A-Z]', password):
            errors.append('at least one uppercase letter (A–Z)')
        if not re.search(r'[0-9]', password):
            errors.append('at least one number (0–9)')
        if not re.search(self.SPECIAL, password):
            errors.append('at least one special character (!@#$%^&*…)')
        if errors:
            raise ValidationError(
                f'Password must contain {", ".join(errors)}.',
                code='password_complexity',
            )

    def get_help_text(self):
        return (
            'Your password must contain at least one uppercase letter, '
            'one number, and one special character.'
        )
