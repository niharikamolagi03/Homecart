# Claude Vision API for Document Verification

## Overview

Your KYC system now uses **Claude Vision API** for real document authentication that can distinguish between:
- ✅ Genuine ID documents
- ✅ Real selfies
- ❌ Random photos
- ❌ Printed images
- ❌ Fake documents

## Why Claude Vision?

Claude's vision capabilities can:
1. **Analyze document structure** - Identify if it's an actual ID document with text, security features, official layout
2. **Detect authenticity** - Spot printed photos, filters, AR effects, poor quality images
3. **Make intelligent judgments** - Not just keyword matching, but actual visual understanding
4. **Verify face authenticity** - Detect if selfie is a real photo vs printed photo of a face

## Setup Instructions

### Step 1: Get Claude API Key

1. Go to **Anthropic Console**: https://console.anthropic.com/
2. Create account / login
3. Navigate to **API Keys**
4. Click "Create Key"
5. Copy the key (looks like: `sk-ant-...`)

### Step 2: Set Environment Variable

```bash
# Option 1: Export in terminal session
export CLAUDE_API_KEY="sk-ant-your-key-here"

# Option 2: Add to .env file in Django project
CLAUDE_API_KEY=sk-ant-your-key-here

# Option 3: Add to Django settings.py
import os
CLAUDE_API_KEY = os.getenv('CLAUDE_API_KEY')
```

### Step 3: Restart Django Server

```bash
cd local_vendors_marketplace
python3 manage.py runserver 8000
```

## How It Works

### Verification Flow

1. **User registers** with selfie + ID document
2. **Authenticate selfie**: Claude analyzes if it's a genuine face photo
   - Checks for: real face, no filters, proper lighting, no printed photos
3. **Authenticate ID**: Claude analyzes if it's genuine ID document
   - Checks for: official layout, text present, security features, not a random photo
4. **Only if both pass**: System proceeds to role classification
5. **If either fails**: Marks as "FAILED AUTHENTICATION" with specific red flags

### Response Example

When you upload a **random photo** as ID:
```json
{
  "classification": "Inconclusive",
  "confidence_score": 0,
  "document_validated": false,
  "authenticity_score": 15,
  "final_verdict": "⚠️ AUTHENTICATION FAILED: This appears to be a random/fake image, not genuine identity verification.",
  "red_flags": [
    "Not a government-issued ID document",
    "Random scene/object detected, not identity document"
  ]
}
```

When you upload a **genuine ID + selfie**:
```json
{
  "classification": "Vendor",
  "confidence_score": 85,
  "document_validated": true,
  "authenticity_score": 92,
  "final_verdict": "✓ AUTHENTIC DOCUMENT: Sufficient evidence detected. Vendor classification appropriate."
}
```

## Pricing

**Free Tier:**
- 100 images/month usage
- Perfect for testing and small deployments

**Claude Pricing** (pay-as-you-go):
- Images: ~$0.0015 per request
- 1000 verifications ≈ $1.50

## Fallback Behavior

If `CLAUDE_API_KEY` is not set:
- System uses Google Vision API (if available)
- Falls back to local image analysis
- Returns lower confidence scores
- Still validates but with reduced accuracy

## Testing

### Test 1: Random Photo as ID
```
1. Register user
2. Upload: Any random photo (sunset, landscape, etc.)
3. Upload: Random photo for ID too
4. Expected: ❌ AUTHENTICATION FAILED
```

### Test 2: Genuine Document
```
1. Register user
2. Upload: Clear selfie of your face
3. Upload: Actual ID document (driver's license, passport)
4. Expected: ✓ PASSED AUTHENTICATION → Role Classification
```

### Test 3: Printed Photo
```
1. Register user
2. Upload: Screenshot/printed photo of a person
3. Upload: Printed/scanned ID document
4. Expected: ❌ AUTHENTICATION FAILED (detected printed photo)
```

## Admin Dashboard Display

In the admin dashboard, each pending approval now shows:

```
📋 Document Verification: ✓ AUTHENTIC (92%)
   [Shows green badge if passed, red if failed]

🔍 Role Classification (AI Physical Evidence)
   Detected: Vendor (87% confidence)
   [Expandable details with full analysis]
```

## Integration with Other Services

You can replace Claude with any vision API:

1. **AWS Rekognition:**
   - Document verification: ✅ Yes (DetectText, AnalyzeDocument)
   - Face detection: ✅ Yes (DetectFaces)
   - Cost: ~$0.001/image

2. **Google Vision API:**
   - Document verification: ✅ Partially (text detection)
   - Face detection: ✅ Yes (SafeSearch)
   - Cost: Free tier + $1.50/k images

3. **Microsoft Azure:**
   - Document verification: ✅ Yes (Document Intelligence)
   - Face detection: ✅ Yes (Face API)
   - Cost: Variable pricing

## Troubleshooting

### "No API key configured"
- Set `CLAUDE_API_KEY` environment variable
- Verify with: `echo $CLAUDE_API_KEY`
- Restart Django server

### "API call failed"
- Check API key is valid
- Verify internet connection
- Check rate limits (free tier: check Anthropic console)
- Check image file size (must be < 20MB)

### "Authentication always fails"
- Try with clear photos
- Ensure lighting is good
- Use actual ID document, not screenshot
- Check Claude API response in Django logs

### Image quality issues
- Minimum resolution: 200x200px
- Maximum: 20MB
- Formats: JPEG, PNG, WebP, GIF
- Supported: EXIF data, transparency

## Next Steps

1. ✅ Get API key from Anthropic
2. ✅ Set `CLAUDE_API_KEY` environment variable
3. ✅ Restart Django server
4. ✅ Test with genuine + fake documents
5. → (Optional) Adjust red flag thresholds: `_validate_with_claude_vision()` method
6. → (Optional) Add SMS alerts on failed authentication
7. → (Optional) Store audit trail of failed attempts

## Support

- **Claude API Docs**: https://docs.anthropic.com/en/docs/vision
- **Django Integration**: See `apps/users/verification.py`
- **Frontend Display**: See `src/app/pages/dashboards/AdminDashboard.tsx`
