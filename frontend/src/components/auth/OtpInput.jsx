import React, { useRef, useEffect } from 'react';

export const OtpInput = ({ value = '', onChange, length = 6, disabled = false }) => {
  const inputsRef = useRef([]);

  useEffect(() => {
    if (inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, []);

  const handleChange = (e, index) => {
    const val = e.target.value.replace(/\D/g, '');
    const currentChars = value.split('');

    if (val.length > 1) {
      // Handle paste of full OTP code
      const pasted = val.slice(0, length);
      onChange(pasted);
      const nextIndex = Math.min(pasted.length, length - 1);
      if (inputsRef.current[nextIndex]) {
        inputsRef.current[nextIndex].focus();
      }
      return;
    }

    currentChars[index] = val ? val[0] : '';
    const newOtp = currentChars.join('').slice(0, length);
    onChange(newOtp);

    if (val && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  return (
    <div className="flex items-center justify-center gap-2.5">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKeyDown(e, i)}
          disabled={disabled}
          className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-slate-700 bg-bakwas-panel dark:bg-slate-900 text-slate-100 focus:outline-none focus:border-bakwas-500 focus:ring-2 focus:ring-bakwas-500/30 transition-all shadow-inner disabled:opacity-50"
        />
      ))}
    </div>
  );
};
