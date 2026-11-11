/**
 * Journey state shared by the map, the timeline, the hop list and the cards:
 * which journey is open, which hop is selected / hovered / focused by the
 * keyboard, and the text announced to screen readers (VOY-N-08).
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Journey } from '@packet-voyage/schema';

export interface SegmentRef {
  from: number;
  to: number;
}

interface JourneyContextValue {
  journey: Journey | null;
  setJourney: (journey: Journey | null) => void;
  selectedHop: number | null;
  selectHop: (ttl: number | null) => void;
  selectedSegment: SegmentRef | null;
  selectSegment: (segment: SegmentRef | null) => void;
  hoveredHop: number | null;
  hoverHop: (ttl: number | null) => void;
  focusHop: number | null;
  setFocusHop: (ttl: number | null) => void;
  announcement: string;
  announce: (message: string) => void;
}

const JourneyContext = createContext<JourneyContextValue | null>(null);

export function JourneyProvider(props: { children: ReactNode }) {
  const [journey, setJourney] = useState<Journey | null>(null);
  const [selectedHop, selectHop] = useState<number | null>(null);
  const [selectedSegment, selectSegment] = useState<SegmentRef | null>(null);
  const [hoveredHop, hoverHop] = useState<number | null>(null);
  const [focusHop, setFocusHop] = useState<number | null>(null);
  const [announcement, announce] = useState<string>('');

  const openJourney = useCallback((next: Journey | null) => {
    setJourney(next);
    selectHop(null);
    selectSegment(null);
    hoverHop(null);
    setFocusHop(null);
    announce('');
  }, []);

  const value = useMemo<JourneyContextValue>(
    () => ({
      journey,
      setJourney: openJourney,
      selectedHop,
      selectHop,
      selectedSegment,
      selectSegment,
      hoveredHop,
      hoverHop,
      focusHop,
      setFocusHop,
      announcement,
      announce,
    }),
    [journey, openJourney, selectedHop, selectedSegment, hoveredHop, focusHop, announcement],
  );

  return <JourneyContext.Provider value={value}>{props.children}</JourneyContext.Provider>;
}

const FALLBACK: JourneyContextValue = {
  journey: null,
  setJourney: () => {},
  selectedHop: null,
  selectHop: () => {},
  selectedSegment: null,
  selectSegment: () => {},
  hoveredHop: null,
  hoverHop: () => {},
  focusHop: null,
  setFocusHop: () => {},
  announcement: '',
  announce: () => {},
};

export function useJourneyState(): JourneyContextValue {
  return useContext(JourneyContext) ?? FALLBACK;
}
