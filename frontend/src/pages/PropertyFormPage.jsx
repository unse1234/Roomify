import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar.jsx';
import { createProperty, getPropertyById, updateProperty } from '../services/property.service.js';
import { ErrorState, PageShell, SkeletonBlock } from '../components/common/StateViews.jsx';
import { AMENITIES, PROPERTY_TYPES } from '../utils/propertyFilters.js';
import { getApiErrorMessage, getApiErrorRequestId, normalizeApiError } from '../utils/apiError.js';

const defaultForm = {
  title: '',
  description: '',
  type: 'apartment',
  price: '',
  currency: 'PKR',
  bedrooms: 1,
  bathrooms: 1,
  maxGuests: 1,
  areaValue: '',
  areaUnit: 'sqft',
  street: '',
  city: '',
  state: '',
  country: 'Pakistan',
  zipCode: '',
  lat: '',
  lng: '',
  amenities: [],
};

const toFormState = (property) => ({
  title: property.title || '',
  description: property.description || '',
  type: property.type || 'apartment',
  price: property.price || '',
  currency: property.currency || 'PKR',
  bedrooms: property.bedrooms ?? 1,
  bathrooms: property.bathrooms ?? 1,
  maxGuests: property.maxGuests ?? 1,
  areaValue: property.area?.value || '',
  areaUnit: property.area?.unit || 'sqft',
  street: property.address?.street || '',
  city: property.address?.city || '',
  state: property.address?.state || '',
  country: property.address?.country || 'Pakistan',
  zipCode: property.address?.zipCode || '',
  lng: property.address?.location?.coordinates?.[0] ?? '',
  lat: property.address?.location?.coordinates?.[1] ?? '',
  amenities: property.amenities || [],
});

const buildPayload = (form) => ({
  title: form.title,
  description: form.description,
  type: form.type,
  price: Number(form.price),
  currency: form.currency,
  bedrooms: Number(form.bedrooms),
  bathrooms: Number(form.bathrooms),
  maxGuests: Number(form.maxGuests),
  area: form.areaValue ? { value: Number(form.areaValue), unit: form.areaUnit } : undefined,
  amenities: form.amenities,
  address: {
    street: form.street,
    city: form.city,
    state: form.state,
    country: form.country,
    zipCode: form.zipCode,
    location: {
      type: 'Point',
      coordinates: [Number(form.lng), Number(form.lat)],
    },
  },
});

const buildFormData = (form, files) => {
  const payload = buildPayload(form);
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined) formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value);
  });
  files.forEach((file) => formData.append('images', file));
  return formData;
};

const FieldError = ({ message }) =>
  message ? <p className="mt-1.5 text-xs text-error">{message}</p> : null;

