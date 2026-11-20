import React, { useState, useEffect } from 'react';
import { ShieldCheck, Phone, ArrowRight, RotateCw, AlertCircle } from 'lucide-react';
import { OtpInput } from './OtpInput';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';

const COUNTRY_CODES = [
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+1', country: 'USA / Canada', flag: '🇺🇸' },
  { code: '+44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' }
];

export const AuthModal = () => {
  const [step, setStep] = useState('phone'); // 'phone' | 'otp' | 'profile'
  const [countryCode, setCountryCode] = useState('+91');
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [devOtpNotice, setDevOtpNotice] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const { deviceId, setAuthData } = useAuthStore();

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setDevOtpNotice('');
    const cleanNumber = mobileNumber.replace(/\D/g, '').replace(/^0+/, '');

    if (cleanNumber.length < 6 || cleanNumber.length > 15) {
      setError('Please enter a valid mobile number (6 to 15 digits)');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.post('/auth/request-otp', {
        countryCode: countryCode.trim(),
        mobileNumber: cleanNumber,
        purpose: 'login'
      });

      if (res.data?.data?.isRealSms) {
        setDevOtpNotice(`Real SMS dispatched to ${countryCode} ${cleanNumber}. Check your mobile messages!`);
      } else if (res.data?.data?.devOtp) {
        setDevOtpNotice(`Verification Code: ${res.data.data.devOtp} (Auto-filled)`);
        setOtp(res.data.data.devOtp);
      }

      setStep('otp');
      setResendCooldown(25);
    } catch (err) {
      const serverMsg = err.response?.data?.message;
      const errorList = err.response?.data?.errors;
      const formattedErrors = Array.isArray(errorList) && errorList.length > 0 ? errorList.join(', ') : null;

      if (serverMsg) {
        setError(formattedErrors ? `${serverMsg}: ${formattedErrors}` : serverMsg);
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Cannot connect to backend server. Make sure the backend is running on port 5000.');
      } else {
        setError(err.message || 'Failed to dispatch verification code. Please check your number.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter all 6 digits of the OTP');
      return;
    }

    setIsLoading(true);
    setError('');
    const cleanNumber = mobileNumber.replace(/\D/g, '').replace(/^0+/, '');

    try {
      const res = await api.post('/auth/verify-otp', {
        countryCode: countryCode.trim(),
        mobileNumber: cleanNumber,
        otp: otp.trim(),
        deviceId,
        fullName: fullName || undefined,
        username: username || undefined,
        deviceInfo: {
          deviceName: navigator.userAgent.includes('Mobile') ? 'Mobile Browser' : 'Desktop Browser',
          browser: 'Web App',
          os: navigator.platform || 'Web'
        }
      });

      const { user, accessToken, refreshToken } = res.data.data;
      setAuthData(user, accessToken, refreshToken);
    } catch (err) {
      const serverMsg = err.response?.data?.message;
      const errorList = err.response?.data?.errors;
      const formattedErrors = Array.isArray(errorList) && errorList.length > 0 ? errorList.join(', ') : null;

      if (serverMsg && serverMsg.toLowerCase().includes('name is required')) {
        setStep('profile');
      } else if (serverMsg) {
        setError(formattedErrors ? `${serverMsg}: ${formattedErrors}` : serverMsg);
      } else if (err.code === 'ERR_NETWORK' || !err.response) {
        setError('Cannot connect to backend server. Make sure the backend is running on port 5000.');
      } else {
        setError(err.message || 'Verification failed. Please check the OTP.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-bakwas-panel border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-bakwas-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-bakwas-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-bakwas-500/20 mb-3">
            <img src="/icon.svg" alt="BAKWAS" className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            BAKWAS <span className="text-xs px-2 py-0.5 rounded-full bg-bakwas-500/20 text-bakwas-400 font-mono">v1.0</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">Real-time conversations, uninterrupted voice & video</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {devOtpNotice && (
          <div className="mb-4 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs text-center font-mono">
            {devOtpNotice}
          </div>
        )}

        {/* Step 1: Mobile Number Input */}
        {step === 'phone' && (
          <form onSubmit={handleRequestOtp} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">Select Country & Mobile Number</label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-bakwas-500"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <input
                    type="tel"
                    placeholder="Mobile Number"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    autoFocus
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-bakwas-500 focus:ring-1 focus:ring-bakwas-500"
                  />
                  <Phone className="w-4 h-4 text-slate-500 absolute right-3.5 top-3.5 pointer-events-none" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !mobileNumber.trim()}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-bakwas-500 to-teal-500 hover:from-bakwas-600 hover:to-teal-600 text-slate-950 font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-bakwas-500/25 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Send Verification Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              We send an SMS verification OTP to confirm your number. Standard carrier SMS rates may apply.
            </p>
          </form>
        )}

        {/* Step 2: OTP Verification Input */}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="text-center">
              <span className="text-xs text-slate-400">Code dispatched to </span>
              <span className="text-xs font-semibold text-white">{countryCode} {mobileNumber}</span>
              <button
                type="button"
                onClick={() => { setStep('phone'); setOtp(''); }}
                className="ml-2 text-xs text-bakwas-400 hover:underline"
              >
                Change
              </button>
            </div>

            <OtpInput value={otp} onChange={setOtp} length={6} disabled={isLoading} />

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Didn't receive code?</span>
              {resendCooldown > 0 ? (
                <span className="text-slate-500 font-mono">Resend in {resendCooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={isLoading}
                  className="text-bakwas-400 hover:text-bakwas-300 font-medium"
                >
                  Resend OTP
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-bakwas-500 to-teal-500 hover:from-bakwas-600 hover:to-teal-600 text-slate-950 font-semibold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-bakwas-500/25 disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoading ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify & Enter BAKWAS</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 3: Complete Profile (if needed) */}
        {step === 'profile' && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Your Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-bakwas-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Choose a Username (Optional)</label>
              <input
                type="text"
                placeholder="e.g. rahul_s"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-bakwas-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !fullName.trim()}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-bakwas-500 to-teal-500 text-slate-950 font-semibold text-sm transition-all shadow-lg shadow-bakwas-500/25"
            >
              {isLoading ? <RotateCw className="w-4 h-4 animate-spin mx-auto" /> : 'Complete Setup'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
