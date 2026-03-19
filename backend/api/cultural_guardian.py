"""
cultural_guardian.py
--------------------
MCP Cultural Guardian — stub implementation.

Checks whether a GPS coordinate falls within a known Wāhi Tapu (culturally
sensitive / sacred Māori site) polygon in New Zealand.

The polygons below are illustrative examples only.  In production these would
be loaded from an authoritative Te Papa Atawhai / Heritage New Zealand dataset.
Each polygon is a list of (lat, lng) pairs forming a closed ring.

Returns
-------
dict
    {"is_sensitive": bool, "site_name": str | None}
"""

from typing import Optional

# ---------------------------------------------------------------------------
# Wāhi Tapu zone definitions (stub — replace with real GIS dataset in prod)
# ---------------------------------------------------------------------------
# Each entry: {"name": str, "polygon": [(lat, lng), ...]}
WAHI_TAPU_ZONES = [
    {
        "name": "Ōtāhuhu / Mt Richmond — Mana Whenua Cultural Zone",
        "polygon": [
            (-36.9370, 174.8370),
            (-36.9370, 174.8470),
            (-36.9430, 174.8470),
            (-36.9430, 174.8370),
            (-36.9370, 174.8370),
        ],
    },
    {
        "name": "Maungawhau / Mt Eden — Tūpuna Maunga Heritage Area",
        "polygon": [
            (-36.8760, 174.7600),
            (-36.8760, 174.7660),
            (-36.8810, 174.7660),
            (-36.8810, 174.7600),
            (-36.8760, 174.7600),
        ],
    },
    {
        "name": "Ōrākei — Sacred Coastal Strip",
        "polygon": [
            (-36.8600, 174.8050),
            (-36.8600, 174.8200),
            (-36.8700, 174.8200),
            (-36.8700, 174.8050),
            (-36.8600, 174.8050),
        ],
    },
]


def _point_in_polygon(lat: float, lng: float, polygon: list) -> bool:
    """
    Ray-casting algorithm for point-in-polygon test.
    polygon — list of (lat, lng) pairs forming a closed ring.
    """
    n = len(polygon)
    inside = False
    j = n - 1
    for i in range(n):
        yi, xi = polygon[i]
        yj, xj = polygon[j]
        if ((yi > lat) != (yj > lat)) and (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    return inside


def check_cultural_sensitivity(
    lat: Optional[float],
    lng: Optional[float],
) -> dict:
    """
    Check whether (lat, lng) lies within any registered Wāhi Tapu zone.

    Parameters
    ----------
    lat, lng : float | None
        GPS coordinates to test.  Returns not-sensitive if either is None.

    Returns
    -------
    dict
        {"is_sensitive": bool, "site_name": str | None}
    """
    if lat is None or lng is None:
        return {"is_sensitive": False, "site_name": None}

    for zone in WAHI_TAPU_ZONES:
        if _point_in_polygon(lat, lng, zone["polygon"]):
            return {"is_sensitive": True, "site_name": zone["name"]}

    return {"is_sensitive": False, "site_name": None}
