import React from 'react';

export interface ErrorAlertProps {
  message: string;
  visible: boolean;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, visible }) => {
  if (!visible || !message) return null;

  return (
    <div
      role="alert"
      className="bg-[#FEF2F2] border border-[#DC2626] rounded-lg p-3 flex items-center gap-2.5 text-[#DC2626] mt-4"
    >
      <svg
        className="w-3.5 h-3.5 shrink-0"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};

export default ErrorAlert;
