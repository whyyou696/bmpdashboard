'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    // Check if already logged in
    const isLoggedIn = sessionStorage.getItem('isLoggedIn') === 'true';
    if (isLoggedIn) {
      router.push('/');
    }
  }, [router]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username.trim() === 'adm01' && password === 'admpas01') {
      sessionStorage.setItem('isLoggedIn', 'true');
      router.push('/');
    } else {
      setErrorMsg('Username atau password salah!');
      setShake(true);
      // Reset shake class after animation completes so it can be re-triggered
      setTimeout(() => setShake(false), 400);
    }
  };

  return (
    <div className="login-container" id="login-container" style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="login-card">
        <div className="login-header">
          <img src="/assets/logo_best.png" alt="Best Multi Payment Logo" className="login-logo" />
          <h2>BMP Dashboard</h2>
          <p>Sign in to access your Dashboard</p>
        </div>
        <div className="vpn-alert">
          <i className="fa-solid fa-shield-halved"></i>
          <span>Please Connect to your OpenVPN before</span>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="username">
              <i className="fa-regular fa-user"></i> Username
            </label>
            <input
              type="text"
              id="username"
              required
              placeholder="Enter your username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">
              <i className="fa-solid fa-lock"></i> Password
            </label>
            <div className="password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                required
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <i
                className={`fa-regular ${showPassword ? 'fa-eye-slash' : 'fa-eye'} toggle-password`}
                id="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                style={{ cursor: 'pointer' }}
              ></i>
            </div>
          </div>
          
          {errorMsg && (
            <div 
              className="error-box" 
              id="error-box" 
              style={{ 
                display: 'flex', 
                animation: shake ? 'shake 0.4s ease' : 'none' 
              }}
            >
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{errorMsg}</span>
            </div>
          )}

          <button type="submit" className="btn-login" id="btn-login">
            <span>Sign In</span> <i className="fa-solid fa-arrow-right"></i>
          </button>
        </form>
      </div>
    </div>
  );
}
