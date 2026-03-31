from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, ApprovalRequest


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            'id', 'name', 'email', 'phone', 'role', 'is_approved', 'is_verified', 'needs_manual_review',
            'profile_image', 'id_document', 'kyc_score', 'kyc_decision', 'kyc_report',
            'role_classification', 'classification_confidence', 'classification_evidence', 'classification_report',
            'address', 'created_at'
        )
        read_only_fields = (
            'id', 'created_at', 'is_approved', 'is_verified', 'needs_manual_review',
            'kyc_score', 'kyc_decision', 'kyc_report',
            'role_classification', 'classification_confidence', 'classification_evidence', 'classification_report'
        )


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ('name', 'email', 'phone', 'password', 'role', 'address', 'profile_image', 'id_document')

    def validate_role(self, value):
        if value == 'ADMIN':
            raise serializers.ValidationError('Admin accounts cannot be created via registration.')
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def create(self, validated_data):
        password = validated_data.pop('password')
        role = validated_data.get('role', 'CUSTOMER')
        # Customer is always auto-approved, others need admin approval
        validated_data['is_approved'] = (role == 'CUSTOMER')
        # Customers are active immediately, others wait for approval
        if role != 'CUSTOMER':
            validated_data['is_active'] = True  # account exists but not approved
        user = User.objects.create_user(password=password, **validated_data)
        # Create approval request for non-customers
        if role != 'CUSTOMER':
            ApprovalRequest.objects.create(user=user, role=role)
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    role = serializers.ChoiceField(choices=User.Role.choices)

    def validate(self, data):
        user = authenticate(username=data['email'], password=data['password'])

        if not user:
            raise serializers.ValidationError('Invalid email or password.')

        if user.role != data['role']:
            raise serializers.ValidationError(
                f'You are not registered as {data["role"]}. Please use the correct login page.'
            )

        if not user.is_approved:
            raise serializers.ValidationError(
                'Your account is pending admin approval. You will be notified once approved.'
            )

        return {'user': user}


class ApprovalRequestSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = ApprovalRequest
        fields = ('id', 'user', 'role', 'status', 'created_at')
