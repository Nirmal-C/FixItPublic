from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import MaintenanceTicket

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, label='Confirm password')

    class Meta:
        model  = User
        fields = ('username', 'email', 'password', 'password2', 'phone')
        extra_kwargs = {'phone': {'required': False}}

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            phone=validated_data.get('phone', ''),
            role=User.Role.CITIZEN,
        )


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ('id', 'username', 'email', 'role', 'phone', 'date_joined')
        read_only_fields = ('id', 'role', 'date_joined')


class AdminUserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ('id', 'username', 'email', 'role', 'phone', 'is_active', 'date_joined')
        read_only_fields = ('id', 'date_joined')


class CreateAdminSerializer(serializers.ModelSerializer):
    """Superuser-only: create a new admin or superuser account."""
    password  = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, label='Confirm password')

    class Meta:
        model  = User
        fields = ('username', 'email', 'password', 'password2', 'phone', 'role')
        extra_kwargs = {'phone': {'required': False}}

    def validate_role(self, value):
        # Superusers can only create admins or other superusers — not citizens via this endpoint
        if value == User.Role.CITIZEN:
            raise serializers.ValidationError('Use the public register endpoint for citizen accounts.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            phone=validated_data.get('phone', ''),
            role=validated_data['role'],
        )


class TicketListSerializer(serializers.ModelSerializer):
    reporter_display = serializers.SerializerMethodField()

    class Meta:
        model  = MaintenanceTicket
        fields = (
            'id', 'title', 'category', 'status',
            'location_description', 'reporter_display',
            'created_at', 'updated_at',
        )

    def get_reporter_display(self, obj):
        if obj.reporter_user:
            return obj.reporter_user.username
        return obj.reporter_name or 'Anonymous'


class TicketDetailSerializer(serializers.ModelSerializer):
    reporter_display = serializers.SerializerMethodField()

    class Meta:
        model  = MaintenanceTicket
        fields = (
            'id', 'title', 'description', 'category', 'status',
            'location_description', 'photo',
            'reporter_name', 'reporter_email', 'reporter_user',
            'reporter_display', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'status', 'reporter_user', 'created_at', 'updated_at')

    def get_reporter_display(self, obj):
        if obj.reporter_user:
            return obj.reporter_user.username
        return obj.reporter_name or 'Anonymous'

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['reporter_user'] = request.user
        return super().create(validated_data)


class TicketStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model  = MaintenanceTicket
        fields = ('id', 'status')