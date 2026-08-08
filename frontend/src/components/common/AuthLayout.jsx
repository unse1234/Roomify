import { Home, CheckCircle } from 'lucide-react';

const AuthLayout = ({ imageUrl, heading, subheading, features, children }) => {
  return (
    <div className="min-h-screen flex bg-gray-50">
      <div
        className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center bg-gray-900"
        style={{ backgroundImage: `url(${imageUrl})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-black/40" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full text-white">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <Home className="w-5 h-5" />
            Roomify
          </div>
          <div className="max-w-md">
            <h2 className="text-4xl font-semibold leading-tight mb-3">{heading}</h2>
            <p className="text-white/80 text-base">{subheading}</p>
            {features && (
              <div className="mt-8 space-y-3">
                {features.map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-white/90">
                    <CheckCircle className="w-4 h-4 text-blue-400 shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-8 sm:px-12">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
};

export default AuthLayout;