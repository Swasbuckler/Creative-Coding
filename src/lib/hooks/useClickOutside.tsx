import { useCallback, useEffect, type RefObject } from "react";

export default function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handleOnClickOutside: (event: MouseEvent | TouchEvent) => void,
) {

  const clickOutside = useCallback((event: MouseEvent | TouchEvent) => {
    if (!ref.current || ref.current.contains(event.target as Node)) {
      return;
    }

    handleOnClickOutside(event);
  }, [ref, handleOnClickOutside]);

  useEffect(() => {

    document.addEventListener('mousedown', clickOutside);
    document.addEventListener('touchstart', clickOutside);

    return () => {
      document.removeEventListener('mousedown', clickOutside);
      document.removeEventListener('touchstart', clickOutside);
    };
  }, [ref, handleOnClickOutside]);
}