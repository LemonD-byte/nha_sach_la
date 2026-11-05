import { createContext, useContext, useState, useCallback } from 'react';

const Ctx = createContext(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const show = useCallback((text, type = 'ok') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 2800);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      {toast && <div className={`toast toast-${toast.type}`} role="status">{toast.text}</div>}
    </Ctx.Provider>
  );
}
