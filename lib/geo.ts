const OERLIKON_LAT = 47.4085
const OERLIKON_LNG = 8.5441

function toRad(deg: number) {
  return deg * (Math.PI / 180)
}

export function haversineKm(lat: number, lng: number): number {
  const R = 6371
  const dLat = toRad(lat - OERLIKON_LAT)
  const dLng = toRad(lng - OERLIKON_LNG)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(OERLIKON_LAT)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// PLZs in the ~10 km radius around Zürich-Oerlikon
const ACCEPTED_PLZ = new Set([
  '8000', '8001', '8002', '8003', '8004', '8005', '8006', '8008',
  '8032', '8037', '8038', '8044', '8045', '8046', '8047', '8048', '8049',
  '8050', '8051', '8052', '8053', '8055', '8057', '8064',
  '8400', '8401', '8402', '8403', '8404', '8405', '8406',
  '8600', '8952', '8953',
])

export function isWithinRadius(location: string | null | undefined, maxKm = 10): boolean {
  if (!location) return true // accept unknown locations conservatively

  // Extract PLZ from location string e.g. "8050 Zürich-Oerlikon"
  const plzMatch = location.match(/\b(8\d{3})\b/)
  if (plzMatch) {
    return ACCEPTED_PLZ.has(plzMatch[1])
  }

  // Keyword-based fallback
  const lower = location.toLowerCase()
  const zurichKeywords = ['zürich', 'zurich', 'oerlikon', 'seebach', 'affoltern', 'höngg',
    'altstetten', 'albisrieden', 'engstringen', 'schlieren', 'dietikon', 'urdorf',
    'opfikon', 'kloten', 'bassersdorf', 'wallisellen', 'dübendorf', 'regensdorf']
  return zurichKeywords.some(k => lower.includes(k))
}

export function distanceFromLocation(location: string | null | undefined): number | null {
  if (!location) return null
  const plzMatch = location.match(/\b(8\d{3})\b/)
  if (!plzMatch) return null
  // Rough centre-of-PLZ lookup — not perfectly accurate but good enough
  const plzCenters: Record<string, [number, number]> = {
    '8050': [47.4085, 8.5441], // Oerlikon itself
    '8057': [47.4035, 8.5500],
    '8006': [47.3970, 8.5440],
    '8005': [47.3870, 8.5250],
    '8004': [47.3780, 8.5230],
    '8003': [47.3760, 8.5180],
    '8002': [47.3630, 8.5380],
    '8001': [47.3740, 8.5420],
    '8032': [47.3700, 8.5650],
    '8044': [47.3840, 8.5700],
    '8046': [47.4230, 8.5310],
    '8047': [47.3760, 8.5000],
    '8048': [47.3900, 8.4900],
    '8049': [47.4100, 8.5020],
    '8052': [47.4150, 8.5700],
    '8051': [47.4000, 8.5800],
    '8053': [47.3680, 8.6000],
    '8055': [47.3640, 8.5040],
    '8037': [47.3940, 8.5320],
    '8038': [47.3580, 8.5260],
    '8064': [47.4020, 8.5780],
    '8045': [47.3580, 8.5440],
    '8400': [47.4985, 8.7238],
  }
  const coords = plzCenters[plzMatch[1]]
  if (!coords) return null
  return Math.round(haversineKm(coords[0], coords[1]) * 10) / 10
}
