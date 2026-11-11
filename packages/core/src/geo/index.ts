/**
 * L2 geometry: spherical distances, geodesic sampling, polygons, water crossings.
 * Pure functions, no clock, no randomness, no network (§0.6).
 */
export { EARTH_RADIUS_KM } from './constants.ts';
export {
  centralAngleRad,
  haversineKm,
  normalizeDeltaLonDeg,
  normalizeLonDeg,
} from './haversine.ts';
export { greatCirclePoints } from './geodesic.ts';
export { pointInPolygon, pointInRing } from './polygon.ts';
export { crossesWater, landmassAt, DEFAULT_WATER_SAMPLES } from './water.ts';
export { toMiles } from './units.ts';
