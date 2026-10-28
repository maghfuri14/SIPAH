import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mockAuth } from '../../lib/mockAuth';
import { authStore } from '../../store/authStore';

export function useLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const navigate = useNavigate();

  const toggleShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Username dan password wajib diisi');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // Simulate 1 second processing delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const res = await mockAuth(username.trim(), password);

      if (res.success && res.role && res.nama) {
        authStore.setUser({
          username: username.trim(),
          role: res.role,
          nama: res.nama,
        });
        navigate('/dashboard');
      } else {
        setErrorMessage(res.message || 'Username atau password salah');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    username,
    setUsername,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    toggleShowPassword,
    isLoading,
    errorMessage,
    setErrorMessage,
    handleSubmit,
  };
}

export default useLogin;
