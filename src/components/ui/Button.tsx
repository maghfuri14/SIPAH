import React from 'react';

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  isLoading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  fullWidth?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  isLoading = false,
  disabled = false,
  children,
  onClick,
  type = 'button',
  fullWidth = false,
  className = '',
}) => {
  const baseStyles =
    'min-h-[44px] inline-flex items-center justify-center font-semibold text-sm rounded-lg py-3 px-6 transition-colors duration-150 outline-none focus:ring-2 focus:ring-[#059669] focus:ring-offset-2';

  const variantStyles = {
    primary: 'bg-[#059669] hover:bg-[#047857] text-white focus:ring-[#059669]',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 focus:ring-slate-400',
    danger: 'bg-[#DC2626] hover:bg-red-700 text-white focus:ring-[#DC2626]',
  };

  const isButtonDisabled = disabled || isLoading;
  const disabledStyles = isButtonDisabled ? 'opacity-50 cursor-not-allowed hover:bg-opacity-100' : '';
  const widthStyles = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      disabled={isButtonDisabled}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]} ${widthStyles} ${disabledStyles} ${className}`}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2.5 h-4 w-4 text-current shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span>Memproses...</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
