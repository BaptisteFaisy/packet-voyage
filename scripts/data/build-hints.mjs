#!/usr/bin/env node
/**
 * build-hints.mjs — airport codes (IATA) and network-relevant cities table.
 *
 * Requirements (spec §6.1, §6.3, CONTRACTS §2, prompt):
 * - ~150 network-relevant cities with coordinates and country.
 * - Airport codes (IATA) + city names for router-name hint decoders.
 * - Source: hand-curated table, facts not copyrightable, coordinates
 *   rounded to 0.01° (CC0-1.0).
 * - Matches HintCitySchema from @packet-voyage/schema:
 *   { code, city, country, lat, lon, kind: 'airport' | 'city' }
 *
 * Offline & idempotent.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { updateProvenance } from './provenance.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const OUT_DIR = join(root, 'packages', 'data', 'datasets');
const OUT = join(OUT_DIR, 'hints.json');

const RAW_HINTS = [
  // Europe
  { code: 'AMS', city: 'Amsterdam', country: 'NL', lat: 52.31, lon: 4.76, kind: 'airport' },
  { code: 'amsterdam', city: 'Amsterdam', country: 'NL', lat: 52.37, lon: 4.89, kind: 'city' },
  { code: 'ATH', city: 'Athens', country: 'GR', lat: 37.94, lon: 23.94, kind: 'airport' },
  { code: 'athens', city: 'Athens', country: 'GR', lat: 37.98, lon: 23.73, kind: 'city' },
  { code: 'BCN', city: 'Barcelona', country: 'ES', lat: 41.30, lon: 2.08, kind: 'airport' },
  { code: 'barcelona', city: 'Barcelona', country: 'ES', lat: 41.39, lon: 2.17, kind: 'city' },
  { code: 'BER', city: 'Berlin', country: 'DE', lat: 52.37, lon: 13.50, kind: 'airport' },
  { code: 'berlin', city: 'Berlin', country: 'DE', lat: 52.52, lon: 13.40, kind: 'city' },
  { code: 'BIO', city: 'Bilbao', country: 'ES', lat: 43.30, lon: -2.91, kind: 'airport' },
  { code: 'BOD', city: 'Bordeaux', country: 'FR', lat: 44.83, lon: -0.72, kind: 'airport' },
  { code: 'bordeaux', city: 'Bordeaux', country: 'FR', lat: 44.84, lon: -0.58, kind: 'city' },
  { code: 'BRU', city: 'Brussels', country: 'BE', lat: 50.90, lon: 4.48, kind: 'airport' },
  { code: 'brussels', city: 'Brussels', country: 'BE', lat: 50.85, lon: 4.35, kind: 'city' },
  { code: 'BUD', city: 'Budapest', country: 'HU', lat: 47.44, lon: 19.26, kind: 'airport' },
  { code: 'budapest', city: 'Budapest', country: 'HU', lat: 47.50, lon: 19.04, kind: 'city' },
  { code: 'CPH', city: 'Copenhagen', country: 'DK', lat: 55.62, lon: 12.65, kind: 'airport' },
  { code: 'copenhagen', city: 'Copenhagen', country: 'DK', lat: 55.68, lon: 12.57, kind: 'city' },
  { code: 'DUB', city: 'Dublin', country: 'IE', lat: 53.42, lon: -6.27, kind: 'airport' },
  { code: 'dublin', city: 'Dublin', country: 'IE', lat: 53.35, lon: -6.26, kind: 'city' },
  { code: 'DUS', city: 'Dusseldorf', country: 'DE', lat: 51.28, lon: 6.77, kind: 'airport' },
  { code: 'EDI', city: 'Edinburgh', country: 'GB', lat: 55.95, lon: -3.37, kind: 'airport' },
  { code: 'FRA', city: 'Frankfurt', country: 'DE', lat: 50.03, lon: 8.57, kind: 'airport' },
  { code: 'frankfurt', city: 'Frankfurt', country: 'DE', lat: 50.11, lon: 8.68, kind: 'city' },
  { code: 'GVA', city: 'Geneva', country: 'CH', lat: 46.24, lon: 6.11, kind: 'airport' },
  { code: 'geneva', city: 'Geneva', country: 'CH', lat: 46.20, lon: 6.14, kind: 'city' },
  { code: 'HAM', city: 'Hamburg', country: 'DE', lat: 53.63, lon: 10.00, kind: 'airport' },
  { code: 'HEL', city: 'Helsinki', country: 'FI', lat: 60.32, lon: 24.96, kind: 'airport' },
  { code: 'helsinki', city: 'Helsinki', country: 'FI', lat: 60.17, lon: 24.94, kind: 'city' },
  { code: 'IST', city: 'Istanbul', country: 'TR', lat: 41.28, lon: 28.75, kind: 'airport' },
  { code: 'istanbul', city: 'Istanbul', country: 'TR', lat: 41.01, lon: 28.98, kind: 'city' },
  { code: 'LHR', city: 'London', country: 'GB', lat: 51.47, lon: -0.45, kind: 'airport' },
  { code: 'LGW', city: 'London', country: 'GB', lat: 51.15, lon: -0.18, kind: 'airport' },
  { code: 'LCY', city: 'London', country: 'GB', lat: 51.50, lon: 0.05, kind: 'airport' },
  { code: 'london', city: 'London', country: 'GB', lat: 51.51, lon: -0.13, kind: 'city' },
  { code: 'LIS', city: 'Lisbon', country: 'PT', lat: 38.77, lon: -9.13, kind: 'airport' },
  { code: 'lisbon', city: 'Lisbon', country: 'PT', lat: 38.72, lon: -9.14, kind: 'city' },
  { code: 'LYS', city: 'Lyon', country: 'FR', lat: 45.73, lon: 5.08, kind: 'airport' },
  { code: 'lyon', city: 'Lyon', country: 'FR', lat: 45.76, lon: 4.84, kind: 'city' },
  { code: 'MAD', city: 'Madrid', country: 'ES', lat: 40.48, lon: -3.57, kind: 'airport' },
  { code: 'madrid', city: 'Madrid', country: 'ES', lat: 40.42, lon: -3.70, kind: 'city' },
  { code: 'MAN', city: 'Manchester', country: 'GB', lat: 53.35, lon: -2.27, kind: 'airport' },
  { code: 'manchester', city: 'Manchester', country: 'GB', lat: 53.48, lon: -2.24, kind: 'city' },
  { code: 'MRS', city: 'Marseille', country: 'FR', lat: 43.44, lon: 5.22, kind: 'airport' },
  { code: 'marseille', city: 'Marseille', country: 'FR', lat: 43.30, lon: 5.37, kind: 'city' },
  { code: 'MXP', city: 'Milan', country: 'IT', lat: 45.63, lon: 8.72, kind: 'airport' },
  { code: 'LIN', city: 'Milan', country: 'IT', lat: 45.45, lon: 9.28, kind: 'airport' },
  { code: 'milan', city: 'Milan', country: 'IT', lat: 45.46, lon: 9.19, kind: 'city' },
  { code: 'MUC', city: 'Munich', country: 'DE', lat: 48.35, lon: 11.79, kind: 'airport' },
  { code: 'munich', city: 'Munich', country: 'DE', lat: 48.14, lon: 11.58, kind: 'city' },
  { code: 'OSL', city: 'Oslo', country: 'NO', lat: 60.19, lon: 11.10, kind: 'airport' },
  { code: 'oslo', city: 'Oslo', country: 'NO', lat: 59.91, lon: 10.75, kind: 'city' },
  { code: 'CDG', city: 'Paris', country: 'FR', lat: 49.01, lon: 2.55, kind: 'airport' },
  { code: 'ORY', city: 'Paris', country: 'FR', lat: 48.72, lon: 2.36, kind: 'airport' },
  { code: 'paris', city: 'Paris', country: 'FR', lat: 48.86, lon: 2.35, kind: 'city' },
  { code: 'PRG', city: 'Prague', country: 'CZ', lat: 50.10, lon: 14.26, kind: 'airport' },
  { code: 'prague', city: 'Prague', country: 'CZ', lat: 50.08, lon: 14.44, kind: 'city' },
  { code: 'KEF', city: 'Reykjavik', country: 'IS', lat: 63.99, lon: -22.61, kind: 'airport' },
  { code: 'FCO', city: 'Rome', country: 'IT', lat: 41.80, lon: 12.24, kind: 'airport' },
  { code: 'rome', city: 'Rome', country: 'IT', lat: 41.90, lon: 12.50, kind: 'city' },
  { code: 'SOF', city: 'Sofia', country: 'BG', lat: 42.69, lon: 23.41, kind: 'airport' },
  { code: 'ARN', city: 'Stockholm', country: 'SE', lat: 59.65, lon: 17.92, kind: 'airport' },
  { code: 'stockholm', city: 'Stockholm', country: 'SE', lat: 59.33, lon: 18.06, kind: 'city' },
  { code: 'STR', city: 'Stuttgart', country: 'DE', lat: 48.69, lon: 9.22, kind: 'airport' },
  { code: 'TLS', city: 'Toulouse', country: 'FR', lat: 43.63, lon: 1.36, kind: 'airport' },
  { code: 'toulouse', city: 'Toulouse', country: 'FR', lat: 43.60, lon: 1.44, kind: 'city' },
  { code: 'VCE', city: 'Venice', country: 'IT', lat: 45.51, lon: 12.35, kind: 'airport' },
  { code: 'VIE', city: 'Vienna', country: 'AT', lat: 48.11, lon: 16.57, kind: 'airport' },
  { code: 'vienna', city: 'Vienna', country: 'AT', lat: 48.21, lon: 16.37, kind: 'city' },
  { code: 'WAW', city: 'Warsaw', country: 'PL', lat: 52.17, lon: 20.97, kind: 'airport' },
  { code: 'warsaw', city: 'Warsaw', country: 'PL', lat: 52.23, lon: 21.01, kind: 'city' },
  { code: 'ZRH', city: 'Zurich', country: 'CH', lat: 47.46, lon: 8.55, kind: 'airport' },
  { code: 'zurich', city: 'Zurich', country: 'CH', lat: 47.38, lon: 8.54, kind: 'city' },

  // North America
  { code: 'ATL', city: 'Atlanta', country: 'US', lat: 33.64, lon: -84.43, kind: 'airport' },
  { code: 'atlanta', city: 'Atlanta', country: 'US', lat: 33.75, lon: -84.39, kind: 'city' },
  { code: 'BOS', city: 'Boston', country: 'US', lat: 42.36, lon: -71.01, kind: 'airport' },
  { code: 'boston', city: 'Boston', country: 'US', lat: 42.36, lon: -71.06, kind: 'city' },
  { code: 'ORD', city: 'Chicago', country: 'US', lat: 41.98, lon: -87.90, kind: 'airport' },
  { code: 'chicago', city: 'Chicago', country: 'US', lat: 41.88, lon: -87.63, kind: 'city' },
  { code: 'DFW', city: 'Dallas', country: 'US', lat: 32.90, lon: -97.04, kind: 'airport' },
  { code: 'dallas', city: 'Dallas', country: 'US', lat: 32.78, lon: -96.80, kind: 'city' },
  { code: 'DEN', city: 'Denver', country: 'US', lat: 39.86, lon: -104.67, kind: 'airport' },
  { code: 'denver', city: 'Denver', country: 'US', lat: 39.74, lon: -104.99, kind: 'city' },
  { code: 'IAH', city: 'Houston', country: 'US', lat: 29.98, lon: -95.34, kind: 'airport' },
  { code: 'houston', city: 'Houston', country: 'US', lat: 29.76, lon: -95.37, kind: 'city' },
  { code: 'LAX', city: 'Los Angeles', country: 'US', lat: 33.94, lon: -118.41, kind: 'airport' },
  { code: 'losangeles', city: 'Los Angeles', country: 'US', lat: 34.05, lon: -118.24, kind: 'city' },
  { code: 'MIA', city: 'Miami', country: 'US', lat: 25.80, lon: -80.29, kind: 'airport' },
  { code: 'miami', city: 'Miami', country: 'US', lat: 25.76, lon: -80.19, kind: 'city' },
  { code: 'MSP', city: 'Minneapolis', country: 'US', lat: 44.88, lon: -93.22, kind: 'airport' },
  { code: 'YUL', city: 'Montreal', country: 'CA', lat: 45.47, lon: -73.74, kind: 'airport' },
  { code: 'montreal', city: 'Montreal', country: 'CA', lat: 45.50, lon: -73.57, kind: 'city' },
  { code: 'JFK', city: 'New York', country: 'US', lat: 40.64, lon: -73.78, kind: 'airport' },
  { code: 'EWR', city: 'Newark', country: 'US', lat: 40.69, lon: -74.17, kind: 'airport' },
  { code: 'newyork', city: 'New York', country: 'US', lat: 40.71, lon: -74.01, kind: 'city' },
  { code: 'PHL', city: 'Philadelphia', country: 'US', lat: 39.87, lon: -75.24, kind: 'airport' },
  { code: 'PHX', city: 'Phoenix', country: 'US', lat: 33.43, lon: -112.01, kind: 'airport' },
  { code: 'SAN', city: 'San Diego', country: 'US', lat: 32.73, lon: -117.19, kind: 'airport' },
  { code: 'SFO', city: 'San Francisco', country: 'US', lat: 37.62, lon: -122.38, kind: 'airport' },
  { code: 'sanfrancisco', city: 'San Francisco', country: 'US', lat: 37.77, lon: -122.42, kind: 'city' },
  { code: 'SJC', city: 'San Jose', country: 'US', lat: 37.36, lon: -121.93, kind: 'airport' },
  { code: 'sanjose', city: 'San Jose', country: 'US', lat: 37.34, lon: -121.89, kind: 'city' },
  { code: 'SEA', city: 'Seattle', country: 'US', lat: 47.45, lon: -122.31, kind: 'airport' },
  { code: 'seattle', city: 'Seattle', country: 'US', lat: 47.61, lon: -122.33, kind: 'city' },
  { code: 'YYZ', city: 'Toronto', country: 'CA', lat: 43.68, lon: -79.63, kind: 'airport' },
  { code: 'toronto', city: 'Toronto', country: 'CA', lat: 43.65, lon: -79.38, kind: 'city' },
  { code: 'YVR', city: 'Vancouver', country: 'CA', lat: 49.19, lon: -123.18, kind: 'airport' },
  { code: 'vancouver', city: 'Vancouver', country: 'CA', lat: 49.28, lon: -123.12, kind: 'city' },
  { code: 'IAD', city: 'Washington', country: 'US', lat: 38.95, lon: -77.46, kind: 'airport' },
  { code: 'DCA', city: 'Washington', country: 'US', lat: 38.85, lon: -77.04, kind: 'airport' },
  { code: 'washington', city: 'Washington', country: 'US', lat: 38.91, lon: -77.04, kind: 'city' },
  { code: 'MEX', city: 'Mexico City', country: 'MX', lat: 19.44, lon: -99.07, kind: 'airport' },
  { code: 'mexicocity', city: 'Mexico City', country: 'MX', lat: 19.43, lon: -99.13, kind: 'city' },
  { code: 'PTY', city: 'Panama City', country: 'PA', lat: 9.07, lon: -79.38, kind: 'airport' },

  // South America
  { code: 'BOG', city: 'Bogota', country: 'CO', lat: 4.70, lon: -74.15, kind: 'airport' },
  { code: 'bogota', city: 'Bogota', country: 'CO', lat: 4.71, lon: -74.07, kind: 'city' },
  { code: 'EZE', city: 'Buenos Aires', country: 'AR', lat: -34.82, lon: -58.54, kind: 'airport' },
  { code: 'buenosaires', city: 'Buenos Aires', country: 'AR', lat: -34.60, lon: -58.38, kind: 'city' },
  { code: 'LIM', city: 'Lima', country: 'PE', lat: -12.02, lon: -77.11, kind: 'airport' },
  { code: 'lima', city: 'Lima', country: 'PE', lat: -12.05, lon: -77.04, kind: 'city' },
  { code: 'GIG', city: 'Rio de Janeiro', country: 'BR', lat: -22.81, lon: -43.25, kind: 'airport' },
  { code: 'GRU', city: 'Sao Paulo', country: 'BR', lat: -23.44, lon: -46.47, kind: 'airport' },
  { code: 'saopaulo', city: 'Sao Paulo', country: 'BR', lat: -23.55, lon: -46.63, kind: 'city' },
  { code: 'SCL', city: 'Santiago', country: 'CL', lat: -33.39, lon: -70.79, kind: 'airport' },
  { code: 'santiago', city: 'Santiago', country: 'CL', lat: -33.45, lon: -70.67, kind: 'city' },

  // Asia / Pacific
  { code: 'AKL', city: 'Auckland', country: 'NZ', lat: -37.01, lon: 174.79, kind: 'airport' },
  { code: 'auckland', city: 'Auckland', country: 'NZ', lat: -36.85, lon: 174.76, kind: 'city' },
  { code: 'BKK', city: 'Bangkok', country: 'TH', lat: 13.69, lon: 100.75, kind: 'airport' },
  { code: 'bangkok', city: 'Bangkok', country: 'TH', lat: 13.75, lon: 100.52, kind: 'city' },
  { code: 'PEK', city: 'Beijing', country: 'CN', lat: 40.08, lon: 116.58, kind: 'airport' },
  { code: 'beijing', city: 'Beijing', country: 'CN', lat: 39.90, lon: 116.41, kind: 'city' },
  { code: 'BNE', city: 'Brisbane', country: 'AU', lat: -27.38, lon: 153.12, kind: 'airport' },
  { code: 'CAN', city: 'Guangzhou', country: 'CN', lat: 23.39, lon: 113.30, kind: 'airport' },
  { code: 'guangzhou', city: 'Guangzhou', country: 'CN', lat: 23.13, lon: 113.26, kind: 'city' },
  { code: 'HKG', city: 'Hong Kong', country: 'HK', lat: 22.31, lon: 113.91, kind: 'airport' },
  { code: 'hongkong', city: 'Hong Kong', country: 'HK', lat: 22.32, lon: 114.17, kind: 'city' },
  { code: 'CGK', city: 'Jakarta', country: 'ID', lat: -6.13, lon: 106.66, kind: 'airport' },
  { code: 'jakarta', city: 'Jakarta', country: 'ID', lat: -6.21, lon: 106.85, kind: 'city' },
  { code: 'KUL', city: 'Kuala Lumpur', country: 'MY', lat: 2.75, lon: 101.71, kind: 'airport' },
  { code: 'kualalumpur', city: 'Kuala Lumpur', country: 'MY', lat: 3.14, lon: 101.69, kind: 'city' },
  { code: 'MNL', city: 'Manila', country: 'PH', lat: 14.51, lon: 121.02, kind: 'airport' },
  { code: 'manila', city: 'Manila', country: 'PH', lat: 14.60, lon: 120.98, kind: 'city' },
  { code: 'MEL', city: 'Melbourne', country: 'AU', lat: -37.67, lon: 144.84, kind: 'airport' },
  { code: 'melbourne', city: 'Melbourne', country: 'AU', lat: -37.81, lon: 144.96, kind: 'city' },
  { code: 'BOM', city: 'Mumbai', country: 'IN', lat: 19.09, lon: 72.87, kind: 'airport' },
  { code: 'mumbai', city: 'Mumbai', country: 'IN', lat: 19.08, lon: 72.88, kind: 'city' },
  { code: 'DEL', city: 'New Delhi', country: 'IN', lat: 28.56, lon: 77.10, kind: 'airport' },
  { code: 'newdelhi', city: 'New Delhi', country: 'IN', lat: 28.61, lon: 77.21, kind: 'city' },
  { code: 'KIX', city: 'Osaka', country: 'JP', lat: 34.43, lon: 135.24, kind: 'airport' },
  { code: 'ITM', city: 'Osaka', country: 'JP', lat: 34.79, lon: 135.44, kind: 'airport' },
  { code: 'osaka', city: 'Osaka', country: 'JP', lat: 34.69, lon: 135.50, kind: 'city' },
  { code: 'PER', city: 'Perth', country: 'AU', lat: -31.94, lon: 115.97, kind: 'airport' },
  { code: 'perth', city: 'Perth', country: 'AU', lat: -31.95, lon: 115.86, kind: 'city' },
  { code: 'ICN', city: 'Seoul', country: 'KR', lat: 37.47, lon: 126.44, kind: 'airport' },
  { code: 'GMP', city: 'Seoul', country: 'KR', lat: 37.56, lon: 126.80, kind: 'airport' },
  { code: 'seoul', city: 'Seoul', country: 'KR', lat: 37.57, lon: 126.98, kind: 'city' },
  { code: 'PVG', city: 'Shanghai', country: 'CN', lat: 31.14, lon: 121.81, kind: 'airport' },
  { code: 'SHA', city: 'Shanghai', country: 'CN', lat: 31.20, lon: 121.34, kind: 'airport' },
  { code: 'shanghai', city: 'Shanghai', country: 'CN', lat: 31.23, lon: 121.47, kind: 'city' },
  { code: 'SIN', city: 'Singapore', country: 'SG', lat: 1.36, lon: 103.99, kind: 'airport' },
  { code: 'singapore', city: 'Singapore', country: 'SG', lat: 1.35, lon: 103.82, kind: 'city' },
  { code: 'SYD', city: 'Sydney', country: 'AU', lat: -33.95, lon: 151.18, kind: 'airport' },
  { code: 'sydney', city: 'Sydney', country: 'AU', lat: -33.87, lon: 151.21, kind: 'city' },
  { code: 'TPE', city: 'Taipei', country: 'TW', lat: 25.08, lon: 121.23, kind: 'airport' },
  { code: 'taipei', city: 'Taipei', country: 'TW', lat: 25.03, lon: 121.57, kind: 'city' },
  { code: 'HND', city: 'Tokyo', country: 'JP', lat: 35.55, lon: 139.78, kind: 'airport' },
  { code: 'NRT', city: 'Tokyo', country: 'JP', lat: 35.76, lon: 140.39, kind: 'airport' },
  { code: 'tokyo', city: 'Tokyo', country: 'JP', lat: 35.69, lon: 139.69, kind: 'city' },

  // Middle East / Africa
  { code: 'CAI', city: 'Cairo', country: 'EG', lat: 30.12, lon: 31.41, kind: 'airport' },
  { code: 'cairo', city: 'Cairo', country: 'EG', lat: 30.04, lon: 31.24, kind: 'city' },
  { code: 'CPT', city: 'Cape Town', country: 'ZA', lat: -33.97, lon: 18.60, kind: 'airport' },
  { code: 'capetown', city: 'Cape Town', country: 'ZA', lat: -33.92, lon: 18.42, kind: 'city' },
  { code: 'CAS', city: 'Casablanca', country: 'MA', lat: 33.56, lon: -7.59, kind: 'airport' },
  { code: 'casablanca', city: 'Casablanca', country: 'MA', lat: 33.57, lon: -7.59, kind: 'city' },
  { code: 'DOH', city: 'Doha', country: 'QA', lat: 25.27, lon: 51.61, kind: 'airport' },
  { code: 'DXB', city: 'Dubai', country: 'AE', lat: 25.25, lon: 55.36, kind: 'airport' },
  { code: 'dubai', city: 'Dubai', country: 'AE', lat: 25.20, lon: 55.27, kind: 'city' },
  { code: 'JNB', city: 'Johannesburg', country: 'ZA', lat: -26.14, lon: 28.25, kind: 'airport' },
  { code: 'johannesburg', city: 'Johannesburg', country: 'ZA', lat: -26.20, lon: 28.05, kind: 'city' },
  { code: 'LOS', city: 'Lagos', country: 'NG', lat: 6.58, lon: 3.32, kind: 'airport' },
  { code: 'lagos', city: 'Lagos', country: 'NG', lat: 6.52, lon: 3.38, kind: 'city' },
  { code: 'NBO', city: 'Nairobi', country: 'KE', lat: -1.32, lon: 36.93, kind: 'airport' },
  { code: 'nairobi', city: 'Nairobi', country: 'KE', lat: -1.29, lon: 36.82, kind: 'city' },
  { code: 'RUH', city: 'Riyadh', country: 'SA', lat: 24.96, lon: 46.70, kind: 'airport' },
  { code: 'TLV', city: 'Tel Aviv', country: 'IL', lat: 32.01, lon: 34.89, kind: 'airport' },
  { code: 'telaviv', city: 'Tel Aviv', country: 'IL', lat: 32.09, lon: 34.78, kind: 'city' },
];

/**
 * Three-letter shorthands operators actually write in router names — `par2`,
 * `lon1`, `nyc5`, `iad3` (§7.5). They are derived from the city entries above:
 * a shorthand reuses its city's coordinates, so no new fact is invented.
 * A shorthand that would point at two different cities is dropped: an ambiguous
 * hint is worse than no hint.
 */
