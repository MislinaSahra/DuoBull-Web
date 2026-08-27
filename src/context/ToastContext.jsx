import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

const ToastContext = createContext(null);
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(null), 3200);
  }, []);
  const value = useMemo(() => ({ showToast }), [showToast]);
  return <ToastContext.Provider value={value}>{children}{toast?<div role="status" aria-live="polite" className={`fixed right-5 top-5 z-[120] flex max-w-sm items-center gap-3 rounded-xl border px-4 py-3 text-sm font-black shadow-2xl backdrop-blur ${toast.type==="error"?"border-red-300/25 bg-[#32151d] text-red-100":"border-emerald-300/25 bg-[#10251d] text-emerald-100"}`}><CheckCircle2 className="h-5 w-5 shrink-0"/><span>{toast.message}</span><button type="button" onClick={()=>setToast(null)} aria-label="Bildirimi kapat"><X className="h-4 w-4"/></button></div>:null}</ToastContext.Provider>;
}
export function useToast(){const value=useContext(ToastContext);if(!value)throw new Error("useToast must be used inside ToastProvider");return value;}
