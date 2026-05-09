const hyderabadAreas = [
  { name: 'All Hyderabad', city: 'Hyderabad', latitude: 17.385, longitude: 78.4867 },
  { name: 'Ameerpet', city: 'Hyderabad', latitude: 17.4375, longitude: 78.4483 },
  { name: 'Banjara Hills', city: 'Hyderabad', latitude: 17.4123, longitude: 78.4482 },
  { name: 'Begumpet', city: 'Hyderabad', latitude: 17.4435, longitude: 78.4622 },
  { name: 'Dilsukhnagar', city: 'Hyderabad', latitude: 17.3687, longitude: 78.5262 },
  { name: 'Gachibowli', city: 'Hyderabad', latitude: 17.4401, longitude: 78.3489 },
  { name: 'HITEC City', city: 'Hyderabad', latitude: 17.4504, longitude: 78.3817 },
  { name: 'Jubilee Hills', city: 'Hyderabad', latitude: 17.4326, longitude: 78.4071 },
  { name: 'Kondapur', city: 'Hyderabad', latitude: 17.4647, longitude: 78.3657 },
  { name: 'Kukatpally', city: 'Hyderabad', latitude: 17.4948, longitude: 78.3996 },
  { name: 'Madhapur', city: 'Hyderabad', latitude: 17.4483, longitude: 78.3915 },
  { name: 'Manikonda', city: 'Hyderabad', latitude: 17.4065, longitude: 78.3761 },
  { name: 'Mehdipatnam', city: 'Hyderabad', latitude: 17.3943, longitude: 78.4398 },
  { name: 'Miyapur', city: 'Hyderabad', latitude: 17.4933, longitude: 78.3915 },
  { name: 'Secunderabad', city: 'Hyderabad', latitude: 17.4399, longitude: 78.4983 },
  { name: 'Somajiguda', city: 'Hyderabad', latitude: 17.4243, longitude: 78.4584 }
];

function findArea(name) {
  return hyderabadAreas.find((area) => area.name.toLowerCase() === String(name || '').toLowerCase());
}

function parseCoordinatesFromMapsUrl(url) {
  if (!url) return null;
  const decoded = decodeURIComponent(String(url));
  const atMatch = decoded.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  const queryMatch = decoded.match(/[?&]q=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  const looseMatch = decoded.match(/(-?\d{1,2}\.\d{3,}),\s*(-?\d{1,3}\.\d{3,})/);
  const match = atMatch || queryMatch || looseMatch;
  if (!match) return null;
  return { latitude: Number(match[1]), longitude: Number(match[2]) };
}

function resolveShopLocation({ area, googleMapsUrl }) {
  const fromUrl = parseCoordinatesFromMapsUrl(googleMapsUrl);
  if (fromUrl) return fromUrl;
  const selected = findArea(area) || hyderabadAreas[0];
  return { latitude: selected.latitude, longitude: selected.longitude };
}

module.exports = { findArea, hyderabadAreas, parseCoordinatesFromMapsUrl, resolveShopLocation };
