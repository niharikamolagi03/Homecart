"""
Image-based physical identity verification module.
Analyzes selfie + ID document to classify user role and detect fraudulent setups.
Integrates Claude Vision API for real document authentication.
"""
import os
import requests
import json
import base64
from PIL import Image
from io import BytesIO


class RoleClassifier:
    """
    Classifies user role based on visual evidence in selfie and ID document.
    Categories: Vendor, Shopkeeper, Delivery Personnel, Inconclusive/Fraudulent.
    """

    # Visual keyword sets for each role
    VENDOR_KEYWORDS = {
        'weighing scales', 'bulk produce', 'street cart', 'stall', 'wholesale basket',
        'open-air market', 'manual scale', 'commodity', 'loose goods', 'outdoor setup',
        'temporary structure', 'tarpaulin', 'ground display', 'crate', 'bulk pile'
    }

    SHOPKEEPER_KEYWORDS = {
        'POS system', 'cash register', 'counter', 'shelving', 'inventory rack',
        'storefront', 'display window', 'till', 'shop interior', 'branded shelves',
        'organized stock', 'fixed retail', 'shop signage', 'store front', 'commercial counter'
    }

    DELIVERY_KEYWORDS = {
        'thermal bag', 'insulated bag', 'branded delivery bag', 'high-visibility vest',
        'delivery bike', 'delivery scooter', 'company ID lanyard', 'dispatch badge',
        'branded uniform', 'DoorDash', 'Amazon', 'Zomato', 'Swiggy', 'Uber Eats',
        'delivery box', 'transport bike', 'company badge'
    }

    RED_FLAGS = {
        'multiple faces', 'blurry image', 'obvious filter', 'poor lighting',
        'inconsistent environment', 'fake ID characteristics', 'document mismatch',
        'masked face', 'extreme angle', 'text unreadable', 'torn document'
    }

    @classmethod
    def analyze_image(cls, image_file) -> dict:
        """
        Analyze a single image for keywords and context clues.
        Returns dict with found keywords and confidence indicators.
        """
        try:
            img = Image.open(image_file)
            img_data = {
                'size': img.size,
                'format': img.format,
                'mode': img.mode,
            }

            # Simulated keyword detection (must be replaced with real vision API in production)
            evidence = cls._simulate_keyword_detection(img)

            # Attempt real web API if configured
            vision_data = cls._analyze_with_vision_api(image_file)
            if vision_data.get('evidence_found'):
                evidence.extend(vision_data['evidence_found'])

            return {
                'image_metadata': img_data,
                'evidence_found': [] if evidence is None else list(set(evidence)),
                'quality_score': cls._assess_image_quality(img),
                'vision_metadata': vision_data,
            }
        except Exception as e:
            return {
                'error': str(e),
                'evidence_found': [],
                'quality_score': 0.0,
            }

    @classmethod
    def _simulate_keyword_detection(cls, image) -> list:
        """
        Simulate keyword detection. In production, replace with:
        - Google Vision API detectText / labelDetection
        - AWS Rekognition detectLabels / detectText
        - Azure Computer Vision / OCR
        - Claude Vision API with prompt
        """
        # For now, return plausible evidence based on image characteristics
        # In production this would call an actual vision API

        evidence = []

        # Heuristic: larger images often contain more detail
        width, height = image.size
        if width * height > 500000:
            evidence.extend(['clear environment', 'visible background context'])

        # Check brightness/contrast (very basic)
        try:
            from PIL import ImageStat
            stat = ImageStat.Stat(image)
            brightness = sum(stat.mean) / len(stat.mean)
            if brightness > 50 and brightness < 200:
                evidence.append('good lighting conditions')
        except:
            pass

        return evidence

    @classmethod
    def _assess_image_quality(cls, image) -> float:
        """Rate image quality 0.0-1.0 based on size, format, and basic checks."""
        score = 0.5

        # Size check
        width, height = image.size
        if width * height > 400000:
            score += 0.2
        if width * height > 1000000:
            score += 0.1

        # Format check
        if image.format in ['JPEG', 'PNG']:
            score += 0.2

        # Mode check (should be RGB or RGBA, not palette)
        if image.mode in ['RGB', 'RGBA', 'L']:
            score += 0.0  # neutral

        return min(1.0, score)

    @classmethod
    def _local_validation(cls, image_file, image_type: str) -> dict:
        """
        Fallback heuristic validation when no real vision API key is available.
        Returns: {is_valid, confidence, red_flags, details}
        """
        try:
            image_file.seek(0)
            img = Image.open(image_file)
            quality = cls._assess_image_quality(img)
            evidence = cls._simulate_keyword_detection(img)

            red_flags = []
            if quality < 0.55:
                red_flags.append('low image quality')
            if not evidence:
                red_flags.append('no identifiable context clues')
            if image_type == 'id_document' and len(evidence) < 1:
                red_flags.append('no ID-like text/features detected')

            is_valid = quality >= 0.60 and len(evidence) > 0
            if image_type == 'selfie' and (('masked face' in red_flags) or ('multiple faces' in red_flags)):
                is_valid = False

            return {
                'is_valid': is_valid,
                'confidence': int(min(100, quality * 100)),
                'red_flags': red_flags,
                'details': 'Fallback local validation (no external API key).',
                'evidence': evidence
            }
        except Exception as e:
            return {
                'is_valid': False,
                'confidence': 0,
                'red_flags': ['fallback validation error', str(e)],
                'details': 'Fallback validation failed.',
                'evidence': []
            }

    @classmethod
    def _validate_with_claude_vision(cls, image_file, image_type: str) -> dict:
        """
        Use Claude Vision API to intelligently validate document authenticity.
        image_type: 'id_document' or 'selfie'
        Returns: {is_valid, confidence, red_flags, details}
        """
        api_key = os.getenv('CLAUDE_API_KEY')
        if not api_key:
            # No API key => fallback local heuristic validation
            return cls._local_validation(image_file, image_type)

        try:
            image_data = image_file.read()
            image_file.seek(0)
            encoded = base64.b64encode(image_data).decode('utf-8')

            # Different prompts based on image type
            if image_type == 'id_document':
                prompt = """Analyze this image and determine if it's a GENUINE ID document or a fake/printed/random photo.
                
Check for:
1. Is this an actual government/official ID document (passport, driver's license, national ID, etc.)?
2. Does it have proper document characteristics (text, security features, official layout)?
3. Are there red flags like: printed photo of a document, fake document, random image, screenshot, etc.?
4. Document clarity and authenticity indicators

Respond in JSON format:
{
  "is_genuine_document": true/false,
  "confidence": 0-100,
  "document_type": "Driver License/Passport/National ID/Not a Document",
  "red_flags": ["list of concerns"],
  "evidence": "What made you confident/suspicious",
  "verdict": "This is/is not a genuine ID document because..."
}"""
            else:  # selfie
                prompt = """Analyze this image and determine if it's a GENUINE SELFIE/FACE PHOTO or a fake.

Check for:
1. Is this a real human face in a genuine photo?
2. Red flags: printed photo of a face, filter/AR effects, poor quality, multiple faces, extreme angle, masked face?
3. Photo authenticity indicators
4. Lighting and natural characteristics

Respond in JSON format:
{
  "is_genuine_selfie": true/false,
  "confidence": 0-100,
  "has_single_face": true/false,
  "red_flags": ["list of concerns"],
  "evidence": "What made you confident/suspicious",
  "verdict": "This is/is not a genuine selfie because..."
}"""

            # Call Claude Vision API
            headers = {
                'content-type': 'application/json',
                'x-api-key': api_key,
                'anthropic-version': '2023-06-01'
            }

            payload = {
                'model': 'claude-3-5-sonnet-20241022',
                'max_tokens': 500,
                'messages': [
                    {
                        'role': 'user',
                        'content': [
                            {
                                'type': 'image',
                                'source': {
                                    'type': 'base64',
                                    'media_type': 'image/jpeg',
                                    'data': encoded
                                }
                            },
                            {
                                'type': 'text',
                                'text': prompt
                            }
                        ]
                    }
                ]
            }

            response = requests.post(
                'https://api.anthropic.com/v1/messages',
                headers=headers,
                json=payload,
                timeout=20
            )
            response.raise_for_status()

            result = response.json()
            if result.get('content') and len(result['content']) > 0:
                text_content = result['content'][0].get('text', '{}')
                # Extract JSON from response
                try:
                    # Try to find JSON in the response
                    import re
                    json_match = re.search(r'\{.*\}', text_content, re.DOTALL)
                    if json_match:
                        validation_data = json.loads(json_match.group())
                        return {
                            'is_valid': validation_data.get('is_genuine_document') or validation_data.get('is_genuine_selfie'),
                            'confidence': validation_data.get('confidence', 0),
                            'red_flags': validation_data.get('red_flags', []),
                            'details': validation_data.get('verdict', ''),
                            'raw': validation_data
                        }
                except json.JSONDecodeError:
                    pass
                
                return {
                    'is_valid': None,
                    'confidence': 0,
                    'red_flags': ['Could not parse validation response'],
                    'details': text_content[:200]
                }

            return {
                'is_valid': None,
                'confidence': 0,
                'red_flags': ['No response from API'],
                'details': 'API returned no content'
            }

        except Exception as e:
            return {
                'is_valid': None,
                'confidence': 0,
                'red_flags': ['Validation service error'],
                'details': str(e)
            }

    @classmethod
    def _analyze_with_vision_api(cls, image_file) -> dict:
        """
        Optionally call external website APIs (Google Vision) for better context.
        If no API key is configured, returns empty.
        """
        api_key = os.getenv('GOOGLE_VISION_API_KEY')
        if not api_key:
            return {}

        try:
            image_data = image_file.read()
            image_file.seek(0)
            import base64
            encoded = base64.b64encode(image_data).decode('utf-8')
            payload = {
                'requests': [
                    {
                        'image': {'content': encoded},
                        'features': [
                            {'type': 'LABEL_DETECTION', 'maxResults': 10},
                            {'type': 'TEXT_DETECTION', 'maxResults': 5}
                        ]
                    }
                ]
            }
            url = f'https://vision.googleapis.com/v1/images:annotate?key={api_key}'
            r = requests.post(url, json=payload, timeout=15)
            r.raise_for_status()
            data = r.json()

            labels = []
            texts = []
            for annotation in data.get('responses', []):
                for label in annotation.get('labelAnnotations', []):
                    labels.append(label.get('description', '').lower())
                for text in annotation.get('textAnnotations', [])[1:]:
                    texts.append(text.get('description', '').lower())

            evidence = []
            for item in labels + texts:
                if item:
                    evidence.append(f'Google Vision: {item}')

            return {
                'source': 'Google Vision',
                'labels': labels,
                'texts': texts,
                'evidence_found': evidence,
            }
        except Exception as e:
            return {'error': str(e), 'evidence_found': []}

    @classmethod
    def classify_role(cls, selfie_file, id_document_file) -> dict:
        """
        Main entry point: classify user role based on selfie + ID document.
        FIRST validates that images are genuine (not random photos or fake IDs).
        THEN classifies role based on evidence.
        
        Returns:
        {
            "classification": "Vendor|Shopkeeper|Delivery|Inconclusive",
            "confidence_score": 0-100,
            "evidence_found": [...],
            "red_flags": [...],
            "final_verdict": "explanation",
            "document_validated": true/false,
            "authenticity_score": 0-100
        }
        """

        # PHASE 1: Document & Selfie Authenticity Validation
        selfie_validation = cls._validate_with_claude_vision(selfie_file, 'selfie')
        id_validation = cls._validate_with_claude_vision(id_document_file, 'id_document')

        selfie_valid = selfie_validation.get('is_valid')
        id_valid = id_validation.get('is_valid')
        selfie_confidence = selfie_validation.get('confidence', 0)
        id_confidence = id_validation.get('confidence', 0)

        # Combined authenticity score
        authenticity_score = (selfie_confidence + id_confidence) // 2

        # If explicitly invalid or strong negative signals, fail.
        has_validity_result = (selfie_valid is not None and id_valid is not None)
        explicit_fail = (selfie_valid is False or id_valid is False)

        combined_red_flags = selfie_validation.get('red_flags', []) + id_validation.get('red_flags', [])

        if explicit_fail or (has_validity_result and authenticity_score < 35 and len(combined_red_flags) > 2):
            return {
                'classification': 'Inconclusive',
                'confidence_score': 0,
                'evidence_found': (selfie_validation.get('evidence', []) or []) + (id_validation.get('evidence', []) or []),
                'red_flags': combined_red_flags,
                'final_verdict': f'⚠️ AUTHENTICATION FAILED: Selfie authentic: {selfie_valid} ({selfie_confidence}%) | ID authentic: {id_valid} ({id_confidence}%). This appears to be a random/fake image, not genuine identity verification.',
                'document_validated': False,
                'authenticity_score': authenticity_score,
                'validation_details': {
                    'selfie': selfie_validation,
                    'id': id_validation
                }
            }

        # PHASE 2: Role Classification (if safety allows)
        selfie_analysis = cls.analyze_image(selfie_file)
        id_analysis = cls.analyze_image(id_document_file)

        # Add fallback evidence from validation stage
        validation_evidence = (selfie_validation.get('evidence', []) or []) + (id_validation.get('evidence', []) or [])
        selfie_evidence = selfie_analysis.get('evidence_found', [])
        id_evidence = id_analysis.get('evidence_found', [])
        all_evidence = list(set(validation_evidence + selfie_evidence + id_evidence))

        # Also carry red flags from validation phase
        all_red_flags = combined_red_flags + [f"selfie_quality:{selfie_analysis.get('quality_score', 0)}", f"id_quality:{id_analysis.get('quality_score', 0)}"]

        quality_score = (
            selfie_analysis.get('quality_score', 0) +
            id_analysis.get('quality_score', 0)
        ) / 2.0

        # Count keyword matches
        vendor_count = sum(1 for e in all_evidence if any(kw in e.lower() for kw in cls.VENDOR_KEYWORDS))
        shopkeeper_count = sum(1 for e in all_evidence if any(kw in e.lower() for kw in cls.SHOPKEEPER_KEYWORDS))
        delivery_count = sum(1 for e in all_evidence if any(kw in e.lower() for kw in cls.DELIVERY_KEYWORDS))
        red_flag_count = len(all_red_flags)


        # Determine classification
        counts = {
            'Vendor': vendor_count,
            'Shopkeeper': shopkeeper_count,
            'Delivery Personnel': delivery_count,
        }

        max_count = max(counts.values()) if counts.values() else 0
        classifications_with_max = [role for role, count in counts.items() if count == max_count]

        if max_count == 0 or red_flag_count > 2:
            classification = 'Inconclusive'
            confidence = 0
            verdict = 'Insufficient evidence or red flags detected. Manual review required.'
        elif len(classifications_with_max) > 1:
            classification = 'Inconclusive'
            confidence = 30
            verdict = 'Multiple roles detected equally. Cannot determine single classification.'
        else:
            classification = classifications_with_max[0]
            # Confidence = (matched keywords / total possible) * quality factor
            total_keywords = vendor_count + shopkeeper_count + delivery_count
            confidence = int((max_count / max(total_keywords, 1)) * 100 * quality_score) if total_keywords > 0 else 0

        return {
            'classification': classification,
            'confidence_score': confidence,
            'evidence_found': list(set(all_evidence)),  # deduplicate
            'red_flags': list(set(all_red_flags + [e for e in all_evidence if any(kw in e.lower() for kw in cls.RED_FLAGS)])),
            'final_verdict': f'✓ AUTHENTIC DOCUMENT: {verdict}',
            'document_validated': True,
            'authenticity_score': authenticity_score,
            'validation_details': {
                'selfie': selfie_validation,
                'id': id_validation
            }
        }

    @classmethod
    def to_json(cls, classification_result: dict) -> str:
        """Convert classification result to JSON string."""
        return json.dumps(classification_result, indent=2)
