import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, AlertCircle, Info } from 'lucide-react';
import { useTimerManager } from '../hooks/useCleanup';

export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

interface ActionFeedbackProps {
  type: FeedbackType;
  message: string;
  isVisible: boolean;
  duration?: number;
  onClose?: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
}

const ActionFeedback: React.FC<ActionFeedbackProps> = ({
  type,
  message,
  isVisible,
  duration = 3000,
  onClose,
  position = 'top-right'
}) => {
  const [show, setShow] = useState(isVisible);
  const { setTimeout } = useTimerManager();

  useEffect(() => {
    setShow(isVisible);
    
    if (isVisible && duration > 0) {
      setTimeout(() => {
        setShow(false);
        onClose?.();
      }, duration);
    }
  }, [isVisible, duration, onClose, setTimeout]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check className="w-5 h-5" />;
      case 'error':
        return <X className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      case 'info':
        return <Info className="w-5 h-5" />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
    }
  };

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'center':
        return 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className={`fixed ${getPositionClasses()} z-50`}
          initial={{ opacity: 0, scale: 0.8, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        >
          <div className={`${getColors()} rounded-lg px-4 py-3 shadow-lg flex items-center space-x-2 min-w-[200px] max-w-[400px]`}>
            {getIcon()}
            <span className="text-sm font-medium">{message}</span>
            {onClose && (
              <button
                onClick={() => {
                  setShow(false);
                  onClose();
                }}
                className="ml-2 hover:opacity-80 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ActionFeedback;