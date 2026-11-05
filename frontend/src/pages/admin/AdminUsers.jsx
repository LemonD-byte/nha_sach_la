import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import { ROLE, dateTime } from '../../api/format';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [add, setAdd] = useState(null);
  const load = () => api.get('/users', { params: { role, q } }).then((r) => setUsers(r.data));
  useEffect(() => { load(); }, [role]); // eslint-disable-line

  const patch = async (u, body, msg) => { try { await api.put(`/users/${u._id}`, body); toast(msg); load(); } catch (e) { toast(errMsg(e), 'err'); } };
  const create = async (e) => {
    e.preventDefault();
    try { await api.post('/users', add); toast('Đã tạo tài khoản'); setAdd(null); load(); } catch (er) { toast(errMsg(er), 'err'); }
  };
  const f = (k) => ({ value: add[k], onChange: (e) => setAdd({ ...add, [k]: e.target.value }) });

  return (
    <>
      <div className="row-between"><h1>Tài khoản</h1><button className="btn" onClick={() => setAdd({ fullName: '', email: '', password: '', phone: '', role: 'staff' })}>Thêm tài khoản</button></div>
      <div className="row gap wrap">
        <select value={role} onChange={(e) => setRole(e.target.value)}><option value="">Mọi vai trò</option>{Object.entries(ROLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <form className="row gap" onSubmit={(e) => { e.preventDefault(); load(); }}><input placeholder="Tên, email hoặc SĐT" value={q} onChange={(e) => setQ(e.target.value)} /><button className="btn btn-ghost">Tìm</button></form>
      </div>
      <table className="table">
        <thead><tr><th>Mã</th><th>Họ tên</th><th>Email</th><th>Vai trò</th><th>Ngày tạo</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>{users.map((u) => (
          <tr key={u._id}><td>{u._id}</td><td>{u.fullName}</td><td>{u.email}</td><td>{ROLE[u.role]}</td><td>{dateTime(u.createdAt)}</td>
            <td>{u.status === 'active' ? 'Hoạt động' : <span className="badge st-cancelled">Đã khóa</span>}</td>
            <td className="nowrap">{u._id !== me._id && <>
              <button className="btn-link" onClick={() => patch(u, { status: u.status === 'active' ? 'locked' : 'active' }, 'Đã cập nhật trạng thái')}>{u.status === 'active' ? 'Khóa' : 'Mở khóa'}</button>
              {u.role !== 'customer' && <button className="btn-link" onClick={() => patch(u, { role: u.role === 'admin' ? 'staff' : 'admin' }, 'Đã đổi vai trò')}>{u.role === 'admin' ? 'Hạ thành nhân viên' : 'Nâng thành admin'}</button>}
            </>}</td></tr>))}
        </tbody>
      </table>
      {add && (
        <Modal title="Thêm tài khoản" onClose={() => setAdd(null)}>
          <form onSubmit={create}>
            <label>Họ và tên<input required {...f('fullName')} /></label>
            <label>Email<input type="email" required {...f('email')} /></label>
            <label>Số điện thoại<input {...f('phone')} /></label>
            <label>Mật khẩu<input type="password" minLength="6" required {...f('password')} /></label>
            <label>Vai trò<select {...f('role')}>{Object.entries(ROLE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <button className="btn">Tạo tài khoản</button>
          </form>
        </Modal>
      )}
    </>
  );
}
