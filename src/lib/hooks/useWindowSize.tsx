import { useCallback, useEffect, useState } from "react";

/**
 * Returns width and height of the current window.
 */

export default function useWindowSize() {
  const [windowSize, setWindowSize] = useState<{
    width: number | undefined,
    height: number | undefined,
  }>({
    width: undefined,
    height: undefined,
  });

  const handleResize = useCallback(() => {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });
  }, []);

  useEffect(() => {

    handleResize();

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    }
  }, []);

  return windowSize;
}