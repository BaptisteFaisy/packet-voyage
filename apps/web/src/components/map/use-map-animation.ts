import { useEffect, useState } from 'react';
import type { AnimationPlan } from '../../lib/map-animation.ts';

/**
 * Stitching clock (§12.3): returns the elapsed time of the hop-by-hop
 * animation. When `animate` is false (settings off or prefers-reduced-motion,
 * VOY-F-34) the plan is considered finished immediately — no rAF runs.
 */
export function useMapAnimation(plan: AnimationPlan, animate: boolean): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!animate) {
      setElapsed(plan.totalMs);
      return;
    }
    setElapsed(0);
    let frame = 0;
    let start = 0;
    const step = (time: number) => {
      if (start === 0) start = time;
      setElapsed(time - start);
      if (time - start < plan.totalMs) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [animate, plan]);

  return animate ? elapsed : plan.totalMs;
}
