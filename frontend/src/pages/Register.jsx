import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { errMsg } from '../api/client';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', address: '', password: '' });
  const [err, setErr] = useState('');
  const f = (k, extra = {}) => ({ value: form[k], onChange: (e) => setForm({ ...form, [k]: e.target.value }), ...extra });

  const submit = async (e) => {
    e.preventDefault();
    try { await register(form); nav('/'); } catch (e2) { setErr(errMsg(e2)); }
  };
  return (
    <form className="panel auth" onSubmit={submit}>
      <h1>Đăng ký tài khoản</h1>
      {err && <p className="error">{err}</p>}
      <label>Họ và tên<input required {...f('fullName')} /></label>
      <label>Email<input type="email" required {...f('email')} /></label>
      <label>Số điện thoại<input {...f('phone')} /></label>
      <label>Địa chỉ<input {...f('address')} /></label>
      <label>Mật khẩu (tối thiểu 6 ký tự)<input type="password" required minLength="6" {...f('password')} /></label>
      <button className="btn block">Tạo tài khoản</button>
      <p className="center small">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
    </form>
  );
}
