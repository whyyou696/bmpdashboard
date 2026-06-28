'use client';

import { useState, useEffect } from 'react';

export default function Clock() {
  const [timeStr, setTimeStr] = useState('Loading time...');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      const time = now.toLocaleTimeString('id-ID');
      const date = now.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
      setTimeStr(`${time} | ${date}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="time-widget">
      <i className="fa-regular fa-clock"></i>
      <span>{timeStr}</span>
    </div>
  );
}
