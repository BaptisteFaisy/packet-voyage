/**
 * The six sample journeys of VOY-F-44: an ocean crossing, a continental route,
 * a detour, a rejection by the light, an anycast hop and a trace with gaps.
 *
 * A scenario is a departure, a target and a list of hops. Delays are NOT
 * written by hand: they are derived from the real geometry (fibre speed plus a
 * realistic inflation), so no scenario can contradict physics — which is the
 * whole point of the product.
 */
import type { City } from './cities.ts';
import { city, NETWORKS } from './cities.ts';
import type { NetworkKey } from './cities.ts';

export interface ScenarioHop {
  /** Router name: its hints are what an offline read can use. */
  name: string;
  /** Where the hop really is. `null` means nothing can locate it. */
  at: City | null;
  /** A wrong answer from a geolocation database, to be rejected by the light. */
  geodbSays?: City;
  /** Anycast instances: only the delay-compatible one may be kept. */
  anycast?: City[];
  /** The hop stays silent: `* * *`. */
  silent?: boolean;
  network?: NetworkKey;
  ixp?: string;
  /** Extra round-trip delay, ms — queues, detours, slow responders. */
  extraMs?: number;
}

export interface Scenario {
  slug: string;
  title: { en: string; fr: string };
  blurb: { en: string; fr: string };
  feature: string;
  from: City;
  /** True when the departure is declared by the user rather than deduced. */
  declared: boolean;
  targetHost: string;
  family: 4 | 6;
  tracedAt: string;
  hops: ScenarioHop[];
}

const transit = (name: string, at: City | null, extra: Partial<ScenarioHop> = {}): ScenarioHop => ({
  name,
  at,
  network: 'transit',
  ...extra,
});

