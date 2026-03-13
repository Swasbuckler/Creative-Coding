import { IconBrandGithub } from "@tabler/icons-react";
import type { StaticElementPosition } from "../types";
import { useMemo } from "react";

export default function GitHubConnection({
  url,
  position,
  size,
  className,
  iconClassName,
}: {
  url: string,
  position: StaticElementPosition,
  size: number,
  className?: string,
  iconClassName?: string,
}) {

  const elementPosition = useMemo(() => {
    switch(position) {
      case 'TOP_LEFT':
        return 'left-2 top-2';
      case 'TOP':
        return 'left-1/2 -translate-x-1/2 top-2';
      case 'TOP_RIGHT':
        return 'right-2 top-2';
      case 'RIGHT':
        return 'right-2 top-1/2 -translate-y-1/2';
      case 'BOTTOM_RIGHT':
        return 'right-2 bottom-2';
      case 'BOTTOM':
        return 'left-1/2 -translate-x-1/2 bottom-2';
      case 'BOTTOM_LEFT':
        return 'left-2 bottom-2';
      case 'LEFT':
        return 'left-2 top-1/2 -translate-y-1/2';
    }
  }, [position]);

  return (
    <div 
      title="GitHub Reference"
      className={`absolute transform transition-all ease-in-out ${elementPosition} size-${size} cursor-pointer z-10${className ? ` ${className}` : ''}`}
    >
      <a 
        href={url}
        target="_blank"
      >
        <IconBrandGithub className={`size-${size}${iconClassName ? ` ${iconClassName}` : ''}`} />
      </a>
    </div>
  );
}