const OPERATOR_SHORTHANDS = {
  Amsterdam: ['ams'], Athens: ['ath'], Atlanta: ['atl'], Auckland: ['akl'],
  Bangkok: ['bkk'], Barcelona: ['bcn'], Beijing: ['pek'], Berlin: ['ber'],
  Bilbao: ['bio'], Bogota: ['bog'], Bordeaux: ['bod'], Boston: ['bos'],
  Brisbane: ['bne'], Brussels: ['bru', 'brx'], Budapest: ['bud'],
  'Buenos Aires': ['bue', 'eze'], Cairo: ['cai'], 'Cape Town': ['cpt'],
  Casablanca: ['cas'], Chicago: ['chi'], Copenhagen: ['cph'], Dallas: ['dal'],
  Denver: ['den'], Doha: ['doh'], Dubai: ['dxb'], Dublin: ['dbl'],
  Dusseldorf: ['dus'], Edinburgh: ['edi'], Frankfurt: ['ffx'], Geneva: ['gva'],
  Guangzhou: ['gzh'], Hamburg: ['ham'], Helsinki: ['hel'], 'Hong Kong': ['hkg'],
  Houston: ['hou'], Istanbul: ['ist'], Jakarta: ['jkt'], Johannesburg: ['jnb'],
  'Kuala Lumpur': ['kul'], Lagos: ['lag'], Lima: ['lim'], Lisbon: ['lis'],
  London: ['lon', 'lnd'], 'Los Angeles': ['lax'], Lyon: ['lys'],
  Madrid: ['mdr'], Manchester: ['man'], Manila: ['mnl'], Marseille: ['mrs'],
  Melbourne: ['mel'], 'Mexico City': ['mex'], Miami: ['mia'], Milan: ['mil'],
  Minneapolis: ['msp'], Montreal: ['mtl'], Mumbai: ['bom'], Munich: ['muc'],
  Nairobi: ['nbo'], 'New Delhi': ['del'], 'New York': ['nyc'], Newark: ['ewr'],
  Osaka: ['osa'], Oslo: ['osl'], 'Panama City': ['pty'], Paris: ['par'],
  Perth: ['per'], Philadelphia: ['phl'], Phoenix: ['phx'], Prague: ['prg'],
  Reykjavik: ['kef'], 'Rio de Janeiro': ['rio'], Riyadh: ['ruh'], Rome: ['rom'],
  'San Diego': ['san'], 'San Francisco': ['sfo'], 'San Jose': ['sjc'],
  Santiago: ['scl'], 'Sao Paulo': ['sao'], Seattle: ['sea'], Seoul: ['sel'],
  Shanghai: ['sha'], Singapore: ['sgp'], Sofia: ['sof'], Stockholm: ['sto'],
  Stuttgart: ['str'], Sydney: ['syd'], Taipei: ['tpe'], 'Tel Aviv': ['tlv'],
  Tokyo: ['tyo'], Toronto: ['tor'], Toulouse: ['tls'], Vancouver: ['yvr'],
  Venice: ['vce'], Vienna: ['vie'], Warsaw: ['waw'], Washington: ['was', 'iad'],
  Zurich: ['zrh'],
};

/** Expand the shorthands into hint rows, reusing each city's own coordinates. */
function shorthandRows(rows) {
  const known = new Set(rows.map((row) => row.code.toLowerCase()));
  const byCity = new Map();
  for (const row of rows) {
    if (!byCity.has(row.city)) byCity.set(row.city, row);
  }
  const added = [];
  const claimed = new Map();
  for (const [city, codes] of Object.entries(OPERATOR_SHORTHANDS)) {
    const anchor = byCity.get(city);
    if (!anchor) continue;
    for (const code of codes) {
      if (claimed.has(code) && claimed.get(code) !== city) continue; // ambiguous
      claimed.set(code, city);
      if (known.has(code)) continue;
      added.push({ code, city, country: anchor.country, lat: anchor.lat, lon: anchor.lon, kind: 'city' });
    }
  }
  return added;
}

function main() {
  const withShorthands = [...RAW_HINTS, ...shorthandRows(RAW_HINTS)];
  const sorted = [...withShorthands].sort((a, b) => a.code.localeCompare(b.code));
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`wrote ${OUT}: ${sorted.length} hint entries`);
  updateProvenance('hints', { features: sorted.length });
}

main();
