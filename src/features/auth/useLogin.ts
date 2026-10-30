import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authStore } from '../../store/authStore';
import { api } from '../../lib/api';

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
      const { data } = await api.post('/auth/login', {
        username: username.trim(),
        password,
      });

      if (data.token && data.user) {
        localStorage.setItem('token', data.token);
        authStore.setUser({
          username: data.user.username,
          role: data.user.role,
          nama: data.user.nama_lengkap || data.user.nama,
        });
        navigate('/dashboard');
      } else {
        setErrorMessage(data.message || 'Username atau password salah');
      }
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.message || 'Terjadi kesalahan. Silakan coba lagi.',
      );
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