export const SCENARIOS: Scenario[] = [
  {
    slug: 'ocean-crossing',
    title: { en: 'Lyon to Ashburn, across the Atlantic', fr: 'Lyon — Ashburn, par l’Atlantique' },
    blurb: {
      en: 'A request to a Virginian host leaves France, crosses the Channel, then the ocean.',
      fr: 'Une requête vers un serveur de Virginie quitte la France, passe la Manche, puis l’océan.',
    },
    feature: 'sea-crossing-with-compatible-cables',
    from: city('lyon'),
    declared: true,
    targetHost: 'www.example.org',
    family: 4,
    tracedAt: '2026-11-12T09:14:03Z',
    hops: [
      { name: 'gw.home.example', at: null, silent: false, network: 'access' },
      { name: 'bras-lyon.access.example.net', at: null, network: 'access' },
      transit('be10.par2.isp.example', city('paris'), { network: 'isp' }),
      transit('ix-paris.transit.example.net', city('paris'), { ixp: 'Example-IX Paris', geodbSays: city('ashburn') }),
      transit('ae3.lon1.transit.example.net', city('london')),
      transit('ae7.lon4.transit.example.net', city('london')),
      transit('be2.nyc2.transit.example.net', city('newYork')),
      transit('be5.nyc5.transit.example.net', city('newYork')),
      transit('xe0.iad3.host.example.com', city('ashburn'), { network: 'host' }),
    ],
  },
  {
    slug: 'continental',
    title: { en: 'Paris to Frankfurt, overland', fr: 'Paris — Francfort, par la terre' },
    blurb: {
      en: 'Four hops inside one continent: the tool cannot tell land from a channel cable, and says so.',
      fr: 'Quatre étapes sur un même continent : l’outil ne peut pas trancher entre terre et câble, et le dit.',
    },
    feature: 'undetermined-segments-no-cable-claim',
    from: city('paris'),
    declared: true,
    targetHost: 'api.example.eu',
    family: 4,
    tracedAt: '2026-11-12T10:02:11Z',
    hops: [
      { name: 'gw.home.example', at: null, network: 'access' },
      transit('th2-eqix-par1.example.de', city('paris'), { ixp: 'Example-IX Paris', network: 'isp' }),
      transit('ams1-ix-dc4.example.de', city('amsterdam'), { ixp: 'Example-IX Amsterdam' }),
      transit('duss2-core-ix1.example.de', city('frankfurt')),
      transit('fra.host.example.eu', city('frankfurt'), { network: 'host' }),
    ],
  },
  {
    slug: 'detour',
    title: { en: 'Singapore to Frankfurt, via Tokyo', fr: 'Singapour — Francfort, par Tokyo' },
    blurb: {
      en: 'The route climbs to Japan, comes back down to Hong Kong, then heads west: a zigzag the geometry exposes.',
      fr: 'La route monte au Japon, redescend à Hong Kong, puis file vers l’ouest : un zigzag que la géométrie démasque.',
    },
    feature: 'zigzag-detour-detected',
    from: city('singapore'),
    declared: false,
    targetHost: 'api.example.eu',
    family: 4,
    tracedAt: '2026-11-12T11:20:45Z',
    hops: [
      transit('sgt.core-ix1.example.asia', city('singapore'), { network: 'isp', ixp: 'Example-IX Singapore' }),
      transit('sg1.dc2-ix7.example.asia', city('singapore')),
      transit('nrt1.edge9-tyo.example.asia', city('tokyo'), { extraMs: 6 }),
      transit('hkg3.dc4-hk.example.asia', city('hongKong'), { extraMs: 4 }),
      transit('lon9.xe6-core11.example.de', city('london'), { extraMs: 8 }),
      transit('fra.host.example.eu', city('frankfurt'), { network: 'host', extraMs: 6 }),
    ],
  },
  {
    slug: 'rejected-by-light',
    title: { en: 'The database says Ashburn, the light says no', fr: 'La base dit Ashburn, la lumière dit non' },
    blurb: {
      en: 'A hop answering in 9 ms cannot be 6,400 km away: the impossible location is rejected, and shown.',
      fr: 'Une étape qui répond en 9 ms ne peut pas être à 6 400 km : la localisation impossible est rejetée, et montrée.',
    },
    feature: 'impossible-location-rejected-and-shown',
    from: city('marseille'),
    declared: true,
    targetHost: 'www.example.org',
    family: 4,
    tracedAt: '2026-11-12T12:05:30Z',
    hops: [
      { name: 'gw.home.example', at: null, network: 'access' },
      transit('be10.par2.isp.example', city('paris'), { network: 'isp' }),
      transit('ix-paris.transit.example.net', city('paris'), { ixp: 'Example-IX Paris', geodbSays: city('ashburn') }),
      transit('ae3.lon1.transit.example.net', city('london'), { geodbSays: city('tokyo') }),
      transit('be2.nyc2.transit.example.net', city('newYork'), { geodbSays: city('sydney') }),
      transit('xe0.iad3.host.example.com', city('ashburn'), { network: 'host' }),
    ],
  },
  {
    slug: 'anycast',
    title: { en: 'One address, many places', fr: 'Une adresse, plusieurs lieux' },
    blurb: {
      en: 'A root server answers from the nearest instance: the tool keeps the compatible one and marks the hop anycast.',
      fr: 'Un serveur racine répond depuis l’instance la plus proche : l’outil garde celle compatible et marque l’étape anycast.',
    },
    feature: 'anycast-hop-single-compatible-instance',
    from: city('paris'),
    declared: true,
    targetHost: 'a.root-servers.example',
    family: 4,
    tracedAt: '2026-11-12T13:41:09Z',
    hops: [
      { name: 'gw.home.example', at: null, network: 'access' },
      transit('th2-eqix-par1.example.de', city('paris'), { network: 'isp', ixp: 'Example-IX Paris' }),
      {
        name: 'a.root-servers.example',
        at: city('paris'),
        anycast: [city('paris'), city('amsterdam'), city('sydney')],
        network: 'cloud',
      },
      transit('ix-london.transit.example.net', city('london')),
      transit('nyc.host.example.com', city('newYork'), { network: 'host' }),
    ],
  },
  {
    slug: 'with-gaps',
    title: { en: 'A route with holes', fr: 'Une route pleine de trous' },
    blurb: {
      en: 'Silent routers and unlocated hops: the tool counts the holes instead of filling them.',
      fr: 'Routeurs muets et étapes non localisées : l’outil compte les trous au lieu de les boucher.',
    },
    feature: 'silent-and-unlocated-hops-counted',
    from: city('lisbon'),
    declared: false,
    targetHost: 'www.example.org',
    family: 4,
    tracedAt: '2026-11-12T14:12:55Z',
    hops: [
      { name: 'gw.home.example', at: null, network: 'access' },
      transit('lx.p1-127-117.example.pt', null, { network: 'isp' }),
      { name: 'slow.responder.example.pt', at: null, silent: true },
      transit('mad3.core1.example.de', city('madrid')),
      { name: 'filtered.hop.example.de', at: null, silent: true },
      transit('par1.xe4.example.de', city('paris')),
      { name: 'mute.border.example.de', at: null },
      transit('www.example.org', city('ashburn'), { network: 'host' }),
    ],
  },
];

export const NETWORK_BY_KEY = NETWORKS;
