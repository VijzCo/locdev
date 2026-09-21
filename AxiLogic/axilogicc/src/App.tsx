import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from '@/routes/AppRoutes';
import { ThemeProvider } from '@/hooks/useTheme';
import { AuthProvider } from '@/auth/AuthProvider';
import { ConfigProvider } from '@/config/ConfigProvider';
import { PlatformProvider } from '@/platform/PlatformProvider';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary area="The application">
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <PlatformProvider>
              <ConfigProvider>
                <AppRoutes />
              </ConfigProvider>
            </PlatformProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
