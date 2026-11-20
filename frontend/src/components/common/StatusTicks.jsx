import React from 'react';
import { Check, CheckCheck, Clock } from 'lucide-react';

export const StatusTicks = ({ status = 'sent', className = 'w-3.5 h-3.5' }) => {
  if (status === 'sending') {
    return <Clock className={`${className} text-slate-400 animate-pulse`} />;
  }

  if (status === 'sent') {
    return <Check className={`${className} text-slate-400`} />;
  }

  if (status === 'delivered') {
    return <CheckCheck className={`${className} text-slate-400`} />;
  }

  if (status === 'read') {
    return <CheckCheck className={`${className} text-cyan-400 dark:text-cyan-400`} />;
  }

  return null;
};
