# Google Vision API Setup Guide

## Prerequisites

To enable AI-powered image analysis with Google Vision API, follow these steps:

### 1. Create a Google Cloud Project

- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Create a new project or select existing one
- Enable the **Vision API**:
  - Navigate to APIs & Services > Library
  - Search for "Vision API"
  - Click "Enable"

### 2. Create API Key

- Go to APIs & Services > Credentials
- Click "Create Credentials" > "API Key"
- Copy the API key

### 3. Set Environment Variable

Add to your `.env` file or export in terminal:

```bash
export GOOGLE_VISION_API_KEY="your-api-key-here"
```

Or add to `local_vendors_marketplace/core/settings.py`:

```python
import os
GOOGLE_VISION_API_KEY = os.getenv('GOOGLE_VISION_API_KEY')
```

### 4. Test the API

Once configured, Google Vision will automatically:
- Detect labels (objects, places, activities)
- Extract text from images (OCR)
- Identify business contexts (POS systems, delivery equipment, etc.)

The classification will be enhanced with real visual evidence instead of simulated data.

## API Costs

- First 1,000 requests/month are free
- Standard pricing: $1.50 per 1,000 requests afterward
- See [Vision API Pricing](https://cloud.google.com/vision/pricing)

## Alternative APIs

If Google Vision is unavailable, the system gracefully falls back to local image analysis.

### Other Options:
- **AWS Rekognition**: Higher accuracy, ~$1 per 1,000 requests
- **Azure Computer Vision**: Good OCR, ~$1-2 per 1,000 requests
- **Claude Vision API**: Multimodal understanding, can analyze context

## Expected Improvements with Vision API

Once configured, reports will include:
- ✅ Detected business objects (scales, POS systems, delivery bags)
- ✅ Text extracted from ID documents
- ✅ Environmental context (shop shelves, market stalls, delivery bikes)
- ✅ Confidence scores based on real visual evidence
- ✅ Red flags (poor quality, multiple faces, document issues)

## Integration in Code

The integration happens automatically in:
- `apps/users/views.py` - RegisterView calls RoleClassifier
- `apps/users/verification.py` - _analyze_with_vision_api() method
- Frontend admin dashboard displays full results

No code changes needed - just set the environment variable!
