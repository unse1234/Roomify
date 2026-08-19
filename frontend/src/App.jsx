import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import RoleRoute from './components/RoleRoute.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import Home from './pages/Home.jsx';
import ListingDetail from './pages/ListingDetail.jsx';
import BookingsPage from './pages/BookingsPage.jsx';
import BookingDetail from './pages/BookingDetail.jsx';
import ReviewsPage from './pages/ReviewsPage.jsx';
import MessagesPage from './pages/MessagesPage.jsx';
import ConversationPage from './pages/ConversationPage.jsx';
import HostPropertiesPage from './pages/HostPropertiesPage.jsx';
import PropertyFormPage from './pages/PropertyFormPage.jsx';
import HostBookingsPage from './pages/HostBookingsPage.jsx';
import WishlistPage from './pages/WishlistPage.jsx';
import OfflineBanner from './components/common/OfflineBanner.jsx';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OfflineBanner />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<Home />} />
          <Route path="/listings/:id" element={<ListingDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
