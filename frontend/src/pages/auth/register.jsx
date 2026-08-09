import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, User, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { registerUser } from '../../services/auth.service.js';
import AuthLayout from '../../components/common/AuthLayout.jsx';
import FormInput from '../../components/common/FormInput.jsx';
import PasswordInput from '../../components/common/PasswordInput.jsx';
import Button from '../../components/common/Button.jsx';
import SocialButtons from '../../components/common/SocialButtons.jsx';

const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters', test: (v) => v.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (v) => /[A-Z]/.test(v) },
  { key: 'lower', label: 'One lowercase letter', test: (v) => /[a-z]/.test(v) },
  { key: 'number', label: 'One number', test: (v) => /\d/.test(v) },
];

const Register = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordChecks = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(formData.password) })),
    [formData.password]
  );
  const isPasswordValid = passwordChecks.every((c) => c.passed);
  const passwordsMatch = formData.password && formData.password === formData.confirmPassword;

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) return setError('Password does not meet the requirements below.');
    if (!passwordsMatch) return setError('Passwords do not match.');
    if (!agreedToTerms) return setError('Please agree to the Terms of Service and Privacy Policy.');

    setIsSubmitting(true);
    try {
      const res = await registerUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      setUser(res.data);
      setIsSuccess(true);
      setTimeout(() => navigate('/'), 600);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      imageUrl="/images/register.avif"
      heading="Your next place starts here."
      subheading="Create your Roomify account and start discovering properties you'll love."
      features={['Verified properties', 'Secure booking', '24/7 support']}
    >
      <div className="flex items-center justify-between mb-4">
        <Link to="/" className="flex items-center gap-2 font-semibold text-gray-900">
          <span className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs">R</span>
          Roomify
        </Link>
        <p className="text-sm text-gray-500">
          Already have an account? <Link to="/login" className="text-blue-600 font-medium hover:underline">Log in</Link>
        </p>
      </div>

      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Create your account</h1>
        <p className="text-sm text-gray-500 mt-0.5">Join Roomify and find your perfect stay.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3.5">
        <FormInput
          label="Full name"
          icon={User}
          type="text"
          name="name"
          placeholder="Enter your full name"
          value={formData.name}
          onChange={handleChange}
          required
        />

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
          placeholder="Create a password"
          value={formData.password}
          onChange={handleChange}
          required
        />

        {formData.password && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 -mt-1">
            {passwordChecks.map((rule) => (
              <div key={rule.key} className={`flex items-center gap-1.5 text-xs transition-colors ${rule.passed ? 'text-green-600' : 'text-gray-400'}`}>
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${rule.passed ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {rule.passed && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                </span>
                {rule.label}
              </div>
            ))}
          </div>
        )}

        <PasswordInput
          label="Confirm password"
          name="confirmPassword"
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={handleChange}
          error={formData.confirmPassword && !passwordsMatch ? 'Passwords do not match' : ''}
          required
        />

        <label className="flex items-start gap-2.5 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
          />
          <span>
            I agree to the <Link to="/terms" className="text-blue-600 hover:underline">Terms of Service</Link> and{' '}
            <Link to="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
          </span>
        </label>

        <Button type="submit" isLoading={isSubmitting} isSuccess={isSuccess}>
          Create Account →
        </Button>
      </form>

      <div className="flex items-center gap-3 my-4">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400 uppercase tracking-wide">Or</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <SocialButtons />
    </AuthLayout>
  );
};

export default Register;
// fixed name