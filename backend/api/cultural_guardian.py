"""
cultural_guardian.py
--------------------
Checks whether a maintenance ticket falls within a known
Wahi Tapu (culturally sensitive) area using a pure-Python
ray-casting point-in-polygon algorithm — no PostGIS or GDAL required.

Returns (flagged: bool, site_name: str).

The polygon coordinates are representative stubs for the Auckland region.
In production these would be loaded from a GeoJSON file or council API.
"""


# Each entry: (site_name, [(lng, lat), ...])
# Coordinates are (longitude, latitude) pairs matching standard GeoJSON order.
WAHI_TAPU_SITES = [
    (
        'Maungawhau / Mount Eden',
        [
            (174.7630, -36.8760),
            (174.7670, -36.8760),
            (174.7680, -36.8790),
            (174.7660, -36.8810),
            (174.7620, -36.8800),
            (174.7610, -36.8775),
        ],
    ),
    (
        'Orakei Basin',
        [
            (174.7950, -36.8650),
            (174.8020, -36.8650),
            (174.8040, -36.8700),
            (174.8000, -36.8730),
            (174.7940, -36.8710),
            (174.7930, -36.8670),
        ],
    ),
    (
        'Mangere Mountain / Te Pane o Mataoho',
        [
            (174.8640, -36.9700),
            (174.8700, -36.9700),
            (174.8720, -36.9740),
            (174.8690, -36.9770),
            (174.8640, -36.9755),
            (174.8620, -36.9725),
        ],
    ),
    (
        'Otahuhu / Te Papapa',
        [
            (174.8380, -36.9390),
            (174.8450, -36.9390),
            (174.8460, -36.9430),
            (174.8420, -36.9450),
            (174.8370, -36.9430),
        ],
    ),
]


def _point_in_polygon(lng: float, lat: float, polygon) -> bool:
    """
    Ray-casting algorithm.
    Returns True if (lng, lat) is inside the polygon ring.
    polygon is a list of (lng, lat) tuples.
    """
    n = len(polygon)
    inside = False
    x, y = lng, lat
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def check_cultural_sensitivity(lat, lng):
    """
    Returns (flagged: bool, site_name: str).
    site_name is empty string when not flagged.
    lat/lng may be None — returns (False, '') in that case.
    """
    if lat is None or lng is None:
        return False, ''

    for site_name, polygon in WAHI_TAPU_SITES:
        if _point_in_polygon(lng, lat, polygon):
            return True, site_name

    return False, ''
