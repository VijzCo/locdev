// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';

// Public
import PublicLayout from './components/public/PublicLayout';
import Home from './pages/public/Home';
import About from './pages/public/About';
import Leadership from './pages/public/Leadership';
import Factories from './pages/public/Factories';
import Products from './pages/public/Products';
import Contact from './pages/public/Contact';

// Admin
import Login from './pages/admin/Login';
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import AdminCompany from './pages/admin/AdminCompany';
import AdminLeadership from './pages/admin/AdminLeadership';
import AdminFactories from './pages/admin/AdminFactories';
import AdminProducts from './pages/admin/AdminProducts';
import AdminServices from './pages/admin/AdminServices';
import AdminSettings from './pages/admin/AdminSettings';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '14px',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,.15)',
            },
            success: { iconTheme: { primary: '#c9a84c', secondary: '#fff' } },
          }}
        />
        <Routes>
          {/* Public website */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/leadership" element={<Leadership />} />
            <Route path="/factories" element={<Factories />} />
            <Route path="/products" element={<Products />} />
            <Route path="/contact" element={<Contact />} />
          </Route>

          {/* Admin login */}
          <Route path="/admin" element={<Login />} />

          {/* Admin dashboard — protected */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="company" element={<AdminCompany />} />
            <Route path="leadership" element={<AdminLeadership />} />
            <Route path="factories" element={<AdminFactories />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="services" element={<AdminServices />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
