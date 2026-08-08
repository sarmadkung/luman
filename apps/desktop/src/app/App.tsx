import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from '@luman/ui';
import { ErrorBoundary } from '../error';
import { ThemeProvider } from '../theme';
import { ServicesProvider } from '../services';
import { router } from './router';

/** Application root: error boundary -> theme -> toast -> services -> router. */
export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <ServicesProvider>
            <RouterProvider router={router} />
          </ServicesProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
