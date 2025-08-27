import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning';
}

const Toast: React.FC<ToastProps> = ({ message, type }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3000); // Hide after 3 seconds

    return () => {
      clearTimeout(timer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className={`toast ${type}`}>
      <div className="toast-content">
        <span>{message}</span>
      </div>
    </div>
  );
};

export default Toast;