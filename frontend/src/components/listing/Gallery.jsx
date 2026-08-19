import { useState } from 'react';
import { X, Grid3x3 } from 'lucide-react';

const Gallery = ({ images = [] }) => {
  const [showAll, setShowAll] = useState(false);

  if (images.length === 0) {
    return <div className="aspect-[16/9] w-full rounded-md bg-surface-soft flex items-center justify-center text-muted-soft">No images</div>;
  }

  const [main, ...rest] = images;
  const sideImages = rest.slice(0, 4);

  return (
    <>
      <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-md overflow-hidden aspect-[16/9]">
        <img src={main.url} alt="" className="w-full h-full object-cover" />

        {sideImages.length > 0 && (
          <div className={`hidden sm:grid gap-2 h-full grid-cols-2 ${sideImages.length > 2 ? 'grid-rows-2' : 'grid-rows-1'}`}>
            {sideImages.map((img, i) => (
              <img key={i} src={img.url} alt="" className="w-full h-full object-cover" />
            ))}
          </div>
        )}

        {images.length > 1 && (
          <button
            onClick={() => setShowAll(true)}
            className="absolute bottom-4 right-4 flex items-center gap-2 bg-white text-ink text-sm font-medium px-4 py-2 rounded-sm shadow-card hover:bg-surface-soft transition-colors"
          >
            <Grid3x3 className="w-4 h-4" />
            Show all photos
          </button>
        )}
      </div>

      {showAll && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-hairline px-6 py-4">
            <button
              onClick={() => setShowAll(false)}
              className="flex items-center gap-2 text-sm font-medium text-ink hover:bg-surface-soft px-3 py-2 rounded-sm -ml-3"
            >
              <X className="w-4 h-4" />
              Close
            </button>
          </div>
          <div className="max-w-4xl mx-auto px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {images.map((img, i) => (
              <img key={i} src={img.url} alt="" className="w-full rounded-sm object-cover" />
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default Gallery;