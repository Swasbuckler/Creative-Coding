export type NavLinkGroup = {
  path: string;
  label: string;
  children?: NavLinkGroup[];
  className?: string;
}

export type ThreeJSElementPosition = 'TOP_LEFT' | 'TOP_RIGHT';
export type StaticElementPosition = 'TOP_LEFT' | 'TOP' | 'TOP_RIGHT' | 'RIGHT' | 'BOTTOM_RIGHT' | 'BOTTOM' | 'BOTTOM_LEFT' | 'LEFT';