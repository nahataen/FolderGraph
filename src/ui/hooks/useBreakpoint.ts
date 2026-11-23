import { useEffect, useState } from 'react';

export interface ViewportBreakpoints {
  isMobile: boolean;
  isCompact: boolean;
}

export function useBreakpoint(): ViewportBreakpoints {
  const getState = (): ViewportBreakpoints => {
    if (typeof window === 'undefined') {
      return { isMobile: false, isCompact: false };
    }
    return {
      isMobile: window.innerWidth < 768,
      isCompact: window.innerWidth < 1180,
    };
  };

  const [bp, setBp] = useState<ViewportBreakpoints>(getState);

  useEffect(() => {
    const onResize = () => setBp(getState());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return bp;
}
