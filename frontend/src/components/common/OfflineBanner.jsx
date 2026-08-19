import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../../hooks/useOnlineStatus.js';

const OfflineBanner = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-ink px-4 py-2 text-sm font-medium text-white" role="status">
      <WifiOff className="h-4 w-4" />
      You're offline. Some features may be unavailable until your connection returns.
    </div>
  );
};

export default OfflineBanner;
