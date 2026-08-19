import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar.jsx';
import BottomNav from '../components/layout/BottomNav.jsx';
import { PageShell } from '../components/common/StateViews.jsx';

const BackendGapPage = ({ title = 'Feature unavailable', message }) => (
  <div className="min-h-screen bg-white">
    <Navbar />
    <PageShell>
      <div className="rounded-md border border-hairline p-10 text-center">
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted">
          {message || 'This feature is not ready yet.'}
        </p>
        <Link to="/" className="btn-primary mt-6">Back to stays</Link>
      </div>
    </PageShell>
    <BottomNav />
  </div>
);

export default BackendGapPage;
