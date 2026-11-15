"use client";

import {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, type ReactNode,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

type ToastKind = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  kind: ToastKind;
  duration?: number;
}

interface ToastCtx {
  toast: (message: string, kind?: ToastKind, duration?: number) => void;
  success: (msg: string) => void;
  error:   (msg: string) => void;
  info:    (msg: string) => void;
}

const Ctx = createContext<ToastCtx>({
  toast: () => {}, success: () => {}, error: () => {}, info: () => {},
});

const ICONS: Record<ToastKind, ReactNode> = {
  success: <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />,
  error:   <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />,
  warning: <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />,
  info:    <Info className="w-4 h-4 text-blue-500 shrink-0" />,
};

const BG: Record<ToastKind, string> = {
  success: "bg-white dark:bg-sunset-dark-surface border-emerald-200 dark:border-emerald-900",
  error:   "bg-white dark:bg-sunset-dark-surface border-red-200 dark:border-red-900",
  warning: "bg-white dark:bg-sunset-dark-surface border-amber-200 dark:border-amber-900",
  info:    "bg-white dark:bg-sunset-dark-surface border-sunset-border dark:border-sunset-dark-border",
};

function ToastItem({ t, onDismiss }: { t: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(t.id), t.duration ?? 3800);
    return () => clearTimeout(timer);
  }, [t, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 32, scale: 0.92 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      exit={{   opacity: 0, y: -16, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      className={`toast border ${BG[t.kind]}`}
      role="alert"
    >
      {ICONS[t.kind]}
      <span className="flex-1 text-sunset-text dark:text-sunset-dark-text text-sm leading-snug">
        {t.message}
      </span>
      <button
        onClick={() => onDismiss(t.id)}
        className="shrink-0 text-sunset-muted hover:text-sunset-text dark:text-sunset-dark-muted dark:hover:text-sunset-dark-text transition-colors p-0.5"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((p) => p.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((message: string, kind: ToastKind = "info", duration?: number) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((p) => [...p.slice(-4), { id, message, kind, duration }]);
  }, []);

  const ctx: ToastCtx = {
    toast:   add,
    success: (m) => add(m, "success"),
    error:   (m) => add(m, "error"),
    info:    (m) => add(m, "info"),
  };

  return (
    <Ctx.Provider value={ctx}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ToastItem key={t.id} t={t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
