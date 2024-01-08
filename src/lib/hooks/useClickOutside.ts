import { useEffect, useRef } from "react";

const useClickOutside = (callbackInside: Function,callbackOutside: Function) => {
  const ref = useRef<any>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        callbackOutside();
      }else{
        callbackInside()
      }
    };

    document.addEventListener("click", handleClick, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
    };
  }, [ref,callbackInside, callbackOutside]);

  return ref;
};

export default useClickOutside;