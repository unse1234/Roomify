import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar.jsx';
import BottomNav from '../components/layout/BottomNav.jsx';
import { PageShell } from '../components/common/StateViews.jsx';

const CONTENT = {
  terms: {
    title: 'Terms of Service',
    body: [
      'Roomify is a demonstration short-stay rental marketplace. By creating an account you agree to use it lawfully, to provide accurate information about yourself and any property you list, and not to attempt to disrupt or abuse the service.',
      'Bookings made through Roomify are agreements between the guest and the host. Roomify facilitates messaging and scheduling but is not a party to the stay and does not currently process payments — payment is arranged directly between guest and host.',
      'Hosts are responsible for the accuracy of their listings and for honouring confirmed bookings. Guests are responsible for the conduct of their party during a stay. Either side may cancel a booking subject to the cancellation terms shown at the time of booking.',
      'We may suspend or remove accounts, listings or reviews that violate these terms. These terms may change; continued use after a change means you accept the update.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    body: [
      'Roomify stores the information you give us: your name, email address, the properties you list or save, your bookings, and the messages you exchange with other users.',
      'We use this information only to operate the service — to authenticate you, show you your bookings and conversations, and let hosts and guests contact each other. We do not sell your data.',
      'Your password is stored only as a salted hash and is never readable by us. Session tokens are kept in an httpOnly cookie.',
      'You can request deletion of your account and associated personal data by contacting support. Some records tied to completed bookings may be retained where required for dispute resolution.',
    ],
  },
};

const LegalPage = ({ document: doc }) => {
  const content = CONTENT[doc] ?? CONTENT.terms;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <PageShell className="max-w-[760px]">
        <h1 className="text-2xl font-semibold text-ink">{content.title}</h1>
        <p className="mt-1 text-sm text-muted">Last updated: this is a summary for the Roomify demo.</p>
        <div className="mt-6 space-y-4 text-sm leading-7 text-body">
          {content.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <Link to="/" className="btn-secondary mt-8">Back to stays</Link>
      </PageShell>
      <BottomNav />
    </div>
  );
};

export default LegalPage;
