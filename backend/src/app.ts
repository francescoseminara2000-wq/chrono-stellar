import express from 'express';
import cors from 'cors';
import path from 'path';
import { OrderController } from './controllers/OrderController';
import { AdminController } from './controllers/AdminController';
import { DeliveryZoneController } from './controllers/DeliveryZoneController';
import { ProductController } from './controllers/ProductController';
import { AuthController } from './controllers/AuthController';
import { authenticateToken, requireAdmin } from './middleware/auth';
import { upload } from './middleware/upload';
import { AvatarController } from './controllers/AvatarController';
import { avatarUpload } from './middleware/avatarUpload';
import { NotificationController } from './controllers/NotificationController';
import { PushController } from './controllers/PushController';
import { StatsController } from './controllers/StatsController';
import { CategoryController } from './controllers/CategoryController';

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    console.log(`[Request] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Controllers
const orderController = new OrderController();
const adminController = new AdminController();
const productController = new ProductController();
const deliveryZoneController = new DeliveryZoneController();
const authController = new AuthController();
const avatarController = new AvatarController();
const notificationController = new NotificationController();
const pushController = new PushController();
const statsController = new StatsController();
const categoryController = new CategoryController();

// API Routes
// Public
app.get('/api/products', (req, res) => productController.listPublic(req, res));
app.get('/api/delivery-zones', (req, res) => deliveryZoneController.listActive(req, res)); // For checkout
app.post('/api/orders', (req, res) => orderController.create(req, res));
app.get('/api/orders/my-orders', authenticateToken, (req, res) => orderController.listMyOrders(req, res));
app.post('/api/orders/:id/cancel', authenticateToken, (req, res) => orderController.cancel(req, res));

// Admin
app.get('/api/admin/products', authenticateToken, requireAdmin, (req, res) => productController.list(req, res));
app.post('/api/admin/products', authenticateToken, requireAdmin, upload.single('image'), (req, res) => productController.create(req, res));
app.get('/api/admin/products/:id/stats', authenticateToken, requireAdmin, (req, res) => productController.getProductStats(req, res));
app.patch('/api/admin/products/bulk', authenticateToken, requireAdmin, (req, res) => productController.bulkUpdate(req, res));
app.delete('/api/admin/products/bulk', authenticateToken, requireAdmin, (req, res) => productController.bulkDelete(req, res));
app.put('/api/admin/products/:id', authenticateToken, requireAdmin, upload.single('image'), (req, res) => productController.update(req, res));
app.patch('/api/admin/products/:id/availability', authenticateToken, requireAdmin, (req, res) => productController.toggleAvailability(req, res));
app.patch('/api/admin/products/:id', authenticateToken, requireAdmin, (req, res) => productController.update(req, res)); // inline quick-edit
// Admin - Categories
app.get('/api/admin/categories', authenticateToken, requireAdmin, (req, res) => categoryController.list(req, res));
app.post('/api/admin/categories', authenticateToken, requireAdmin, (req, res) => categoryController.create(req, res));
app.put('/api/admin/categories/:id', authenticateToken, requireAdmin, (req, res) => categoryController.update(req, res));
app.delete('/api/admin/categories/:id', authenticateToken, requireAdmin, (req, res) => categoryController.delete(req, res));

app.get('/api/admin/orders', authenticateToken, requireAdmin, (req, res) => orderController.list(req, res));
app.patch('/api/admin/orders/bulk', authenticateToken, requireAdmin, (req, res) => adminController.bulkUpdateStatus(req, res));
app.delete('/api/admin/orders/bulk', authenticateToken, requireAdmin, (req, res) => orderController.bulkDelete(req, res));
app.delete('/api/admin/orders/:id', authenticateToken, requireAdmin, (req, res) => orderController.delete(req, res));
app.get('/api/admin/stats', authenticateToken, requireAdmin, (req, res) => statsController.getStats(req, res));
app.patch('/api/admin/orders/:id/fulfill', authenticateToken, requireAdmin, (req, res) => adminController.fulfill(req, res));
app.patch('/api/admin/orders/:id/status', authenticateToken, requireAdmin, (req, res) => adminController.updateStatus(req, res));
app.get('/api/admin/deliveries/map', authenticateToken, requireAdmin, (req, res) => adminController.getDeliveryMap(req, res));

// Admin - Customers
import { CustomerController } from './controllers/CustomerController';
const customerController = new CustomerController();
app.get('/api/admin/customers', authenticateToken, requireAdmin, (req, res) => customerController.list(req, res));
app.post('/api/admin/customers', authenticateToken, requireAdmin, (req, res) => customerController.create(req, res));
app.put('/api/admin/customers/:id', authenticateToken, requireAdmin, (req, res) => customerController.update(req, res));

// Admin - Delivery Zones
app.get('/api/admin/delivery-zones', authenticateToken, requireAdmin, (req, res) => deliveryZoneController.list(req, res));
app.post('/api/admin/delivery-zones', authenticateToken, requireAdmin, (req, res) => deliveryZoneController.create(req, res));
app.put('/api/admin/delivery-zones/:id', authenticateToken, requireAdmin, (req, res) => deliveryZoneController.update(req, res));
app.delete('/api/admin/delivery-zones/:id', authenticateToken, requireAdmin, (req, res) => deliveryZoneController.delete(req, res));

// Admin - WhatsApp
import { WhatsAppController } from './controllers/WhatsAppController';
const whatsAppController = new WhatsAppController();
app.get('/api/admin/whatsapp/status', authenticateToken, requireAdmin, (req, res) => whatsAppController.getStatus(req, res));

// Settings (Global Store Info)
import { SettingsController } from './controllers/SettingsController';
const settingsController = new SettingsController();
app.get('/api/settings', (req, res) => settingsController.get(req, res));
app.put('/api/admin/settings', authenticateToken, requireAdmin, (req, res) => settingsController.update(req, res));

// Admin - Pages (CMS)
import { PageController } from './controllers/PageController';
const pageController = new PageController();
app.get('/api/admin/pages', authenticateToken, requireAdmin, (req, res) => pageController.list(req, res));
app.post('/api/admin/pages', authenticateToken, requireAdmin, (req, res) => pageController.create(req, res));
app.put('/api/admin/pages/:id', authenticateToken, requireAdmin, (req, res) => pageController.update(req, res));
app.delete('/api/admin/pages/:id', authenticateToken, requireAdmin, (req, res) => pageController.delete(req, res));

// Public - Pages (CMS)
app.get('/api/pages/:slug', (req, res) => pageController.getBySlug(req, res));

// Avatars
// Imports moved to top
app.get('/api/avatars', (req, res) => avatarController.list(req, res));
app.post('/api/admin/avatars', authenticateToken, requireAdmin, avatarUpload.single('image'), (req, res) => avatarController.upload(req, res));
app.delete('/api/admin/avatars/:filename', authenticateToken, requireAdmin, (req, res) => avatarController.delete(req, res));

// CMS General Upload
import { UploadController } from './controllers/UploadController';
const uploadController = new UploadController();
app.post('/api/admin/upload', authenticateToken, requireAdmin, upload.single('image'), (req, res) => uploadController.upload(req, res));

// Admin - Notifications
app.get('/api/admin/notifications', authenticateToken, requireAdmin, (req, res) => notificationController.list(req, res));
app.patch('/api/admin/notifications/:id/read', authenticateToken, requireAdmin, (req, res) => notificationController.markAsRead(req, res));
app.post('/api/admin/notifications/read-all', authenticateToken, requireAdmin, (req, res) => notificationController.markAllAsRead(req, res));
app.delete('/api/admin/notifications/:id', authenticateToken, requireAdmin, (req, res) => notificationController.delete(req, res));

// Web Push Notifications
app.get('/api/push/key', (req, res) => pushController.getPublicKey(req, res));
app.post('/api/push/subscribe', authenticateToken, (req, res) => pushController.subscribe(req, res));

app.get('/api/categories', (req, res) => categoryController.list(req, res));

app.get('/health', (req, res) => res.send('OK'));

// Auth Routes
app.post('/api/auth/register', (req, res) => authController.register(req, res));
app.post('/api/auth/login', (req, res) => authController.login(req, res));
app.post('/api/auth/verify-email', (req, res) => authController.verifyEmail(req, res));
app.post('/api/auth/resend-verification', (req, res) => authController.resendVerification(req, res));
app.post('/api/auth/forgot-password', (req, res) => authController.forgotPassword(req, res));
app.post('/api/auth/reset-password', (req, res) => authController.resetPassword(req, res));
app.post('/api/auth/verify-reset-token', (req, res) => authController.verifyResetToken(req, res));
app.put('/api/auth/update', authenticateToken, (req, res) => authController.update(req, res));
app.get('/api/auth/me', authenticateToken, (req, res) => authController.me(req, res));

// Protected Admin Routes (Apply middleware later if desired, or keep open for MVP dev speed)
// app.use('/api/admin', authenticateToken, requireAdmin); 

export default app;
