import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api/client';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      const u = await login(form.email, form.password);
      nav(loc.state?.from || (u.role === 'customer' ? '/' : '/admin'), { replace: true });
    } catch (e2) { setErr(errMsg(e2)); }
  };
  return (
    <form className="panel auth" onSubmit={submit}>
      <h1>Đăng nhập</h1>
      {err && <p className="error">{err}</p>}
      <label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
      <label>Mật khẩu<input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
      <button className="btn block">Đăng nhập</button>
      <p className="center small">Chưa có tài khoản? <Link to="/register">Đăng ký</Link></p>
    </form>
  );
}
