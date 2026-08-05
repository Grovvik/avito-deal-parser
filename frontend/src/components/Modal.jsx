import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children }) {
  const [rendered, setRendered] = useState(isOpen);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      setIsClosing(false);
    } else if (rendered) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setRendered(false);
        setIsClosing(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, rendered]);

  if (!rendered) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all duration-200 ${
        isClosing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
      onClick={onClose}
    >
      <div 
        className={`bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border/80 relative flex flex-col max-h-[90vh] overflow-hidden ${
          isClosing ? 'animate-scale-out' : 'animate-scale-in'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b">
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground p-1.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
