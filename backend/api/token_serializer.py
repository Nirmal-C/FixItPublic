from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.exceptions import AuthenticationFailed


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['role']     = user.role
        return token

    def validate(self, attrs):
        User = get_user_model()
        username = attrs.get(self.username_field, '').strip()
        password = attrs.get('password', '')

        # 1. Does the username exist at all?
        try:
            user = User.objects.get(**{self.username_field: username})
        except User.DoesNotExist:
            raise AuthenticationFailed('Username not found. Please check and try again.')

        # 2. Is the password correct?
        if not user.check_password(password):
            raise AuthenticationFailed('Incorrect password. Please try again.')

        # 3. Is the account active?
        if not user.is_active:
            raise AuthenticationFailed('This account has been deactivated. Please contact support.')

        # All checks passed — let the parent generate tokens
        return super().validate(attrs)
