"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  variant?: "center" | "bottom-sheet";
}

// Native dialog provides focus containment, inert background, and focus restoration.
export function Modal({
  isOpen,
  onClose,
  title = "Details",
  children,
  className,
  variant = "center",
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isOpen) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={cn(
        "eats-dialog",
        variant === "bottom-sheet" && "eats-dialog-sheet",
        className,
      )}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
    >
      <div className="flex items-center justify-between gap-4 px-5 pb-3 pt-5">
        <h2
          id={titleId}
          className="font-body text-lg font-semibold text-gray-900"
        >
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-700"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>
      <div className="px-5 pb-6">{children}</div>
    </dialog>
  );
}
