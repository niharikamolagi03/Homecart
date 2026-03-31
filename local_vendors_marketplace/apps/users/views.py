from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from drf_spectacular.utils import extend_schema
from .models import User, ApprovalRequest
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer, ApprovalRequestSerializer
from .permissions import IsAdmin
from .verification import RoleClassifier
import json


class RegisterView(APIView):
    permission_classes = [AllowAny]
    parser_classes_override = None  # accept multipart for image uploads

    def post(self, request):
        from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
        # Support both JSON (customer) and multipart (vendor/shopkeeper/delivery)
        role = request.data.get('role', 'CUSTOMER').upper()
        needs_verification = role in ('VENDOR', 'SHOPKEEPER', 'DELIVERY')

        # ── AI Verification for non-customer roles ────────────────────────────
        ai_score = None
        if needs_verification:
            selfie = request.FILES.get('selfie')
            id_document = request.FILES.get('id_document')

            if not selfie or not id_document:
                return Response(
                    {'error': 'Selfie and ID document are required for Vendor, Shopkeeper, and Delivery Partner registration.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            ai_score = self._run_ai_verification(selfie, id_document)

        # ── Create user ───────────────────────────────────────────────────────
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # ── Apply AI result ───────────────────────────────────────────────────
        if needs_verification and ai_score is not None:
            decision = 'REAL' if ai_score >= 0.9 else 'SUSPICIOUS'
            report = self._generate_kyc_report(ai_score, id_document)

            # ── Classify role based on image context ─────────────────────────
            try:
                classification_result = RoleClassifier.classify_role(selfie, id_document)
                classification_json = RoleClassifier.to_json(classification_result)
            except Exception as e:
                classification_result = {
                    'classification': 'Inconclusive',
                    'confidence_score': 0,
                    'evidence_found': [],
                    'red_flags': [str(e)],
                    'final_verdict': f'Classification failed: {str(e)}',
                    'document_validated': False,
                    'authenticity_score': 0
                }
                classification_json = RoleClassifier.to_json(classification_result)

            # include classification and authenticity info in KYC report text
            report = self._generate_kyc_report(ai_score, id_document, classification_result)

            user.kyc_score = ai_score
            user.kyc_decision = decision
            user.kyc_report = report
            user.id_document = id_document
            if selfie is not None:
                user.profile_image = selfie

            # Store classification result
            user.role_classification = classification_result.get('classification', 'Inconclusive')
            user.classification_confidence = classification_result.get('confidence_score', 0)
            user.classification_evidence = json.dumps(classification_result.get('evidence_found', []))
            user.classification_report = classification_json

            if ai_score >= 0.9:
                # High confidence — verified, still needs admin approval for role
                user.is_verified = True
                user.needs_manual_review = False
                message = f'Account created. Identity verified (score: {ai_score:.2f}). Role classification: {user.role_classification} ({user.classification_confidence}% confidence). Awaiting admin approval.'
            else:
                # Low confidence — flag for manual review
                user.is_verified = False
                user.needs_manual_review = True
                message = f'Account created. Identity verification inconclusive (score: {ai_score:.2f}). Flagged for manual admin review.'

            user.save(update_fields=['kyc_score', 'kyc_decision', 'kyc_report', 'id_document', 'is_verified', 'needs_manual_review',
                                     'role_classification', 'classification_confidence', 'classification_evidence', 'classification_report', 'profile_image'])
        else:
            message = 'Account created successfully. Please login.' if role == 'CUSTOMER' else 'Account created. Awaiting admin approval.'

        return Response({
            'message': message,
            'pending': not user.is_approved,
            'is_verified': user.is_verified,
            'needs_manual_review': user.needs_manual_review,
            'ai_score': round(ai_score, 3) if ai_score is not None else None,
            'role_classification': user.role_classification if hasattr(user, 'role_classification') else None,
            'classification_confidence': user.classification_confidence if hasattr(user, 'classification_confidence') else None,
        }, status=status.HTTP_201_CREATED)
    def _run_ai_verification(self, selfie, id_document) -> float:
        """
        AI identity verification.

        TO INTEGRATE A REAL API:
        Replace this method body with your chosen provider:

        Option A — HyperVerge:
            import requests
            files = {'selfie': selfie, 'id': id_document}
            headers = {'appId': 'YOUR_APP_ID', 'appKey': 'YOUR_APP_KEY'}
            r = requests.post('https://ind.idv.hyperverge.co/v1/checkLiveness', files=files, headers=headers)
            return r.json()['result']['details']['match']['confidence']

        Option B — AWS Rekognition face comparison:
            import boto3
            client = boto3.client('rekognition')
            response = client.compare_faces(
                SourceImage={'Bytes': selfie.read()},
                TargetImage={'Bytes': id_document.read()},
            )
            return response['FaceMatches'][0]['Similarity'] / 100 if response['FaceMatches'] else 0.0

        For now, returns a simulated score based on file presence and size.
        """
        import random
        # Simulate: if both files are present and non-trivial size, high confidence
        selfie_ok = selfie.size > 5000
        id_ok = id_document.size > 5000
        if selfie_ok and id_ok:
            return round(random.uniform(0.88, 0.98), 3)  # mostly passes
        return round(random.uniform(0.5, 0.75), 3)  # small/corrupt files → low score

    def _generate_kyc_report(self, score, id_document, classification_result=None) -> str:
        # Example report generator with explicit certainty and clear conclusion.
        id_quality = 'high-quality ID document' if id_document and getattr(id_document, 'size', 0) > 5000 else 'low-quality or missing ID document'
        if classification_result is not None and classification_result.get('document_validated') is True:
            nlp_decision = 'Genuine ID detected. High confidence (>=90%).'
            action = 'Approve automatically, then manual verification optional.'
        elif classification_result is not None and classification_result.get('document_validated') is False:
            nlp_decision = 'Authentication failed based on detailed validation checks.'
            action = 'Reject or request the user to re-upload a genuine ID and selfie.'
        elif score >= 0.90:
            nlp_decision = 'Genuine ID detected. High confidence (>=90%).'
            action = 'Approve automatically, then manual verification optional.'
        elif score >= 0.80:
            nlp_decision = 'Likely genuine ID, moderate confidence (80-90%).'
            action = 'Require admin manual verification before approval.'
        else:
            nlp_decision = 'ID mismatch / possibly fraudulent (score <80%).'
            action = 'Reject or request re-upload with better quality documents.'

        details = [
            f"KYC Report:",
            f"  - Face-ID similarity score: {score:.2f}",
            f"  - Document quality: {id_quality}",
            f"  - Conclusion: {nlp_decision}",
            f"  - Recommendation: {action}",
        ]

        if classification_result:
            document_validated = classification_result.get('document_validated', False)
            authenticity_score = classification_result.get('authenticity_score', 0)
            final_verdict = classification_result.get('final_verdict', '')
            classified_role = classification_result.get('classification', 'Inconclusive')
            role_confidence = classification_result.get('confidence_score', 0)
            red_flags = classification_result.get('red_flags', [])
            evidence = classification_result.get('evidence_found', [])

            # If status says validation failed but AI score is strong, make this explicit.
            if not document_validated and score >= 0.85:
                details.append('  - Note: High face similarity but document/user authenticity not confirmed. Please re-check document.')

            details.extend([
                f"  - Document validated: {document_validated}",
                f"  - Authenticity score: {authenticity_score}",
                f"  - Role classification: {classified_role} ({role_confidence}% confidence)",
                f"  - Final verdict: {final_verdict}",
                f"  - Red flags: {', '.join(red_flags) if red_flags else 'None'}",
                f"  - Evidence found: {', '.join(evidence) if evidence else 'None'}",
            ])

        details.append("  - Remark: Verification is based on AI model comparison; follow internal audit process for final proof.")
        return "\n".join(details)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'role': user.role,
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            token = RefreshToken(request.data.get('refresh'))
            token.blacklist()
            return Response({'message': 'Logged out successfully'})
        except TokenError:
            return Response({'error': 'Invalid token'}, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    queryset = User.objects.all()


class PendingUsersView(generics.ListAPIView):
    serializer_class = ApprovalRequestSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return ApprovalRequest.objects.filter(status='PENDING').select_related('user')


class ApproveUserView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, user_id):
        try:
            approval = ApprovalRequest.objects.get(user_id=user_id)
        except ApprovalRequest.DoesNotExist:
            return Response({'error': 'Approval request not found'}, status=status.HTTP_404_NOT_FOUND)
        approval.status = 'APPROVED'
        approval.save()
        approval.user.is_approved = True
        approval.user.save()
        return Response({'message': f'{approval.user.name} approved successfully.'})


class RejectUserView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request, user_id):
        try:
            approval = ApprovalRequest.objects.get(user_id=user_id)
        except ApprovalRequest.DoesNotExist:
            return Response({'error': 'Approval request not found'}, status=status.HTTP_404_NOT_FOUND)
        approval.status = 'REJECTED'
        approval.save()
        approval.user.is_approved = False
        approval.user.save()
        return Response({'message': f'{approval.user.name} rejected.'})
