"use client";

import { useState, createContext, useContext, useCallback, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle, Info, X } from "lucide-react";
import { Button } from "./button";

type ConfirmVariant = "danger" | "warning" | "info" | "success";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within ConfirmProvider");
  }
  return context.confirm;
}

const variantConfig = {
  danger: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10", btn: "bg-red-600 hover:bg-red-700" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10", btn: "bg-amber-600 hover:bg-amber-700" },
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", btn: "bg-blue-600 hover:bg-blue-700" },
  success: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10", btn: "bg-green-600 hover:bg-green-700" },
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions | null;
    resolve: ((value: boolean) => void) | null;
  }>({ isOpen: false, options: null, resolve: null });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({ isOpen: true, options, resolve });
    });
  }, []);

  const handleClose = (result: boolean) => {
    state.resolve?.(result);
    setState({ isOpen: false, options: null, resolve: null });
  };

  const config = state.options?.variant ? variantConfig[state.options.variant] : variantConfig.warning;
  const Icon = config.icon;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AnimatePresence>
        {state.isOpen && state.options && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => handleClose(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => handleClose(false)}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-secondary transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>

              <div className="p-6 space-y-4">
                <div className={`w-12 h-12 rounded-full ${config.bg} flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${config.color}`} />
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-foreground">{state.options.title}</h3>
                  <p className="mt-2 text-muted-foreground">{state.options.message}</p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => handleClose(false)}>
                    {state.options.cancelText || "Cancelar"}
                  </Button>
                  <Button className={`flex-1 text-white ${config.btn}`} onClick={() => handleClose(true)}>
                    {state.options.confirmText || "Confirmar"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