const PropertyFormContent = ({ id, isEdit, initialForm }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [apiError, setApiError] = useState(null);

  const mutation = useMutation({
    mutationFn: () => {
      setApiError(null);
      if (isEdit) {
        const payload = files.length ? buildFormData(form, files) : buildPayload(form);
        return updateProperty(id, payload, (event) => {
          if (event.total) setUploadProgress(Math.round((event.loaded * 100) / event.total));
        });
      }
      return createProperty(buildFormData(form, files), (event) => {
        if (event.total) setUploadProgress(Math.round((event.loaded * 100) / event.total));
      });
    },
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: ['properties'] });
      navigate(isEdit ? '/host/properties' : `/listings/${res.data?._id}`);
    },
    onError: (err) => setApiError(normalizeApiError(err, 'Could not save property.')),
  });

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const toggleAmenity = (amenity) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((item) => item !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const validateAndSubmit = (event) => {
    event.preventDefault();
    if (!isEdit && files.length === 0) {
      setApiError({ message: 'Property images are required by the backend.', fieldErrors: {} });
      return;
    }
    if (files.length > 10) {
      setApiError({ message: 'The backend accepts up to 10 property images.', fieldErrors: {} });
      return;
    }
    mutation.mutate();
  };

  return (
    <form onSubmit={validateAndSubmit} className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-muted">Title</span>
            <input className="field" value={form.title} onChange={(event) => update('title', event.target.value)} maxLength={100} aria-invalid={Boolean(apiError?.fieldErrors?.title)} required />
            <FieldError message={apiError?.fieldErrors?.title} />
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-muted">Description</span>
            <textarea className="field min-h-36" value={form.description} onChange={(event) => update('description', event.target.value)} maxLength={2000} aria-invalid={Boolean(apiError?.fieldErrors?.description)} required />
            <FieldError message={apiError?.fieldErrors?.description} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-muted">Type</span>
            <select className="field" value={form.type} onChange={(event) => update('type', event.target.value)}>
              {PROPERTY_TYPES.filter((type) => type.value).map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              <option value="other">Other</option>
            </select>
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold text-muted">Currency</span>
            <select className="field" value={form.currency} onChange={(event) => update('currency', event.target.value)}>
              {['PKR', 'USD', 'EUR', 'GBP'].map((currency) => <option key={currency}>{currency}</option>)}
            </select>
          </label>
          {['price', 'bedrooms', 'bathrooms', 'maxGuests', 'areaValue'].map((key) => (
            <label key={key}>
              <span className="mb-1 block text-xs font-semibold capitalize text-muted">{key.replace('maxGuests', 'max guests').replace('areaValue', 'area')}</span>
              <input className="field" type="number" min={key === 'price' || key === 'areaValue' ? 0 : 1} value={form[key]} onChange={(event) => update(key, event.target.value)} aria-invalid={Boolean(apiError?.fieldErrors?.[key])} required={key !== 'areaValue'} />
              <FieldError message={apiError?.fieldErrors?.[key]} />
            </label>
          ))}
          <label>
            <span className="mb-1 block text-xs font-semibold text-muted">Area unit</span>
            <select className="field" value={form.areaUnit} onChange={(event) => update('areaUnit', event.target.value)}>
              <option value="sqft">sqft</option>
              <option value="sqm">sqm</option>
            </select>
          </label>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-ink">Address</h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {['street', 'city', 'state', 'country', 'zipCode', 'lat', 'lng'].map((key) => (
              <label key={key}>
                <span className="mb-1 block text-xs font-semibold capitalize text-muted">{key}</span>
                <input className="field" value={form[key]} onChange={(event) => update(key, event.target.value)} aria-invalid={Boolean(apiError?.fieldErrors?.[key] || apiError?.fieldErrors?.[`address.${key}`])} required={['city', 'country', 'lat', 'lng'].includes(key)} />
                <FieldError message={apiError?.fieldErrors?.[key] || apiError?.fieldErrors?.[`address.${key}`]} />
              </label>
            ))}
          </div>
        </div>
      </section>

      <aside className="h-fit rounded-md border border-hairline p-5 shadow-card">
        {apiError?.message && (
          <div className="mb-4 rounded-sm border border-[#f3b6a8] bg-[#fff4f1] px-3 py-2 text-sm text-error" role="alert">
            <p>{apiError.message}</p>
            {apiError.requestId && <p className="mt-1 text-xs text-muted">Reference: {apiError.requestId}</p>}
          </div>
        )}

        <h2 className="text-lg font-semibold text-ink">Amenities</h2>
        <div className="mt-3 grid gap-2">
          {AMENITIES.map((amenity) => (
            <label key={amenity.value} className="flex min-h-9 items-center gap-3 text-sm text-ink">
              <input type="checkbox" checked={form.amenities.includes(amenity.value)} onChange={() => toggleAmenity(amenity.value)} className="h-4 w-4 accent-primary" />
              {amenity.label}
            </label>
          ))}
        </div>

        <div className="mt-6">
          <label>
            <span className="mb-1 block text-xs font-semibold text-muted">{isEdit ? 'Replace images' : 'Images'}</span>
            <input className="field" type="file" multiple accept="image/*" onChange={(event) => setFiles(Array.from(event.target.files || []))} aria-invalid={Boolean(apiError?.fieldErrors?.images)} required={!isEdit} />
            <FieldError message={apiError?.fieldErrors?.images} />
          </label>
          {files.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {files.map((file) => (
                <img key={`${file.name}-${file.lastModified}`} src={URL.createObjectURL(file)} alt="" className="aspect-square rounded-sm object-cover" />
              ))}
            </div>
          )}
          {uploadProgress > 0 && <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-soft"><div className="h-full bg-primary" style={{ width: `${uploadProgress}%` }} /></div>}
        </div>

        <button type="submit" className="btn-primary mt-6 w-full" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Save property'}
        </button>
      </aside>
    </form>
  );
};

const PropertyFormPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);

  const propertyQuery = useQuery({
    queryKey: ['property', id],
    queryFn: () => getPropertyById(id),
    enabled: isEdit,
  });

  if (isEdit && propertyQuery.isLoading) {
    return <><Navbar /><PageShell><SkeletonBlock className="h-96" /></PageShell></>;
  }

  if (isEdit && propertyQuery.isError) {
    return <><Navbar /><PageShell><ErrorState message={getApiErrorMessage(propertyQuery.error, 'Could not load property.')} requestId={getApiErrorRequestId(propertyQuery.error)} onRetry={() => propertyQuery.refetch()} /></PageShell></>;
  }

  const initialForm = isEdit ? toFormState(propertyQuery.data.data) : defaultForm;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <PageShell>
        <Link to="/host/properties" className="text-sm font-semibold text-primary">Back to host properties</Link>
        <h1 className="mt-4 text-2xl font-semibold text-ink">{isEdit ? 'Edit property' : 'Create property'}</h1>
        <p className="mt-1 text-sm text-muted">
          {isEdit ? 'Upload new files here to replace the current image set.' : 'Images upload through the existing ImageKit-backed multipart API.'}
        </p>
        <PropertyFormContent key={id || 'new'} id={id} isEdit={isEdit} initialForm={initialForm} />
      </PageShell>
    </div>
  );
};

export default PropertyFormPage;
