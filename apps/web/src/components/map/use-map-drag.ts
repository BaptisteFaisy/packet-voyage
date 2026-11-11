import { useCallback, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { ProjectionKind } from '../../lib/map-geometry.ts';

/** Centred on the North Atlantic so the worked example fits the disc. */
const INITIAL_ROTATION: [number, number] = [-30, 30];

export interface MapDrag {
  rotation: [number, number];
  onPointerDown: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerMove: (event: ReactPointerEvent<HTMLCanvasElement>) => void;
  onPointerUp: () => void;
}

/** Drag-to-rotate of the globe (§5.9): the flat projection never rotates. */
export function useMapDrag(kind: ProjectionKind): MapDrag {
  const [rotation, setRotation] = useState<[number, number]>(INITIAL_ROTATION);
  const [dragFrom, setDragFrom] = useState<{ x: number; y: number; rot: [number, number] } | null>(null);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (kind !== 'globe') return;
      setDragFrom({ x: event.clientX, y: event.clientY, rot: rotation });
    },
    [kind, rotation],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>) => {
      if (!dragFrom || kind !== 'globe') return;
      const dx = (event.clientX - dragFrom.x) / 4;
      const dy = (event.clientY - dragFrom.y) / 4;
      setRotation([dragFrom.rot[0] + dx, Math.max(-85, Math.min(85, dragFrom.rot[1] - dy))]);
    },
    [dragFrom, kind],
  );

  const onPointerUp = useCallback(() => setDragFrom(null), []);

  return { rotation, onPointerDown, onPointerMove, onPointerUp };
}
