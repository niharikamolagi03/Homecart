# KYC/ID Verification System - Quick Setup Guide

## System Architecture

Your KYC verification system now includes:

### 📊 Backend Components
1. **Role Classifier** (`apps/users/verification.py`)
   - Analyzes selfie + ID document for role detection
   - Supports Google Vision API for enhanced detection
   - Falls back to local analysis if API unavailable

2. **Database Fields** (`apps/users/models.py`)
   - `kyc_score` - Face similarity score (0-1.0)
   - `kyc_decision` - REAL / SUSPICIOUS / PENDING
   - `kyc_report` - Face verification text report
   - `role_classification` - Vendor / Shopkeeper / Delivery Personnel / Inconclusive  
   - `classification_confidence` - Confidence % (0-100)
   - `classification_evidence` - JSON array of detected evidence
   - `classification_report` - Full JSON report with verdict

3. **Registration Flow** (`apps/users/views.py`)
   - Accepts multipart: selfie + id_document
   - Runs AI verification on both images
   - Stores all analysis results
   - Returns complete classification to frontend

### 🖥️ Frontend Components
1. **Admin Dashboard** (`src/app/pages/dashboards/AdminDashboard.tsx`)
   - Pending approvals list with card view
   - Full image previews (selfie + ID)
   - Expandable KYC Verification Report
   - Expandable Role Classification card with evidence tags
   - Scrollable report areas for complete visibility

## 🚀 How to Enable Google Vision API

### Quick Steps:

1. **Get API Key**
   - Go to https://console.cloud.google.com/
   - Create new project
   - Enable Vision API
   - Create API Key

2. **Set Environment Variable**
   ```bash
   export GOOGLE_VISION_API_KEY="your-key-here"
   ```

3. **Restart Server**
   ```bash
   python3 manage.py runserver 8000
   ```

That's it! The system will automatically use Google Vision for enhanced classification.

## 📋 Test Workflow

1. **Register as Vendor/Shopkeeper/Delivery**
   - Visit: http://localhost:5178/register
   - Upload selfie (ideally with background context)
   - Upload ID document
   - Select role: VENDOR, SHOPKEEPER, or DELIVERY

2. **Check API Response**
   - See `kyc_score`, `role_classification`, `classification_confidence`
   - Example: `"role_classification": "Vendor"`, `"classification_confidence": 85`

3. **Admin Approval**
   - Login as admin
   - Go to "Pending Approvals"
   - See card with:
     - Selfie image
     - ID document image
     - KYC Score badge
     - Expandable "KYC Verification Report"
     - Expandable "Role Classification (AI Physical Evidence)" with full report and evidence tags

4. **Make Decision**
   - Review all evidence
   - Click "Approve" or "Reject"

## 🔍 What Gets Detected

### Without Google Vision (Local Analysis):
- Image quality score
- File size/format checks
- Basic brightness assessment

### With Google Vision (Full Detection):
- **Objects**: scales, POS systems, delivery bags, thermal bags, shelving
- **Text**: ID document text, storefront signs, company names
- **Context**: shop environment, market stall, delivery bike
- **Red Flags**: multiple faces, blur, filters, poor lighting, torn documents

## 📌 Report Output Format

```json
{
  "classification": "Vendor",
  "confidence_score": 85,
  "evidence_found": [
    "Google Vision: cash register",
    "Google Vision: business signage",
    "clear environment",
    "good lighting conditions"
  ],
  "red_flags": [],
  "final_verdict": "Role clearly matches Vendor based on visible evidence in image."
}
```

## 🛠️ Custom API Integration

To use AWS Rekognition, Azure, or Claude instead of Google Vision:

1. Modify `_analyze_with_vision_api()` in `apps/users/verification.py`
2. Keep the same return format JSON structure
3. No frontend code changes needed!

## 📱 Currently Running Servers

- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:5178

## ❓ Troubleshooting

**Reports not showing fully?**
- Clickable expand button in blue card
- Scrollable areas with `max-h-96` constraint
- Font is monospace for better readability

**Classification missing?**
- Check GOOGLE_VISION_API_KEY environment variable
- System gracefully falls back to local analysis
- Check browser console for errors

**Images not uploading?**
- Ensure registration form accepts multipart/form-data
- Selfie and ID document both required
- Check file size limits

## 🎯 Next Steps

1. ✅ Core system deployed
2. ✅ Google Vision API ready (just needs API key)
3. ✅ Admin dashboard with full visibility
4. → Optional: Set up real API key for production
5. → Optional: Add SMS/email notifications on approval
6. → Optional: Implement bulk KYC processing

## 📞 Support

- Backend: Django REST Framework
- Frontend: React + TypeScript
- Vision: Pluggable (Google/AWS/Azure/Claude)
- Database: SQLite (dev), PostgreSQL (production)
