import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { normalizeApiError } from '../../utils/apiError.js';
import AuthLayout from '../../components/common/AuthLayout.jsx';
import FormInput from '../../components/common/FormInput.jsx';
import PasswordInput from '../../components/common/PasswordInput.jsx';
import Button from '../../components/common/Button.jsx';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
    setFieldErrors((prev) => ({ ...prev, [event.target.name]: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      await login(formData);
      navigate('/');
    } catch (err) {
      const normalized = normalizeApiError(err, 'Login failed. Please try again.');
      setError(normalized.message);
      setFieldErrors(normalized.fieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      imageUrl="/images/login.avif"
      heading="Find a place you'll love to call home."
      subheading="Discover verified properties and book your next stay with Roomify."
    >
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-primary">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary">R</span>
          Roomify
        </Link>
        <p className="text-sm text-muted">
          Need an account? <Link to="/register" className="font-semibold text-primary hover:underline">Sign up</Link>
        </p>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Sign in with the backend cookie session flow.</p>
      </div>

      {error && <div className="mb-5 rounded-sm border border-[#f3b6a8] bg-[#fff4f1] px-4 py-3 text-sm text-error" role="alert">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormInput label="Email address" icon={Mail} type="email" name="email" placeholder="Enter your email" value={formData.email} onChange={handleChange} error={fieldErrors.email} required />
        <PasswordInput label="Password" name="password" placeholder="Enter your password" value={formData.password} onChange={handleChange} error={fieldErrors.password} required />

        <Button type="submit" isLoading={isSubmitting}>Sign in</Button>
      </form>
    </AuthLayout>
  );
};

export default Login;
