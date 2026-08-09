import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import AuthLayout from '../../components/common/AuthLayout.jsx';
import FormInput from '../../components/common/FormInput.jsx';
import PasswordInput from '../../components/common/PasswordInput.jsx';
import Button from '../../components/common/Button.jsx';
import SocialButtons from '../../components/common/SocialButtons.jsx';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await login(formData);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
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
      <div className="flex items-center justify-between mb-6">
        <Link to="/" className="flex items-center gap-2 font-semibold text-gray-900">
          <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs">R</span>
          Roomify
        </Link>
        <p className="text-sm text-gray-500">
          Don't have an account? <Link to="/register" className="text-blue-600 font-medium hover:underline">Sign up</Link>
        </p>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
        <p className="text-sm text-gray-500 mt-1">Sign in to continue to Roomify</p>
      </div>

      {error && (
        <div className="mb-5 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormInput
          label="Email address"
          icon={Mail}
          type="email"
          name="email"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <PasswordInput
          label="Password"
          name="password"
          placeholder="Enter your password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-blue-600 font-medium hover:underline">
            Forgot password?
          </Link>
        </div>

        <Button type="submit" isLoading={isSubmitting}>
          Sign In →
        </Button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400 uppercase tracking-wide">Or</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <SocialButtons />

      <p className="text-center text-xs text-gray-400 mt-6">
        By continuing, you agree to our{' '}
        <Link to="/terms" className="text-blue-600 hover:underline">Terms of Service</Link> and{' '}
        <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
      </p>
    </AuthLayout>
  );
};

export default Login;
// fixed name