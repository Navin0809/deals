const hyderabadAreas = [
  { name: 'All Hyderabad', city: 'Hyderabad', latitude: 17.385, longitude: 78.4867 },
  { name: 'Ameerpet', city: 'Hyderabad', latitude: 17.4375, longitude: 78.4483 },
  { name: 'Abids', city: 'Hyderabad', latitude: 17.3898, longitude: 78.4766 },
  { name: 'Attapur', city: 'Hyderabad', latitude: 17.368, longitude: 78.4292 },
  { name: 'Banjara Hills', city: 'Hyderabad', latitude: 17.4123, longitude: 78.4482 },
  { name: 'Begumpet', city: 'Hyderabad', latitude: 17.4435, longitude: 78.4622 },
  { name: 'Charminar', city: 'Hyderabad', latitude: 17.3616, longitude: 78.4747 },
  { name: 'Chanda Nagar', city: 'Hyderabad', latitude: 17.4938, longitude: 78.331 },
  { name: 'Dilsukhnagar', city: 'Hyderabad', latitude: 17.3687, longitude: 78.5262 },
  { name: 'Gachibowli', city: 'Hyderabad', latitude: 17.4401, longitude: 78.3489 },
  { name: 'HITEC City', city: 'Hyderabad', latitude: 17.4504, longitude: 78.3817 },
  { name: 'Himayatnagar', city: 'Hyderabad', latitude: 17.4009, longitude: 78.4896 },
  { name: 'Jubilee Hills', city: 'Hyderabad', latitude: 17.4326, longitude: 78.4071 },
  { name: 'Kachiguda', city: 'Hyderabad', latitude: 17.389, longitude: 78.4986 },
  { name: 'Kompally', city: 'Hyderabad', latitude: 17.5386, longitude: 78.4822 },
  { name: 'Kondapur', city: 'Hyderabad', latitude: 17.4647, longitude: 78.3657 },
  { name: 'Kukatpally', city: 'Hyderabad', latitude: 17.4948, longitude: 78.3996 },
  { name: 'Lakdikapul', city: 'Hyderabad', latitude: 17.4056, longitude: 78.4652 },
  { name: 'LB Nagar', city: 'Hyderabad', latitude: 17.3457, longitude: 78.5522 },
  { name: 'Madhapur', city: 'Hyderabad', latitude: 17.4483, longitude: 78.3915 },
  { name: 'Manikonda', city: 'Hyderabad', latitude: 17.4065, longitude: 78.3761 },
  { name: 'Mehdipatnam', city: 'Hyderabad', latitude: 17.3943, longitude: 78.4398 },
  { name: 'Malkajgiri', city: 'Hyderabad', latitude: 17.4474, longitude: 78.5263 },
  { name: 'Miyapur', city: 'Hyderabad', latitude: 17.4933, longitude: 78.3915 },
  { name: 'Nampally', city: 'Hyderabad', latitude: 17.3865, longitude: 78.4702 },
  { name: 'Nizampet', city: 'Hyderabad', latitude: 17.5186, longitude: 78.3845 },
  { name: 'Patancheru', city: 'Hyderabad', latitude: 17.5324, longitude: 78.2645 },
  { name: 'Secunderabad', city: 'Hyderabad', latitude: 17.4399, longitude: 78.4983 },
  { name: 'Somajiguda', city: 'Hyderabad', latitude: 17.4243, longitude: 78.4584 },
  { name: 'Tolichowki', city: 'Hyderabad', latitude: 17.3984, longitude: 78.4133 },
  { name: 'Uppal', city: 'Hyderabad', latitude: 17.4058, longitude: 78.5591 }
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
