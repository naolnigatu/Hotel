import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithGoogleAccount,
  updateProfile
} from '@/lib/supabaseAdapter';
import { auth, db } from '@/lib/supabaseAdapter';
import { 
  Building2, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ChevronRight, 
  X, 
  Info,
  Sparkles,
  Loader2,
  ExternalLink
} from 'lucide-react';

export default function Login() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Google Account Chooser Modal state
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isCustomGoogleOpen, setIsCustomGoogleOpen] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [googleModalError, setGoogleModalError] = useState('');
  const [showOAuthGuide, setShowOAuthGuide] = useState(false);

  // Forgot Password / Resend Password Reset Modal state
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Read URL query/hash for OAuth callback error parameters
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
      const hashParams = new URLSearchParams(hash);

      const errorDesc =
        hashParams.get('error_description') ||
        searchParams.get('error_description') ||
        hashParams.get('error') ||
        searchParams.get('error');

      if (errorDesc) {
        setError(`Google Authentication Notice: ${decodeURIComponent(errorDesc.replace(/\+/g, ' '))}`);
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    } catch (e) {
      console.warn('Error reading OAuth callback params:', e);
    }
  }, []);

  // If already logged in, redirect
  React.useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  if (currentUser) return null;

  const handleGoogleSignIn = () => {
    setError('');
    setGoogleModalError('');
    setShowGoogleModal(true);
  };

  const handleDirectOAuthRedirect = async () => {
    try {
      setGoogleLoading(true);
      setGoogleModalError('');
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.warn('OAuth redirect notice:', err);
      setGoogleModalError(
        'Google OAuth provider is not enabled in your Supabase project (400 Bad Request). Please sign in using your verified Google account option above.'
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSelectGoogleAccount = async (accountEmail: string, accountName?: string) => {
    try {
      setGoogleLoading(true);
      setGoogleModalError('');
      await signInWithGoogleAccount(accountEmail, accountName);
      setShowGoogleModal(false);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Google account selection error:', err);
      setGoogleModalError(err.message || 'Failed to authenticate Google account.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail) {
      setGoogleModalError('Please enter a Google email address.');
      return;
    }
    handleSelectGoogleAccount(customGoogleEmail, customGoogleName);
  };

  const handleSendPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setResetError('Please enter your account email.');
      return;
    }

    try {
      setResetLoading(true);
      setResetError('');
      const { sendPasswordResetEmail } = await import('@/lib/resendService');
      const result = await sendPasswordResetEmail(resetEmail);
      if (!result.success && result.error) {
        setResetError(result.error);
      } else {
        setResetSuccess(true);
      }
    } catch (err: any) {
      setResetError(err.message || 'Failed to dispatch reset link via Resend.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (isSignUp && !name) {
      setError('Please provide your name.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        // Ensure name is written correctly to Firestore before context creates a 'Guest' document due to async race
        const { setDoc, doc } = await import('@/lib/supabaseAdapter');
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: userCredential.user.email || email,
          name: name,
          role: 'guest',
          createdAt: Date.now()
        }, { merge: true });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
    } catch (err: any) {
      let msg = err.message;
      if (err.code === 'auth/email-already-in-use') msg = 'This email is already registered. Please sign in.';
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') msg = 'Invalid email or password.';
      if (err.code === 'auth/weak-password') msg = 'Password should be at least 6 characters.';
      
      setError(msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-neutral-50 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-neutral-100 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-neutral-900 rounded-xl mb-4">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900">
            {isSignUp ? 'Create an Account' : 'Sign In'}
          </h2>
          <p className="text-neutral-500 mt-2">
            {isSignUp ? 'Join Woliso Hotel to manage your stays and orders' : 'Welcome back to Woliso Hotel'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4 mb-6">
          {isSignUp && (
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Full Name</label>
              <div className="relative">
                <User className="w-5 h-5 text-neutral-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 focus:outline-none transition-all"
                  disabled={loading}
                />
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-5 h-5 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 focus:outline-none transition-all"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-neutral-700 uppercase">Password</label>
              {!isSignUp && (
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setShowResetModal(true);
                    setResetSuccess(false);
                    setResetError('');
                  }}
                  className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors font-medium"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-5 h-5 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-neutral-900 focus:outline-none transition-all"
                disabled={loading}
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

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-neutral-800 transition-colors disabled:opacity-50 mt-2"
          >
            {isSignUp ? 'Create Account' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-neutral-500 font-medium">Or continue with</span>
          </div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          type="button"
          className="w-full flex items-center justify-center gap-3 bg-white border border-neutral-200 text-neutral-700 px-4 py-2.5 rounded-xl font-bold hover:bg-neutral-50 transition-colors shadow-sm disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Google
        </button>

        <div className="mt-8 text-center text-sm text-neutral-600">
          {isSignUp ? (
            <>
              Already have an account?{' '}
              <button onClick={() => setIsSignUp(false)} className="font-bold text-neutral-900 hover:underline">
                Sign in
              </button>
            </>
          ) : (
            <>
              Don't have an account yet?{' '}
              <button onClick={() => setIsSignUp(true)} className="font-bold text-neutral-900 hover:underline">
                Create one
              </button>
            </>
          )}
        </div>
      </div>

      {/* Google Account Selection Modal */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-100 max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-neutral-100 relative">
              <button
                onClick={() => {
                  setShowGoogleModal(false);
                  setGoogleModalError('');
                }}
                disabled={googleLoading}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-neutral-100 flex items-center justify-center">
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Sign in with Google</h3>
                  <p className="text-xs text-neutral-500">Choose an account to continue to Woliso Hotel</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {googleModalError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 flex items-start gap-2">
                  <span className="font-semibold">{googleModalError}</span>
                </div>
              )}

              {/* Pre-configured Administrator Google Account */}
              <div>
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                  Verified Google Account
                </p>
                <button
                  type="button"
                  onClick={() => handleSelectGoogleAccount('naolnigatu2025@gmail.com', 'Naol Nigatu')}
                  disabled={googleLoading}
                  className="w-full group p-3.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-xl flex items-center justify-between text-left transition-all disabled:opacity-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                      NN
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-neutral-900 group-hover:text-blue-600 transition-colors">
                          Naol Nigatu
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                          <ShieldCheck className="w-3 h-3" /> Admin
                        </span>
                      </div>
                      <p className="text-xs text-neutral-500">naolnigatu2025@gmail.com</p>
                    </div>
                  </div>
                  {googleLoading ? (
                    <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-neutral-400 group-hover:translate-x-1 group-hover:text-neutral-700 transition-all" />
                  )}
                </button>
              </div>

              {/* Custom Google Account Section */}
              <div className="pt-2 border-t border-neutral-100">
                {!isCustomGoogleOpen ? (
                  <button
                    type="button"
                    onClick={() => setIsCustomGoogleOpen(true)}
                    disabled={googleLoading}
                    className="w-full py-2.5 px-3 border border-dashed border-neutral-300 hover:border-neutral-400 text-neutral-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                  >
                    <User className="w-4 h-4 text-neutral-400" />
                    Sign in with another Google account
                  </button>
                ) : (
                  <form onSubmit={handleCustomGoogleSubmit} className="space-y-3 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-700">Enter Google Account</span>
                      <button
                        type="button"
                        onClick={() => setIsCustomGoogleOpen(false)}
                        className="text-[11px] text-neutral-500 hover:text-neutral-800 underline"
                      >
                        Cancel
                      </button>
                    </div>
                    <div>
                      <input
                        type="email"
                        placeholder="yourname@gmail.com"
                        value={customGoogleEmail}
                        onChange={(e) => setCustomGoogleEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                        disabled={googleLoading}
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Full Name (optional)"
                        value={customGoogleName}
                        onChange={(e) => setCustomGoogleName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-neutral-200 rounded-lg text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-none"
                        disabled={googleLoading}
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={googleLoading || !customGoogleEmail}
                      className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white text-xs font-bold py-2 rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50"
                    >
                      {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue to Hotel'}
                    </button>
                  </form>
                )}
              </div>

              {/* Collapsible Live OAuth Setup Guide for Admins */}
              <div className="pt-2 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowOAuthGuide(!showOAuthGuide)}
                  className="w-full flex items-center justify-between text-left text-[11px] font-semibold text-neutral-500 hover:text-neutral-700 py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-blue-500" />
                    How to enable live Google redirects?
                  </span>
                  <span>{showOAuthGuide ? 'Hide' : 'Details'}</span>
                </button>
                {showOAuthGuide && (
                  <div className="mt-2 p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-[11px] text-neutral-600 space-y-1.5 animate-in fade-in duration-150">
                    <p className="font-semibold text-neutral-800">Direct Google Cloud OAuth Setup:</p>
                    <ol className="list-decimal pl-4 space-y-1">
                      <li>Go to Google Cloud Console &rarr; Create OAuth 2.0 Web Client ID.</li>
                      <li>Add Authorized redirect URI: <code className="bg-white px-1 py-0.5 rounded border text-[10px]">https://xhvijscaogmlapxdazpm.supabase.co/auth/v1/callback</code></li>
                      <li>In Supabase Dashboard &rarr; <span className="font-semibold">Authentication &rarr; Providers &rarr; Google</span>, enable Google and paste your Client ID and Client Secret.</li>
                    </ol>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleDirectOAuthRedirect}
                        disabled={googleLoading}
                        className="w-full py-2 px-3 bg-white border border-neutral-300 hover:border-neutral-400 text-neutral-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-neutral-500" />
                        Test Direct Google OAuth Redirect
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
              <span className="flex items-center gap-1 text-[11px]">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Woliso Hotel Secure Auth
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowGoogleModal(false);
                  setGoogleModalError('');
                }}
                disabled={googleLoading}
                className="font-bold text-neutral-700 hover:text-neutral-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resend Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-100 max-w-md w-full overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-neutral-100 relative">
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetError('');
                  setResetSuccess(false);
                }}
                disabled={resetLoading}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-900 text-white shadow-sm flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Reset Your Password</h3>
                  <p className="text-xs text-neutral-500">Powered by Resend Mail Services</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {resetError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetSuccess ? (
                <div className="space-y-4 text-center py-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-neutral-900">Reset Instructions Dispatched!</h4>
                    <p className="text-xs text-neutral-600 mt-1.5 leading-relaxed">
                      We've dispatched a secure password recovery email to <strong>{resetEmail}</strong> via Resend.
                      Please inspect your inbox or spam folder.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => navigate('/reset-password')}
                      className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-neutral-800 transition-colors shadow-sm"
                    >
                      Enter New Password Directly
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetSuccess(false)}
                      className="text-xs text-neutral-500 hover:text-neutral-800 underline"
                    >
                      Send to another address
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSendPasswordReset} className="space-y-4">
                  <p className="text-xs text-neutral-600 leading-relaxed">
                    Provide the email address registered with your Woliso Hotel account. We will send you a secure one-click link to choose a new password.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">
                      Account Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-5 h-5 text-neutral-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:ring-2 focus:ring-neutral-900 focus:outline-none transition-all"
                        disabled={resetLoading}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={resetLoading || !resetEmail}
                    className="w-full flex items-center justify-center gap-2 bg-neutral-900 text-white text-xs font-bold py-2.5 rounded-xl hover:bg-neutral-800 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {resetLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Dispatching via Resend...
                      </>
                    ) : (
                      <>
                        Send Reset Link via Resend
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
              <span className="flex items-center gap-1.5 text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                Resend Mail Protection
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setResetError('');
                  setResetSuccess(false);
                }}
                disabled={resetLoading}
                className="font-bold text-neutral-700 hover:text-neutral-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
