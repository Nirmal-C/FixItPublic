// Google Maps "MapTypeStyle" presets to match the app theme.
// Light mode uses default Google styling (null); dark mode applies a deep-navy theme.

export const DARK_MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#0e1c2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ba8c4' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0c1829' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a3050' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0c1829' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9bb4cc' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#142a44' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#0f2a22' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6ea08a' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0b2a3c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#6aa1c9' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#27415f' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#8ba8c4' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#11263e' }] },
  { featureType: 'transit', elementType: 'labels.text.fill', stylers: [{ color: '#7ea2c2' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0e1c2e' }] },
]

export function mapStylesForTheme(theme) {
  return theme === 'dark' ? DARK_MAP_STYLES : null
}

