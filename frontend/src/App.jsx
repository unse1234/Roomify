import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleRoute from './components/RoleRoute.jsx';
import OfflineBanner from './components/common/OfflineBanner.jsx';
import { PageShell, SkeletonBlock } from './components/common/StateViews.jsx';

// Eager: the landing paths a first-time visitor hits.
import Home from './pages/Home.jsx';
import ListingDetail from './pages/ListingDetail.jsx';

// Lazy: everything behind auth, the host area, and auxiliary pages — kept
// out of the initial bundle.
const Login = lazy(() => import('./pages/auth/Login.jsx'));
const Register = lazy(() => import('./pages/auth/Register.jsx'));
const BookingsPage = lazy(() => import('./pages/BookingsPage.jsx'));
const BookingDetail = lazy(() => import('./pages/BookingDetail.jsx'));
const ReviewsPage = lazy(() => import('./pages/ReviewsPage.jsx'));
const MessagesPage = lazy(() => import('./pages/MessagesPage.jsx'));
const ConversationPage = lazy(() => import('./pages/ConversationPage.jsx'));
const HostPropertiesPage = lazy(() => import('./pages/HostPropertiesPage.jsx'));
const PropertyFormPage = lazy(() => import('./pages/PropertyFormPage.jsx'));
const HostBookingsPage = lazy(() => import('./pages/HostBookingsPage.jsx'));
const WishlistPage = lazy(() => import('./pages/WishlistPage.jsx'));
const LegalPage = lazy(() => import('./pages/LegalPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.jsx'));

const RouteFallback = () => (
  <PageShell>
    <SkeletonBlock className="h-8 w-1/3" />
    <SkeletonBlock className="mt-4 h-64 w-full" />
  </PageShell>
);

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OfflineBanner />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Home />} />
            <Route path="/listings/:id" element={<ListingDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/terms" element={<LegalPage document="terms" />} />
            <Route path="/privacy" element={<LegalPage document="privacy" />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/bookings" element={<BookingsPage />} />
              <Route path="/bookings/:id" element={<BookingDetail />} />
              <Route path="/reviews" element={<ReviewsPage />} />
              <Route path="/messages" element={<MessagesPage />} />
              <Route path="/messages/:conversationId" element={<ConversationPage />} />
            </Route>

            <Route element={<RoleRoute roles={['host']} />}>
              <Route path="/host/properties" element={<HostPropertiesPage />} />
              <Route path="/host/properties/new" element={<PropertyFormPage />} />
              <Route path="/host/properties/:id/edit" element={<PropertyFormPage />} />
              <Route path="/host/bookings" element={<HostBookingsPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
