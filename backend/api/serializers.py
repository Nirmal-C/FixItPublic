from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import MaintenanceTicket

User = get_user_model()


# ── Auth ───────────────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, label='Confirm password')

    class Meta:
        model  = User
        fields = ('username', 'email', 'password', 'password2', 'first_name', 'phone')
        extra_kwargs = {'phone': {'required': False}, 'first_name': {'required': False}}

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
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
        if value == User.Role.CITIZEN:
            raise serializers.ValidationError(
                'Use the public register endpoint for citizen accounts.'
            )
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


# ── Tickets ────────────────────────────────────────────────────────────────────

class TicketListSerializer(serializers.ModelSerializer):
    """
    Used for GET /api/requests/ list responses.

    Exposes every field consumed by the frontend:
      IssueCard / ViewRequestsPage : id, title, category, status, description,
                                     location_description, reporter_name,
                                     created_at, photo, lat, lng
      DashboardPage / TicketsPage  : all of the above + updated_at + crew/escalation
    """
    reporter_name = serializers.SerializerMethodField()

    class Meta:
        model  = MaintenanceTicket
        fields = (
            'id', 'title', 'category', 'status',
            'description', 'location_description',
            'reporter_name', 'photo', 'photo2', 'photo3', 'photo4', 'photo5',
            'lat', 'lng',
            'assigned_crew',
            'escalated', 'escalation_level', 'escalation_note',
            'created_at', 'updated_at',
        )

    def get_reporter_name(self, obj):
        if obj.reporter_user:
            return obj.reporter_user.username
        return obj.reporter_name or None


class TicketDetailSerializer(serializers.ModelSerializer):
    """
    Used for POST /api/requests/ (create) and GET /api/requests/<id>/.

    Includes the full field set so the admin detail panel and the
    public success screen can display everything.
    """
    reporter_display = serializers.SerializerMethodField()

    class Meta:
        model  = MaintenanceTicket
        fields = (
            'id', 'title', 'description', 'category', 'status',
            'location_description', 'photo', 'photo2', 'photo3', 'photo4', 'photo5',
            'lat', 'lng',
            'reporter_name', 'reporter_email', 'reporter_user',
            'reporter_display',
            'assigned_crew',
            'escalated', 'escalation_level', 'escalation_note', 'escalated_at',
            'created_at', 'updated_at',
        )
        read_only_fields = (
            'id', 'status', 'reporter_user', 'created_at', 'updated_at',
            'assigned_crew', 'escalated', 'escalation_level', 'escalation_note', 'escalated_at',
        )

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
    """
    Used by PATCH /api/requests/<id>/status/
    Only the status field is writable; returns id + status so the frontend
    can optimistically update the ticket list without a full refetch.
    """
    class Meta:
        model  = MaintenanceTicket
        fields = ('id', 'status')


class TicketAssignSerializer(serializers.ModelSerializer):
    """
    Used by PATCH /api/requests/<id>/assign/
    Allows admin to update crew assignment and escalation in one call.
    """
    class Meta:
        model  = MaintenanceTicket
        fields = (
            'id', 'assigned_crew',
            'escalated', 'escalation_level', 'escalation_note',
            'escalated_at', 'escalated_by',
        )
        read_only_fields = ('id', 'escalated_at', 'escalated_by')
