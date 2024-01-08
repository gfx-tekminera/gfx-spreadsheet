import { useEffect, useState, useRef, RefObject, Dispatch } from "react";

export default function useOnScreen(ref: RefObject<HTMLElement>): {
  isOnScreen: boolean;
  setIsOnScreen: Dispatch<boolean>;
} {
  const observerRef = useRef<IntersectionObserver>();
  // or const observerRef = useRef<IntersectionObserver | null>(null);
  const [isOnScreen, setIsOnScreen] = useState(false);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(([entry]) =>
      setIsOnScreen(entry.isIntersecting)
    );
  }, []);

  useEffect(() => {
    if (ref.current) {
      observerRef.current?.observe(ref.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [ref]);

  return { isOnScreen, setIsOnScreen };
}
