import { useEffect, useState } from 'react';
import { throttle } from 'throttle-debounce';

const useWindowWidth = (): number | undefined => {
  const isClient = typeof window !== 'undefined';

  const getWidth = () => {
    if (!isClient) {
      return undefined;
    }

    return window.innerWidth;
  };

  const [windowWidth, setWindowWidth] = useState(getWidth);

  useEffect(() => {
    if (!isClient) {
      return undefined;
    }

    const handleResize = throttle(16, () => {
      setWindowWidth(getWidth());
    });

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowWidth;
};

export default useWindowWidth;
