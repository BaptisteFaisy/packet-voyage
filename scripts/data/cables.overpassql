/*
 * Packet Voyage — submarine cable extraction (ODbL, © OpenStreetMap contributors).
 * Ways tagged as submarine communication lines: name, operator, length, RFS year.
 * Run: curl -sS --data-urlencode "data@cables.overpassql" https://overpass-api.de/api/interpreter -o cache/overpass-cables.json
 */
[out:json][timeout:300];
way["communication"="line"]["submarine"="yes"];
out geom tags;
