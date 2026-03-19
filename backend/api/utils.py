"""
Utility functions for the FixItPublic API.
"""
import re


# ── PII Redaction ─────────────────────────────────────────────────────────────

def redact_pii(text):
    """
    Strip personally identifiable information from free-text before it is
    sent to external AI services (e.g. GPT-4o).

    Redacts:
    - Email addresses          → [EMAIL]
    - NZ phone numbers         → [PHONE]
    - HTTP/HTTPS URLs          → [URL]

    The original database values are never modified — this is only applied
    to the prompt strings sent to OpenAI.
    """
    if not text:
        return ''
    # Email addresses
    text = re.sub(r'\b[\w.+\-]+@[\w.\-]+\.\w{2,}\b', '[EMAIL]', text)
    # NZ landlines and mobiles: +64 or leading 0, then 7–11 more digits/spaces/dashes
    text = re.sub(r'\b(?:\+64|0)[0-9][0-9 \-]{6,10}\b', '[PHONE]', text)
    # URLs
    text = re.sub(r'https?://\S+', '[URL]', text)
    # Cap length so GPT prompt tokens stay reasonable
    return text[:1000]


# ── GPS EXIF Extraction ───────────────────────────────────────────────────────

def extract_gps_exif(file_field):
    """
    Attempt to read GPS coordinates from the EXIF metadata of an uploaded
    image (JPEG/TIFF only — PNG has no EXIF).

    Returns (lat, lng) as floats, or None if no GPS data is found or the
    file cannot be read.
    """
    try:
        from PIL import Image

        # Re-open from the storage backend field
        file_field.seek(0)
        img = Image.open(file_field)
        exif_raw = img._getexif()
        if not exif_raw:
            return None

        # Tag 34853 is GPSInfo
        gps_info = exif_raw.get(34853)
        if not gps_info:
            return None

        def _to_decimal(dms_tuple):
            """Convert (degrees, minutes, seconds) tuple to decimal degrees."""
            d, m, s = dms_tuple
            # Pillow may return IFDRational objects; convert to float
            return float(d) + float(m) / 60.0 + float(s) / 3600.0

        lat_raw = gps_info.get(2)   # GPSLatitude
        lat_ref = gps_info.get(1)   # GPSLatitudeRef  ('N' or 'S')
        lng_raw = gps_info.get(4)   # GPSLongitude
        lng_ref = gps_info.get(3)   # GPSLongitudeRef ('E' or 'W')

        if not (lat_raw and lat_ref and lng_raw and lng_ref):
            return None

        lat = _to_decimal(lat_raw)
        lng = _to_decimal(lng_raw)

        if lat_ref == 'S':
            lat = -lat
        if lng_ref == 'W':
            lng = -lng

        return (round(lat, 6), round(lng, 6))

    except Exception:
        return None
