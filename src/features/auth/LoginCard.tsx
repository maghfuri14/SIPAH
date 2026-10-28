import React from 'react';
import { useLogin } from './useLogin';
import { InputField } from '../../components/ui/InputField';
import { Button } from '../../components/ui/Button';
import { ErrorAlert } from '../../components/ui/ErrorAlert';

export interface LoginCardProps {
  onSuccess?: () => void;
}

export const LoginCard: React.FC<LoginCardProps> = () => {
  const {
    username,
    setUsername,
    password,
    setPassword,
    showPassword,
    toggleShowPassword,
    isLoading,
    errorMessage,
    handleSubmit,
  } = useLogin();

  const isError = Boolean(errorMessage);

  return (
    <div className="max-w-[400px] w-full bg-white border border-[#E2E8F0] rounded-2xl shadow-card p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-[#0F172A] text-center">Masuk ke Akun</h2>
      <p className="text-sm text-[#64748B] mt-1 mb-6 text-center">
        Silakan masukkan username dan password Anda
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <InputField
          id="username"
          label="Username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Masukkan username"
          icon="user"
          error={isError}
          disabled={isLoading}
          hint="Contoh: superadmin"
          required
        />

        <InputField
          id="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Masukkan password"
          icon="lock"
          error={isError}
          disabled={isLoading}
          required
          rightElement={
            <button
              type="button"
              onClick={toggleShowPassword}
              disabled={isLoading}
              aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
              className="text-[#94A3B8] hover:text-[#64748B] focus:outline-none p-1 rounded focus:ring-1 focus:ring-[#059669]"
            >
              {showPassword ? (
                <svg
                  className="w-4 h-4 shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908A9.96 9.96 0 0112 5c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m-4.692-4.692a3 3 0 00-4.243-4.243"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
                </svg>
              ) : (
                <svg
                  className="w-4 h-4 shrink-0"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>
          }
        />

        <ErrorAlert message={errorMessage} visible={isError} />

        <div className="pt-2">
          <Button type="submit" fullWidth isLoading={isLoading}>
            Masuk
          </Button>
        </div>
      </form>
    </div>
  );
};

export default LoginCard;
