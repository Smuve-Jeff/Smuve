import React, { useState, useMemo } from 'react';
import { useAuth } from './services/AuthContext';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';

const checkPasswordStrength = (password: string) => {
    let score = 0;
    if (!password) return 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score; // score from 0 to 5
};

const PasswordStrengthMeter: React.FC<{ password?: string }> = ({ password = '' }) => {
    const score = useMemo(() => checkPasswordStrength(password), [password]);
    const strength = {
      0: { text: '', color: '' },
      1: { text: 'Very Weak', color: 'bg-red-500' },
      2: { text: 'Weak', color: 'bg-red-500' },
      3: { text: 'Medium', color: 'bg-yellow-500' },
      4: { text: 'Strong', color: 'bg-green-500' },
      5: { text: 'Very Strong', color: 'bg-green-500' },
    };

    return (
        <div className="mt-2">
            <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-700">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`w-1/5 transition-colors ${score > i ? strength[score as keyof typeof strength].color : ''}`}></div>
                ))}
            </div>
            <p className={`text-xs mt-1 text-right ${score > 2 ? 'text-green-400' : 'text-yellow-400'}`}>
                {strength[score as keyof typeof strength].text}
            </p>
        </div>
    );
};

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
        if (isLogin) {
            if (!username.trim() || !password.trim()) {
                throw new Error('All fields are required.');
            }
            await login(username, password);
        } else {
            if (!username.trim() || !email.trim() || !password.trim()) {
                throw new Error('All fields are required.');
            }
            if (!/\S+@\S+\.\S+/.test(email)) {
                throw new Error('Please enter a valid email address.');
            }
            if (checkPasswordStrength(password) < 3) {
                throw new Error('Password is too weak. Please choose a stronger one.');
            }
            if (password !== confirmPassword) {
                throw new Error('Passwords do not match.');
            }
            await register(username, email, password);
        }
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsLoading(false);
    }
  };

  if (!isOpen) {
      return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 font-mono animate-fade-in" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <Card className="z-10 w-full max-w-md bg-gray-900/80 backdrop-blur-md border border-blue-500/30 shadow-lg shadow-blue-500/20" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-8">
                <i className="fas fa-wave-square text-5xl text-blue-400 mb-2"></i>
                <h2 id="auth-modal-title" className="text-3xl font-bold text-blue-300 font-orbitron">S.M.U.V.E.</h2>
                <p className="text-gray-400 mt-1">{isLogin ? 'Welcome Back, Artist' : 'Create Your Hub'}</p>
            </div>
            
            <form onSubmit={handleSubmit} noValidate>
            {error && <p className="bg-red-800/50 text-red-300 border border-red-500/50 p-3 rounded-lg mb-4 text-center text-sm">{error}</p>}
            
            <div className="relative mb-6">
                <i className="fas fa-user absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
                <input 
                type="text" 
                id="username"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-transparent border-0 border-b-2 border-gray-700 rounded-none p-3 pl-10 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-blue-500 transition-colors" 
                autoComplete="username"
                required
                />
            </div>

            {!isLogin && (
                <div className="relative mb-6">
                <i className="fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
                <input 
                    type="email" 
                    id="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent border-0 border-b-2 border-gray-700 rounded-none p-3 pl-10 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-blue-500 transition-colors" 
                    autoComplete="email"
                    required
                />
                </div>
            )}

            <div className="relative mb-4">
                <i className="fas fa-lock absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
                <input 
                type={showPassword ? 'text' : 'password'} 
                id="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-0 border-b-2 border-gray-700 rounded-none p-3 pl-10 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-blue-500 transition-colors pr-10" 
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-blue-300" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
            </div>
            
            {!isLogin && (
                <>
                    <PasswordStrengthMeter password={password} />
                    <div className="relative mt-6 mb-6">
                    <i className="fas fa-check-circle absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
                    <input 
                        type={showPassword ? 'text' : 'password'}
                        id="confirmPassword"
                        placeholder="Confirm Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-transparent border-0 border-b-2 border-gray-700 rounded-none p-3 pl-10 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-0 focus:border-blue-500 transition-colors pr-10" 
                        autoComplete="new-password"
                        required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 text-gray-500 hover:text-blue-300" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                    </div>
                </>
            )}

            <Button type="submit" variant="primary" disabled={isLoading} className="w-full mt-4 bg-blue-600 hover:bg-blue-500 focus:ring-blue-500 text-white h-12 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-shadow">
                {isLoading ? <Spinner /> : (isLogin ? 'Login' : 'Register')}
            </Button>
            </form>

            <div className="mt-6 text-center">
                <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                    {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
                </button>
            </div>
        </Card>
    </div>
  );
};

export default React.memo(AuthModal);