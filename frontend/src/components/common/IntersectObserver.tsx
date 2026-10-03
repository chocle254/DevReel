import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const IntersectObserver = () => {
  const location = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        // Dynamically invoke observer if available, fail-safe
        import('tailwindcss-intersect').then((module) => {
          const obs = module.Observer || (module as any).default?.Observer;
          if (obs && typeof obs.restart === 'function') {
            obs.restart();
          }
        }).catch(() => {});
      } catch (e) {
        // Fail-safe
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [location]);

  return null;
};

export default IntersectObserver;
