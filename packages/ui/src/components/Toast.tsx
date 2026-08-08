import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Glass } from './Glass';
import './Toast.css';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export interface ToastOptions {
  readonly title: string;
  readonly description?: string;
  readonly tone?: ToastTone;
  readonly durationMs?: number;
}

interface ToastItem extends ToastOptions {
  readonly id: number;
}

interface ToastApi {
  show: (opts: ToastOptions) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Access the toast API. Must be used within <ToastProvider>. */
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>.');
  return ctx;
}

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (opts: ToastOptions) => {
      const id = nextId++;
      setToasts((list) => [...list, { ...opts, id }]);
      const duration = opts.durationMs ?? 4000;
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), duration),
      );
    },
    [dismiss],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="lm-toast__viewport" role="region" aria-label="Notifications">
        {toasts.map((t) => (
          <Glass key={t.id}>
            <div className={`lm-toast lm-toast--${t.tone ?? 'info'}`} role="status">
              <div className="lm-toast__content">
                <div className="lm-toast__title">{t.title}</div>
                {t.description != null && <div className="lm-toast__desc">{t.description}</div>}
              </div>
              <button
                className="lm-toast__close"
                aria-label="Dismiss"
                onClick={() => dismiss(t.id)}
              >
                ×
              </button>
            </div>
          </Glass>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
