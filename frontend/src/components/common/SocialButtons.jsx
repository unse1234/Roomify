const SocialButtons = () => (
  <div className="space-y-2.5">
    <button
      type="button"
      className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A11 11 0 0012 23z" />
        <path fill="#FBBC05" d="M5.84 14.09A6.6 6.6 0 015.5 12c0-.73.13-1.43.34-2.09V7.06H2.18A11 11 0 001 12c0 1.77.43 3.45 1.18 4.94l3.66-2.85z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 00-9.82 6.06l3.66 2.85C6.71 7.31 9.14 5.38 12 5.38z" />
      </svg>
      Continue with Google
    </button>
    <button
      type="button"
      className="w-full flex items-center justify-center gap-2.5 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
    >
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.36 1.43c0 1.14-.47 2.24-1.16 3.03-.76.86-2.01 1.53-3.05 1.45-.13-1.09.42-2.25 1.13-3.02.78-.86 2.13-1.5 3.08-1.46zM20.5 17.14c-.5 1.15-.74 1.66-1.38 2.68-.9 1.42-2.16 3.19-3.73 3.2-1.39.02-1.75-.9-3.64-.89-1.89.01-2.29.91-3.68.89-1.57-.02-2.76-1.61-3.66-3.03-2.51-3.95-2.77-8.58-1.22-11.05.93-1.48 2.4-2.35 3.79-2.35 1.41 0 2.3.9 3.46.9 1.13 0 1.82-.9 3.46-.9 1.24 0 2.55.68 3.48 1.85-3.06 1.68-2.56 6.05.12 7.7z" />
      </svg>
      Continue with Apple
    </button>
  </div>
);

export default SocialButtons;