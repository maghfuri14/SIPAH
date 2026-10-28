import React from 'react';

export interface InputFieldProps {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  icon?: 'user' | 'lock' | 'none';
  error?: boolean;
  rightElement?: React.ReactNode;
  disabled?: boolean;
  hint?: string;
  required?: boolean;
}

export const InputField: React.FC<InputFieldProps> = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon = 'none',
  error = false,
  rightElement,
  disabled = false,
  hint,
  required = false,
}) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-[#0F172A] mb-1.5">
        {label}
      </label>
      <div className="relative">
        {icon === 'user' && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none">
            <svg
              className="w-3.5 h-3.5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
        )}

        {icon === 'lock' && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none">
            <svg
              className="w-3.5 h-3.5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        )}

        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`w-full py-3 text-sm border rounded-lg bg-white placeholder-[#94A3B8] text-[#0F172A] outline-none transition-colors duration-150 ${
            icon !== 'none' ? 'pl-9' : 'pl-4'
          } ${rightElement ? 'pr-10' : 'pr-4'} ${
            error
              ? 'border-[#DC2626] ring-1 ring-[#DC2626]'
              : 'border-[#E2E8F0] focus:border-2 focus:border-[#059669] focus:ring-2 focus:ring-[#ECFDF5]'
          } ${disabled ? 'bg-slate-50 cursor-not-allowed opacity-80' : ''}`}
        />

        {rightElement && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center">
            {rightElement}
          </div>
        )}
      </div>

      {hint && <p className="text-xs text-slate-500 mt-1.5">{hint}</p>}
    </div>
  );
};

export default InputField;
