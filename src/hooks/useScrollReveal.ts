import { useEffect, useRef, useState } from 'react';

interface ScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

/**
 * useScrollReveal Hook
 * Detects when elements enter viewport and triggers reveal animations
 * 
 * Usage:
 * const ref = useScrollReveal<HTMLDivElement>({ threshold: 0.2 });
 * return <div ref={ref} className="scroll-reveal">Content</div>
 */
export const useScrollReveal = <T extends HTMLElement>({
  threshold = 0.1,
  rootMargin = '-50px',
  triggerOnce = true,
}: ScrollRevealOptions = {}) => {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          element.classList.add('revealed');
          
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsVisible(false);
          element.classList.remove('revealed');
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, isVisible };
};

/**
 * useStaggeredReveal Hook
 * Reveals multiple elements with staggered delays
 * 
 * Usage:
 * const { refs, addRef } = useStaggeredReveal(4, 100);
 * return items.map((item, i) => (
 *   <div key={i} ref={addRef(i)} className="scroll-reveal">{item}</div>
 * ));
 */
export const useStaggeredReveal = (count: number, delayIncrement: number = 100) => {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const [visibleItems, setVisibleItems] = useState<boolean[]>(new Array(count).fill(false));

  useEffect(() => {
    const observers = refs.current.map((element, index) => {
      if (!element) return null;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setVisibleItems((prev) => {
                const newState = [...prev];
                newState[index] = true;
                return newState;
              });
              element.classList.add('revealed');
              observer.unobserve(element);
            }, index * delayIncrement);
          }
        },
        {
          threshold: 0.1,
          rootMargin: '-50px',
        }
      );

      observer.observe(element);
      return observer;
    });

    return () => {
      observers.forEach((observer, index) => {
        if (observer && refs.current[index]) {
          observer.unobserve(refs.current[index]!);
        }
      });
    };
  }, [delayIncrement]);

  const addRef = (index: number) => (el: HTMLElement | null) => {
    refs.current[index] = el;
  };

  return { refs, addRef, visibleItems };
};

/**
 * useParallaxScroll Hook
 * Creates parallax scroll effects
 * 
 * Usage:
 * const { ref, offset } = useParallaxScroll(0.5);
 * return <div ref={ref} style={{ transform: `translateY(${offset}px)` }}>Content</div>
 */
export const useParallaxScroll = (speed: number = 0.5) => {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      
      const rect = ref.current.getBoundingClientRect();
      const scrolled = window.pageYOffset;
      const rate = scrolled * speed;
      
      setOffset(rate);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return { ref, offset };
};

export default useScrollReveal;