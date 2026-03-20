from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from .models import MaintenanceTicket

User = get_user_model()


# ── Auth ────────────────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, label='Confirm password')

    class Meta:
        model  = User
        fields = ('username', 'email', 'password', 'password2', 'first_name', 'phone', 'email_notifications')
        extra_kwargs = {
            'phone':               {'required': False},
            'first_name':          {'required': False},
            'email_notifications': {'required': False},
        }

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
            email_notifications=validated_data.get('email_notifications', False),
        )


class UserProfileSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = (
            'id', 'username', 'first_name', 'last_name',
            'email', 'role', 'phone', 'email_notifications',
            'avatar', 'avatar_url', 'date_joined',
        )
        read_only_fields = ('id', 'role', 'date_joined', 'avatar')

    def get_avatar_url(self, obj):
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None

    def validate_email(self, value):
        user = self.instance
        if user and User.objects.exclude(pk=user.pk).filter(email__iexact=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value.lower()

    def validate_username(self, value):
        user = self.instance
        if user and User.objects.exclude(pk=user.pk).filter(username__iexact=value).exists():
            raise serializers.ValidationError('A user with this username already exists.')
        return value


class AdminUserSerializer(serializers.ModelSerializer):
    ticket_count = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ('id', 'username', 'email', 'role', 'phone', 'email_notifications',
                  'is_active', 'date_joined', 'ticket_count')
        read_only_fields = ('id', 'date_joined', 'ticket_count')

    def get_ticket_count(self, obj):
        """Number of tickets this user has submitted — useful in the admin user list."""
        return obj.tickets.count()


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


# ── Tickets ─────────────────────────────────────────────────────────────────────

class TicketListSerializer(serializers.ModelSerializer):
    """
    Used for GET /api/requests/ list responses.
    reporter_name resolves to username for authenticated reporters
    so the admin list can always show a human-readable name.
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
            'cultural_flag', 'cultural_site',
            'created_at', 'updated_at',
        )

    def get_reporter_name(self, obj):
        if obj.reporter_user:
            return obj.reporter_user.username
        return obj.reporter_name or None


class TicketDetailSerializer(serializers.ModelSerializer):
    """
    Used for POST /api/requests/ (create) and GET /api/requests/<id>/.
    Includes the full field set plus a resolved reporter display name.
    """
    reporter_display = serializers.SerializerMethodField()
    reporter_email   = serializers.SerializerMethodField()

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
            'cultural_flag', 'cultural_site',
            'created_at', 'updated_at',
        )
        read_only_fields = (
            'id', 'status', 'reporter_user', 'created_at', 'updated_at',
            'assigned_crew', 'escalated', 'escalation_level', 'escalation_note', 'escalated_at',
            'cultural_flag', 'cultural_site',
        )

    def get_reporter_display(self, obj):
        if obj.reporter_user:
            return obj.reporter_user.username
        return obj.reporter_name or 'Anonymous'

    def get_reporter_email(self, obj):
        """
        Return reporter email only to admin/superuser callers.
        Public callers get None to protect reporter privacy.
        """
        request = self.context.get('request')
        if request and request.user.is_authenticated and getattr(request.user, 'is_council_admin', False):
            if obj.reporter_user:
                return obj.reporter_user.email
            return obj.reporter_email
        return None

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['reporter_user'] = request.user
        return super().create(validated_data)


class MapTicketSerializer(serializers.ModelSerializer):
    """
    Minimal serializer for GET /api/map/ — public-safe.
    Omits reporter PII entirely; only exposes what the map pins need.
    """
    class Meta:
        model  = MaintenanceTicket
        fields = (
            'id', 'title', 'category', 'status',
            'description', 'location_description',
            'lat', 'lng',
            'escalated',
            'created_at',
        )


class TicketStatusSerializer(serializers.ModelSerializer):
    """
    PATCH /api/requests/<id>/status/
    Validates that the requested transition is legal before saving.
    """
    VALID_TRANSITIONS = {
        'pending':     {'in_progress', 'closed'},
        'in_progress': {'resolved', 'closed'},
        'resolved':    {'closed'},
        'closed':      set(),
    }

    class Meta:
        model  = MaintenanceTicket
        fields = ('id', 'status')

    def validate_status(self, value):
        current = self.instance.status if self.instance else None
        if current and value not in self.VALID_TRANSITIONS.get(current, set()):
            allowed = ', '.join(self.VALID_TRANSITIONS.get(current, [])) or 'none'
            raise serializers.ValidationError(
                f"Cannot transition from '{current}' to '{value}'. "
                f"Allowed next statuses: {allowed}."
            )
        return value


class TicketAssignSerializer(serializers.ModelSerializer):
    """
    PATCH /api/requests/<id>/assign/
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


class AILogSerializer(serializers.ModelSerializer):
    """Read-only serializer for real GPT-4o AILog entries shown on the admin AI Log page."""
    ticket_id = serializers.IntegerField(source='ticket.id',    read_only=True)
    category  = serializers.CharField(source='ticket.category', read_only=True)

    class Meta:
        from .models import AILog
        model  = AILog
        fields = (
            'id', 'ticket_id', 'category',
            'assigned_crew', 'escalated', 'escalation_level', 'escalation_note',
            'summary', 'decision', 'reasoning', 'confidence', 'status', 'model',
            'created_at',
        )
