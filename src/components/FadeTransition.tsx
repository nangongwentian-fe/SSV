import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FadeTransitionProps {
  children: React.ReactNode;
  isVisible?: boolean;
  duration?: number;
  delay?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

const FadeTransition: React.FC<FadeTransitionProps> = ({
  children,
  isVisible = true,
  duration = 0.3,
  delay = 0,
  className = '',
  direction = 'none'
}) => {
  const getInitialPosition = () => {
    switch (direction) {
      case 'up':
        return { y: 20, opacity: 0 };
      case 'down':
        return { y: -20, opacity: 0 };
      case 'left':
        return { x: 20, opacity: 0 };
      case 'right':
        return { x: -20, opacity: 0 };
      default:
        return { opacity: 0 };
    }
  };

  const getAnimatePosition = () => {
    switch (direction) {
      case 'up':
      case 'down':
        return { y: 0, opacity: 1 };
      case 'left':
      case 'right':
        return { x: 0, opacity: 1 };
      default:
        return { opacity: 1 };
    }
  };

  const getExitPosition = () => {
    switch (direction) {
      case 'up':
        return { y: -20, opacity: 0 };
      case 'down':
        return { y: 20, opacity: 0 };
      case 'left':
        return { x: -20, opacity: 0 };
      case 'right':
        return { x: 20, opacity: 0 };
      default:
        return { opacity: 0 };
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={className}
          initial={getInitialPosition()}
          animate={getAnimatePosition()}
          exit={getExitPosition()}
          transition={{
            duration,
            delay,
            ease: 'easeOut'
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FadeTransition;