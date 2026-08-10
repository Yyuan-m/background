import React, { useState, useEffect, useRef, useMemo } from 'react';

const CountUp = ({ end, duration = 1500, separator = ',' }) => {
  const [count, setCount] = useState(0);
  const rafRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const progress = Math.min((timestamp - startTimeRef.current) / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(eased * end));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      startTimeRef.current = null;
    };
  }, [end, duration]);

  const formatted = useMemo(() => {
    return count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  }, [count, separator]);

  return <span>{formatted}</span>;
};

export default React.memo(CountUp);
