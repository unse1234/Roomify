import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar.jsx';
import BottomNav from '../components/layout/BottomNav.jsx';
import { PageShell } from '../components/common/StateViews.jsx';

const NotFoundPage = () => {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <PageShell>
        <div className="mx-auto max-w-xl rounded-md border border-hairline bg-white p-10 text-center shadow-card">
          <p className="font-mono text-sm text-muted">404</p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">Page not found</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            We couldn&apos;t find <span className="font-mono text-ink">{pathname}</span>. The link may
            be old or the page may have moved.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link to="/" className="btn-primary">Browse stays</Link>
            <Link to="/messages" className="btn-secondary">Go to your inbox</Link>
          </div>
        </div>
      </PageShell>
      <BottomNav />
    </div>
  );
};

export default NotFoundPage;
