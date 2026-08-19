import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import Navbar from '../components/layout/Navbar.jsx';
import { deleteProperty, getHostProperties } from '../services/property.service.js';
import { EmptyState, ErrorState, PageShell, SkeletonBlock } from '../components/common/StateViews.jsx';
import { formatAddress, formatMoney, getCoverImage } from '../utils/formatters.js';
import { getApiErrorMessage, getApiErrorRequestId } from '../utils/apiError.js';

const HostPropertiesPage = () => {
  const queryClient = useQueryClient();
  const propertiesQuery = useQuery({
    queryKey: ['properties', 'host'],
    queryFn: getHostProperties,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties', 'host'] });
    },
  });

  const properties = propertiesQuery.data?.data || [];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <PageShell>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Host properties</h1>
            <p className="mt-1 text-sm text-muted">Manage stays backed by the property API.</p>
          </div>
          <Link to="/host/properties/new" className="btn-primary"><Plus className="h-4 w-4" />Create property</Link>
        </div>

        {deleteMutation.isError && <p className="mb-4 text-sm text-error">{getApiErrorMessage(deleteMutation.error, 'Could not delete property.')}</p>}

        {propertiesQuery.isLoading ? (
          <div className="grid gap-5 md:grid-cols-2"><SkeletonBlock className="h-72" /><SkeletonBlock className="h-72" /></div>
        ) : propertiesQuery.isError ? (
          <ErrorState message={getApiErrorMessage(propertiesQuery.error, 'Could not load host properties.')} requestId={getApiErrorRequestId(propertiesQuery.error)} onRetry={() => propertiesQuery.refetch()} />
        ) : properties.length === 0 ? (
          <EmptyState title="No properties yet" message="Create your first Roomify listing with real backend image upload." action={<Link to="/host/properties/new" className="btn-primary">Create property</Link>} />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {properties.map((property) => {
              const cover = getCoverImage(property);
              return (
                <article key={property._id} className="overflow-hidden rounded-md border border-hairline bg-white shadow-card">
                  <div className="aspect-[4/3] bg-surface-soft">
                    {cover ? <img src={cover} alt={property.title} className="h-full w-full object-cover" loading="lazy" /> : null}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-ink">{property.title}</h2>
                        <p className="mt-1 text-sm text-muted">{formatAddress(property.address)}</p>
                      </div>
                      <span className="rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold capitalize text-ink">{property.status}</span>
                    </div>
                    <p className="mt-3 font-semibold text-ink">{formatMoney(property.price, property.currency)} / night</p>
                    <div className="mt-5 flex flex-wrap gap-3">
                      <Link to={`/listings/${property._id}`} className="btn-secondary">View</Link>
                      <Link to={`/host/properties/${property._id}/edit`} className="btn-secondary">Edit</Link>
                      <button type="button" className="btn-secondary text-error" onClick={() => deleteMutation.mutate(property._id)} disabled={deleteMutation.isPending}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </PageShell>
    </div>
  );
};

export default HostPropertiesPage;
