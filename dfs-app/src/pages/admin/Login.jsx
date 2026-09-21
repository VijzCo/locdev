// src/pages/admin/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../hooks/useAuth';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import './Login.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async ({ email, password }) => {
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err.code === 'auth/invalid-credential'
        ? 'Invalid email or password.'
        : 'Login failed. Please try again.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg" />
      <div className="login-card">
        <div className="login-logo">
          <span className="login-logo-mark">DFS</span>
          <div>
            <strong>Admin Portal</strong>
            <small>Duty Free Sourcing Inc.</small>
          </div>
        </div>

        <h2>Sign In</h2>
        <p>Enter your credentials to access the content management system.</p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              className="form-input"
              type="email"
              placeholder="admin@dutyfreesourcing.co.ls"
              {...register('email', {
                required: 'Email required',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' }
              })}
            />
            {errors.email && <span className="form-error">{errors.email.message}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="login-pass-wrap">
              <input
                className="form-input"
                type={showPass ? 'text' : 'password'}
                placeholder="••••••••"
                {...register('password', { required: 'Password required' })}
              />
              <button
                type="button"
                className="login-pass-toggle"
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password && <span className="form-error">{errors.password.message}</span>}
          </div>

          <button
            type="submit"
            className="btn btn-primary login-btn"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in...' : (<><LogIn size={16} /> Sign In</>)}
          </button>
        </form>

        <div className="login-footer">
          <a href="/">← Back to website</a>
        </div>
      </div>
    </div>
  );
}
