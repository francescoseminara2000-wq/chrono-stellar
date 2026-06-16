import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Outlet } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { Profile } from './pages/Profile';
import { Orders } from './pages/Orders';
import { RequireAdmin } from './components/RequireAdmin';

import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ProductManager } from './pages/admin/ProductManager';
import { OrderManager } from './pages/admin/OrderManager';
import { CustomerManager } from './pages/admin/CustomerManager';
import { SettingsManager } from './pages/admin/SettingsManager';
import { PageManager } from './pages/admin/PageManager';
import { DeliveryMap } from './pages/admin/DeliveryMap';
import { StaticPage } from './pages/StaticPage';

import { AlertBanner } from './components/AlertBanner';
import { Toaster } from './components/ui/Toaster';
import { useAppState } from './store/useAppState';
import { getThemeColors } from './utils/themeHelper';
import { sanitizeImageUrl } from './utils/imageUrl';

// Scroll to top on route change
const ScrollToTop = () => {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);
    return null;
};

const Layout = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex flex-col font-sans text-nature-900">
        <ScrollToTop />
        <AlertBanner />
        <Header />
        <main className="flex-1">
            {children}
        </main>
        <Footer />
        <Toaster />
    </div>
);

function App() {
    const { settings, fetchSettings } = useAppState();

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    useEffect(() => {
        if (settings) {
            if (settings.siteName) {
                document.title = settings.siteName;
            }
            if (settings.logoUrl) {
                const faviconUrl = sanitizeImageUrl(settings.logoUrl);
                const faviconTag = document.getElementById('dynamic-favicon') as HTMLLinkElement;
                if (faviconTag) {
                    faviconTag.href = faviconUrl;
                }
            }
            const colors = getThemeColors(settings);
            const styleId = 'dynamic-theme-vars';
            let styleTag = document.getElementById(styleId) as HTMLStyleElement;
            if (!styleTag) {
                styleTag = document.createElement('style');
                styleTag.id = styleId;
                document.head.appendChild(styleTag);
            }
            styleTag.innerHTML = `
                :root {
                    --color-nature-50: ${colors.nature50};
                    --color-nature-100: ${colors.nature100};
                    --color-nature-500: ${colors.nature500};
                    --color-nature-600: ${colors.nature600};
                    --color-nature-900: ${colors.nature900};
                    --color-fruit-500: ${colors.fruit500};
                }
            `;
        }
    }, [settings]);

    return (
        <Router>
            <Routes>
                {/* Public Routes - Wrapped in Main Layout */}
                <Route element={<Layout><Outlet /></Layout>}>
                    <Route path="/" element={<Home />} />
                    <Route path="/shop" element={<Shop />} />
                    <Route path="/shop/:id" element={<ProductDetail />} />
                    <Route path="/shop/:id" element={<ProductDetail />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/orders" element={<Orders />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route path="/pages/:slug" element={<StaticPage />} />
                </Route>

                // ...

                // ...
                {/* Admin Routes - Separate Layout */}
                <Route element={<RequireAdmin />}>
                    <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<AdminDashboard />} />
                        <Route path="products" element={<ProductManager />} />
                        <Route path="settings" element={<SettingsManager />} />
                        <Route path="pages" element={<PageManager />} />
                        <Route path="orders" element={<OrderManager />} />
                        <Route path="logistics" element={<DeliveryMap />} />
                        <Route path="customers" element={<CustomerManager />} />
                    </Route>
                </Route>
            </Routes>
        </Router>
    );
}

export default App;
