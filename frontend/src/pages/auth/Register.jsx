import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, Mail, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { registerUser } from '../../services/auth.service.js';
import { normalizeApiError } from '../../utils/apiError.js';
import AuthLayout from '../../components/common/AuthLayout.jsx';
import FormInput from '../../components/common/FormInput.jsx';
import PasswordInput from '../../components/common/PasswordInput.jsx';
import Button from '../../components/common/Button.jsx';

const PASSWORD_RULES = [
  { key: 'length', label: 'At least 8 characters', test: (value) => value.length >= 8 },
  { key: 'upper', label: 'One uppercase letter', test: (value) => /[A-Z]/.test(value) },
  { key: 'lower', label: 'One lowercase letter', test: (value) => /[a-z]/.test(value) },
  { key: 'number', label: 'One number', test: (value) => /\d/.test(value) },
];

const Register = () => {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    becomeHost: false,
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const passwordChecks = useMemo(
    () => PASSWORD_RULES.map((rule) => ({ ...rule, passed: rule.test(formData.password) })),
    [formData.password]
  );
  const isPasswordValid = passwordChecks.every((check) => check.passed);
  const passwordsMatch = formData.password && formData.password === formData.confirmPassword;

  const handleChange = (event) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
    setFieldErrors((prev) => ({ ...prev, [event.target.name]: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setFieldErrors({});

    if (!isPasswordValid) return setError('Password does not meet the requirements below.');
    if (!passwordsMatch) return setError('Passwords do not match.');
    if (!agreedToTerms) return setError('Please agree to the Terms of Service and Privacy Policy.');

    setIsSubmitting(true);
    try {
      const res = await registerUser({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        roles: formData.becomeHost ? ['guest', 'host'] : ['guest'],
      });
      setUser(res.data);
      setIsSuccess(true);
      setTimeout(() => navigate(formData.becomeHost ? '/host/properties' : '/'), 500);
    } catch (err) {
      const normalized = normalizeApiError(err, 'Registration failed. Please try again.');
      setError(normalized.message);
      setFieldErrors(normalized.fieldErrors);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      imageUrl="/images/register.avif"
      heading="Your next place starts here."
      subheading="Create your Roomify account and start discovering real stays from the backend."
      features={['Verified properties', 'Secure booking requests', 'Host tools']}
    >
      <div className="mb-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-primary">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary">R</span>
          Roomify
        </Link>
        <p className="text-sm text-muted">
          Already have an account? <Link to="/login" className="font-semibold text-primary hover:underline">Log in</Link>
        </p>
      </div>

      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-muted">Choose guest only, or add host access using the backend role contract.</p>
      </div>

      {error && <div className="mb-4 rounded-sm border border-[#f3b6a8] bg-[#fff4f1] px-4 py-3 text-sm text-error" role="alert">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput label="Full name" icon={User} type="text" name="name" placeholder="Enter your full name" value={formData.name} onChange={handleChange} error={fieldErrors.name} required />
        <FormInput label="Email address" icon={Mail} type="email" name="email" placeholder="Enter your email" value={formData.email} onChange={handleChange} error={fieldErrors.email} required />
        <PasswordInput label="Password" name="password" placeholder="Create a password" value={formData.password} onChange={handleChange} error={fieldErrors.password} required />

        {formData.password && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {passwordChecks.map((rule) => (
              <div key={rule.key} className={`flex items-center gap-1.5 text-xs ${rule.passed ? 'text-green-700' : 'text-muted'}`}>
                <span className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${rule.passed ? 'bg-green-100' : 'bg-surface-soft'}`}>
                  {rule.passed ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
                </span>
                {rule.label}
              </div>
            ))}
          </div>
        )}

        <PasswordInput label="Confirm password" name="confirmPassword" placeholder="Confirm your password" value={formData.confirmPassword} onChange={handleChange} error={formData.confirmPassword && !passwordsMatch ? 'Passwords do not match' : ''} required />

        <label className="flex items-start gap-2.5 text-sm text-muted">
          <input type="checkbox" checked={formData.becomeHost} onChange={(event) => setFormData((prev) => ({ ...prev, becomeHost: event.target.checked }))} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
          <span>Register as a host so you can create and manage Roomify properties.</span>
        </label>

        <label className="flex items-start gap-2.5 text-sm text-muted">
          <input type="checkbox" checked={agreedToTerms} onChange={(event) => setAgreedToTerms(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
          <span>
            I agree to the <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and{' '}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
          </span>
        </label>

        <Button type="submit" isLoading={isSubmitting} isSuccess={isSuccess}>Create account</Button>
      </form>
    </AuthLayout>
  );
};

export default Register;
