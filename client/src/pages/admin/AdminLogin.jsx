
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import config from '../../config';

const AdminLogin = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isFocused, setIsFocused] = useState('');

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(config.API_URL + '/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            localStorage.setItem('user', JSON.stringify(data.user));
            navigate('/admin/dashboard');

        } catch (err) {
            setError(err.message);
            // Shake animation on error
            const formContainer = document.getElementById('login-form-container');
            if (formContainer) {
                formContainer.classList.add('animate-shake');
                setTimeout(() => formContainer.classList.remove('animate-shake'), 500);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 overflow-hidden relative font-sans">
            {/* Background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
            <div className="absolute top-[20%] right-[-10%] w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
            <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

            {/* Login Card inside Glassmorphism container */}
            <div
                id="login-form-container"
                className="relative z-10 w-full max-w-md mx-auto p-8 lg:p-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl transition-all duration-300 transform"
                style={{ animation: 'slideUpFade 0.7s ease-out forwards' }}
            >
                <div>
                    <h2 className="text-center text-4xl font-extrabold text-white tracking-tight mb-2 opacity-90">
                        Admin Portal
                    </h2>
                    <p className="text-center text-indigo-200 text-sm font-medium mb-8">
                        Sign in to manage your system
                    </p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div className="relative group">
                            <label htmlFor="username" className="sr-only">Username</label>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-300 transition-colors group-hover:text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                onFocus={() => setIsFocused('username')}
                                onBlur={() => setIsFocused('')}
                                className={`block w-full pl-10 pr-3 py-3 border ${isFocused === 'username' ? 'border-indigo-400 ring-2 ring-indigo-400 ring-opacity-50' : 'border-white/20'} rounded-xl text-white placeholder-indigo-300 bg-white/5 focus:outline-none focus:bg-white/10 transition-all duration-300 sm:text-sm`}
                                placeholder="Username"
                                value={formData.username}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="relative group">
                            <label htmlFor="password" className="sr-only">Password</label>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-300 transition-colors group-hover:text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                onFocus={() => setIsFocused('password')}
                                onBlur={() => setIsFocused('')}
                                className={`block w-full pl-10 pr-3 py-3 border ${isFocused === 'password' ? 'border-indigo-400 ring-2 ring-indigo-400 ring-opacity-50' : 'border-white/20'} rounded-xl text-white placeholder-indigo-300 bg-white/5 focus:outline-none focus:bg-white/10 transition-all duration-300 sm:text-sm`}
                                placeholder="Password"
                                value={formData.password}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 flex items-center animate-fade-in">
                            <svg className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <p className="text-red-200 text-sm font-medium">{error}</p>
                        </div>
                    )}

                    <div className="flex items-center justify-end">
                        <div className="text-sm">
                            <a href="/admin/forgot-password" className="font-medium text-indigo-300 hover:text-white transition-colors duration-200">
                                Forgot your password?
                            </a>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className={`group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500 transition-all duration-300 shadow-lg shadow-indigo-500/30 overflow-hidden ${loading ? 'opacity-80 cursor-wait' : 'hover:scale-[1.02]'}`}
                        >
                            {/* Shine effect on hover */}
                            <div className="absolute inset-0 -translate-x-full group-hover:animate-shine bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"></div>

                            {loading ? (
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : null}
                            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* Inline styles for custom keyframes since we don't have direct access to tailwind config easily here */}
            <style jsx="true">{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
                @keyframes slideUpFade {
                    0% { opacity: 0; transform: translateY(40px) scale(0.95); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes shine {
                    100% { transform: translateX(100%); }
                }
                .animate-shine {
                    animation: shine 1.5s infinite;
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
                }
                .animate-fade-in {
                    animation: fadeIn 0.3s ease-in;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default AdminLogin;
