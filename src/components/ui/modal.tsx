"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/primitives/dialog";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean; onClose: () => void; title?: string; children: ReactNode;
  className?: string; variant?: "center" | "bottom-sheet";
}
/** Controlled shadcn/Radix dialog, including focus return for non-DialogTrigger callers. */
export function Modal({ isOpen, onClose, title = "Details", children, className, variant = "center" }: ModalProps) {
  const triggerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isOpen]);
  return <Dialog open={isOpen} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent aria-describedby={undefined} className={cn(variant === "bottom-sheet" && "ui-dialog-sheet", className)}
      onOpenAutoFocus={() => { triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
      onCloseAutoFocus={event => { event.preventDefault(); if (triggerRef.current?.isConnected) triggerRef.current.focus(); }}>
      <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
      {children}
    </DialogContent>
  </Dialog>;
}
