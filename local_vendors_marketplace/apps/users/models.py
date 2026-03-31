from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'ADMIN')
        extra_fields.setdefault('is_approved', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        CUSTOMER = 'CUSTOMER', 'Customer'
        VENDOR = 'VENDOR', 'Vendor'
        SHOPKEEPER = 'SHOPKEEPER', 'Shopkeeper'
        DELIVERY = 'DELIVERY', 'Delivery Partner'

    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    profile_image = models.ImageField(upload_to='profiles/', null=True, blank=True)
    id_document = models.ImageField(upload_to='id_documents/', null=True, blank=True)
    address = models.TextField(blank=True, default='')
    is_approved = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)  # AI identity verification passed
    needs_manual_review = models.BooleanField(default=False)  # AI score < 0.9, flagged for admin
    kyc_score = models.FloatField(null=True, blank=True)
    kyc_decision = models.CharField(max_length=20, choices=[('PENDING', 'Pending'), ('REAL', 'Real'), ('SUSPICIOUS', 'Suspicious')], default='PENDING')
    kyc_report = models.TextField(null=True, blank=True)
    role_classification = models.CharField(max_length=30, null=True, blank=True)
    classification_confidence = models.IntegerField(null=True, blank=True)
    classification_evidence = models.TextField(null=True, blank=True)
    classification_report = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name', 'phone']

    def __str__(self):
        return f"{self.name} ({self.role})"


class ApprovalRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        APPROVED = 'APPROVED', 'Approved'
        REJECTED = 'REJECTED', 'Rejected'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='approval_request')
    role = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.name} - {self.role} - {self.status}"
