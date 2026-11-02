import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase';
import { updateUserPassword } from '@/lib/supabaseAdapter';
import { sendPasswordResetEmail } from '@/lib/resendService';
import { 
  Building2, 
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Loader2, 
  Mail,
  ShieldCheck
} from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();

  // Form states
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Recovery session state
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [requestEmail, setRequestEmail] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    // Listen for auth state change - Supabase sets session on PASSWORD_RECOVERY
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && window.location.hash.includes('type=recovery'))) {
        setIsRecoverySession(true);
      }
    });

    // Check if URL hash or search parameters contain recovery indicators
    const hash = window.location.hash;
    const search = window.location.search;
    if (hash.includes('type=recovery') || search.includes('type=recovery') || hash.includes('access_token')) {
      setIsRecoverySession(true);
    }

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter a new password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await updateUserPassword(password);
      setSuccess(true);
    } catch (err: any) {
      console.error('Password update error:', err);
      setError(err.message || 'Failed to update password. Your reset link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestNewLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestEmail) {
      setError('Please enter your email address.');
      return;
    }

    try {
      setRequestLoading(true);
      setError('');
      await sendPasswordResetEmail(requestEmail);
      setRequestSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link.');
    } finally {
      setRequestLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-neutral-100 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-neutral-900 rounded-xl mb-4 text-white shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900">
            {success ? 'Password Updated' : 'Reset Password'}
          </h2>
          <p className="text-neutral-500 mt-2 text-sm">
            {success 
              ? 'Your password has been changed successfully.' 
              : 'Enter a strong, secure new password for your account.'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 bg-red-50 text-red-700 rounded-xl text-xs border border-red-100 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-full text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <p className="text-sm text-neutral-600">
              You can now sign in with your new password to access your bookings, dining orders, and hotel management dashboard.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-neutral-800 transition-colors shadow-sm"
            >
              Sign In Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : isRecoverySession ? (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 focus:outline-none transition-all"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-neutral-400 hover:text-neutral-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 focus:outline-none transition-all"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50 mt-2 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Update Password
                </>
              )}
            </button>

            <div className="text-center mt-4">
              <Link to="/login" className="text-xs text-neutral-500 hover:text-neutral-900">
                Cancel and return to Sign In
              </Link>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {requestSent ? (
              <div className="space-y-4 text-center">
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs">
                  <p className="font-bold mb-1">Reset Link Dispatched via Resend!</p>
                  <p>We've sent a secure password reset link to <strong>{requestEmail}</strong>. Please check your inbox or spam folder.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRequestSent(false)}
                  className="text-xs font-bold text-neutral-900 hover:underline"
                >
                  Send to a different email address
                </button>
              </div>
            ) : (
              <form onSubmit={handleRequestNewLink} className="space-y-4">
                <p className="text-xs text-neutral-600">
                  To reset your password, please enter your registered email. We will email you a secure recovery link via Resend.
                </p>
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                    Your Account Email
                  </label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-neutral-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={requestEmail}
                      onChange={(e) => setRequestEmail(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 focus:outline-none transition-all"
                      disabled={requestLoading}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={requestLoading}
                  className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50 shadow-sm"
                >
                  {requestLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending Link via Resend...
                    </>
                  ) : (
                    <>
                      Send Reset Link via Resend
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="text-center pt-2">
              <Link to="/login" className="text-xs text-neutral-500 hover:text-neutral-900">
                Back to Sign In
              </Link>
            </div>
          </div>
        )}

        <div className="mt-8 pt-4 border-t border-neutral-100 text-center">
          <p className="text-[11px] text-neutral-400">
            Powered by Resend Mail Services &bull; Woliso Hotel & Resort
          </p>
        </div>
      </div>
    </div>
  );
}
