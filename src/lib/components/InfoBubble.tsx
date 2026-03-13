import { IconInfoCircle } from "@tabler/icons-react";
import type { StaticElementPosition } from "../types";
import { useMemo, useRef, useState } from "react";
import useClickOutside from "../hooks/useClickOutside";

export default function InfoBubble({
  position,
  size,
  className,
  iconClassName,
  infoClassName,
  children,
}: {
  position: StaticElementPosition,
  size: number,
  className?: string,
  iconClassName?: string,
  infoClassName?: string,
  children?: React.ReactNode,
}) {

  const [openInfo, setOpenInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  const { elementPosition, infoPosition } = useMemo(() => {

    switch(position) {
      case 'TOP_LEFT':
        return {
          elementPosition: 'left-2 top-2',
          infoPosition: `left-${size + 2} top-${size} mr-${size + 2}`,
        };
      case 'TOP':
        return {
          elementPosition: 'left-1/2 -translate-x-1/2 top-2',
          infoPosition: `left-1/2 -translate-x-1/2 top-${size + 2}`,
        };
      case 'TOP_RIGHT':
        return {
          elementPosition: 'right-2 top-2',
          infoPosition: `right-${size + 2} top-${size} ml-${size + 2}`,
        };
      case 'RIGHT':
        return {
          elementPosition: 'right-2 top-1/2 -translate-y-1/2',
          infoPosition: `right-${size + 2} top-1/2 -translate-y-1/2`,
        };
      case 'BOTTOM_RIGHT':
        return {
          elementPosition: 'right-2 bottom-2',
          infoPosition: `right-${size + 2} bottom-${size} ml-${size + 2}`,
        };
      case 'BOTTOM':
        return {
          elementPosition: 'left-1/2 -translate-x-1/2 bottom-2',
          infoPosition: `left-1/2 -translate-x-1/2 bottom-${size + 2}`,
        };
      case 'BOTTOM_LEFT':
        return {
          elementPosition: 'left-2 bottom-2',
          infoPosition: `left-${size + 2} bottom-${size} mr-${size + 2}`,
        };
      case 'LEFT':
        return {
          elementPosition: 'left-2 top-1/2 -translate-y-1/2',
          infoPosition: `left-${size + 2} top-1/2 -translate-y-1/2`,
        };
    }
  }, [position, size]);

  const handleClickOutside = () => {
    setOpenInfo(() => false);
  }

  useClickOutside(infoRef, handleClickOutside);

  return (
    <>
      <div 
        title="Additional Information"
        className={`absolute transform transition-all ease-in-out ${elementPosition} z-10${className ? ` ${className}` : ''}`}
      >
        <IconInfoCircle 
          className={`size-${size} cursor-pointer${iconClassName ? ` ${iconClassName}` : ''}`} 
          onClick={() => setOpenInfo(() => true)}
        />
      </div>
      <div 
        ref={infoRef}
        className={`absolute transform transition-all duration-300 mr-10 ease-in-out ${infoPosition} z-10 ${openInfo ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}${infoClassName ? ` ${infoClassName}` : ''}`}
      >
        {children}
      </div>
    </>
  );
}