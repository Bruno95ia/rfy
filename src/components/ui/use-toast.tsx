'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { cn } from '@/lib/cn';

type ToastVariant = 'default' | 'success' | 'destructive';

export interface ToastConfig {
  title?: string;
  description?: string;
  variant?: ToastVariant;
}

const ToastContext = React.createContext<
  ((config: ToastConfig) => void) | null
>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    return {
      toast: () => {},
    };
  }
  return { toast: ctx };
}

interface ToastState extends ToastConfig {
  open: boolean;
}

export function Toaster({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ToastState>({
    open: false,
    title: '',
    description: '',
    variant: 'default',
  });

  const toast = React.useCallback((config: ToastConfig) => {
    setState({
      open: true,
      title: config.title,
      description: config.description,
      variant: config.variant ?? 'default',
    });
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastPrimitive.Provider swipeDirection="right">
        <ToastPrimitive.Viewport className="fixed right-0 top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:right-0 sm:flex-col md:max-w-[420px]" />
        <ToastPrimitive.Root
          open={state.open}
          onOpenChange={(open) => setState((s) => ({ ...s, open }))}
          duration={4000}
          className={cn(
            'group pointer-events-auto flex w-full flex-col gap-1 overflow-hidden rounded-[var(--radius-lg)] border p-4 shadow-[var(--shadow-lg)]',
            state.variant === 'success' &&
              'border-[var(--color-success-soft)] bg-[var(--color-surface-elevated)]',
            state.variant === 'destructive' &&
              'border-[var(--color-danger-soft)] bg-[var(--color-surface-elevated)]',
            state.variant === 'default' &&
              'border-[var(--color-border)] bg-[var(--color-surface-elevated)]'
          )}
        >
          {state.title && (
            <ToastPrimitive.Title
              className={cn(
                'text-sm font-semibold',
                state.variant === 'success' && 'text-[var(--color-success-foreground)]',
                state.variant === 'destructive' && 'text-[var(--color-danger-foreground)]',
                state.variant === 'default' && 'text-[var(--color-text)]'
              )}
            >
              {state.title}
            </ToastPrimitive.Title>
          )}
          {state.description && (
            <ToastPrimitive.Description className="text-sm text-[var(--color-text-muted)]">
              {state.description}
            </ToastPrimitive.Description>
          )}
        </ToastPrimitive.Root>
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
