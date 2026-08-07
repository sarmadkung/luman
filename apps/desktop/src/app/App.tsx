import { RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from '../error';
import { ThemeProvider } from '../theme';
import { ServicesProvider } from '../services';
import { router } from './router';

/** Application root: error boundary -> theme -> services -> router. */
export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ServicesProvider>
          <RouterProvider router={router} />
        </ServicesProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
