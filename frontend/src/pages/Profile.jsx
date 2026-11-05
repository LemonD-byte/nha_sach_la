import { useState } from 'react';
import api, { errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ROLE } from '../api/format';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ fullName: user.fullName, phone: user.phone || '', address: user.address || '' });
  const [pw, setPw] = useState({ oldPassword: '', newPassword: '' });

  const save = async (e) => {
    e.preventDefault();
    try { setUser((await api.put('/auth/me', form)).data); toast('Đã lưu thông tin'); } catch (er) { toast(errMsg(er), 'err'); }
  };
  const changePw = async (e) => {
    e.preventDefault();
    try { await api.put('/auth/password', pw); setPw({ oldPassword: '', newPassword: '' }); toast('Đã đổi mật khẩu'); } catch (er) { toast(errMsg(er), 'err'); }
  };
  return (
    <div className="two-col">
      <form className="panel" onSubmit={save}>
        <h2>Thông tin cá nhân</h2>
        <p className="muted small">{user.email} · {ROLE[user.role]}</p>
        <label>Họ và tên<input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></label>
        <label>Số điện thoại<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        <label>Địa chỉ<input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
        <button className="btn">Lưu thay đổi</button>
      </form>
      <form className="panel" onSubmit={changePw}>
        <h2>Đổi mật khẩu</h2>
        <label>Mật khẩu hiện tại<input type="password" required value={pw.oldPassword} onChange={(e) => setPw({ ...pw, oldPassword: e.target.value })} /></label>
        <label>Mật khẩu mới<input type="password" required minLength="6" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} /></label>
        <button className="btn">Đổi mật khẩu</button>
      </form>
    </div>
  );
}
