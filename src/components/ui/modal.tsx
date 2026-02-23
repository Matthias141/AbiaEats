'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  variant?: 'center' | 'bottom-sheet';
}

export function Modal({ isOpen, onClose, title, children, className, variant = 'center' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className={cn(
          'relative z-10 w-full bg-dark-card border border-dark-border overflow-y-auto max-h-[90vh] custom-scrollbar',
          variant === 'center' && 'max-w-lg mx-4 rounded-2xl animate-scale-in',
          variant === 'bottom-sheet' && 'max-w-lg sm:mx-auto rounded-t-2xl sm:rounded-2xl animate-slide-up',
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h2 className="font-heading text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="tap-target w-8 h-8 rounded-full bg-dark-border/50 flex items-center justify-center hover:bg-dark-border transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}
