import { useMemo, type RefObject } from "react";
import type { ThreeJSElementPosition } from "../types";

export default function ThreeJSElementContainer({
  ref,
  position,
  className,
}: {
  ref: RefObject<HTMLDivElement>,
  position: ThreeJSElementPosition,
  className?: string,
}) {

  const elementPosition = useMemo(() => {
    switch(position) {
      case 'TOP_LEFT':
        return '[&>div]:right-auto! [&>div]:left-0!';
      case 'TOP_RIGHT':
        return '[&>div]:right-0! [&>div]:left-auto!';
    }
  }, [position]);

  return (
    <div
      ref={ref}
      className={`relative [&>div]:absolute! ${elementPosition} z-10${className ? ` ${className}` : ''}`}
    />
  );
}