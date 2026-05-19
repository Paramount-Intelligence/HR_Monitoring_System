'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "default",
  onConfirm,
  isLoading = false,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-[400px] rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-xl font-semibold text-[var(--text-primary)]">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-[var(--text-secondary)]">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-6 flex gap-2">
          <AlertDialogCancel 
            className="rounded-lg border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] font-medium bg-[var(--bg-elevated)]"
            disabled={isLoading}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}
            className={cn(
              buttonVariants({ variant: confirmVariant }),
              "rounded-lg font-medium min-w-[100px] border",
              confirmVariant === "destructive" 
                ? "bg-[var(--status-danger-text)] hover:opacity-90 text-white border-[var(--status-danger-border)]" 
                : "bg-[var(--accent-primary)] hover:opacity-90 text-white border-[var(--border-strong)]"
            )}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
