import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';

export default function AdminCategories() {
  const toast = useToast();
  const [cats, setCats] = useState([]);
  const [edit, setEdit] = useState(null);
  const load = () => api.get('/categories').then((r) => setCats(r.data));
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      edit._id ? await api.put(`/categories/${edit._id}`, edit) : await api.post('/categories', edit);
      toast('Đã lưu danh mục'); setEdit(null); load();
    } catch (er) { toast(errMsg(er), 'err'); }
  };
  const remove = async (c) => {
    if (!confirm(`Xóa danh mục "${c.name}"?`)) return;
    try { await api.delete(`/categories/${c._id}`); toast('Đã xóa'); load(); } catch (er) { toast(errMsg(er), 'err'); }
  };

  return (
    <>
      <div className="row-between"><h1>Danh mục</h1><button className="btn" onClick={() => setEdit({ name: '', description: '', group: 'Sách' })}>Thêm danh mục</button></div>
      <table className="table">
        <thead><tr><th>Mã</th><th>Tên</th><th>Nhóm</th><th>Mô tả</th><th></th></tr></thead>
        <tbody>{cats.map((c) => (
          <tr key={c._id}><td>{c._id}</td><td>{c.name}</td><td>{c.group}</td><td className="small">{c.description}</td>
            <td className="nowrap"><button className="btn-link" onClick={() => setEdit(c)}>Sửa</button><button className="btn-link danger" onClick={() => remove(c)}>Xóa</button></td></tr>))}
        </tbody>
      </table>
      {edit && (
        <Modal title={edit._id ? `Sửa ${edit._id}` : 'Thêm danh mục'} onClose={() => setEdit(null)}>
          <form onSubmit={save}>
            <label>Tên danh mục<input required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
            <label>Nhóm<select value={edit.group} onChange={(e) => setEdit({ ...edit, group: e.target.value })} disabled={!!edit._id}>
              {['Sách', 'Dụng cụ học tập', 'Đồ chơi'].map((g) => <option key={g}>{g}</option>)}</select></label>
            <label>Mô tả<textarea rows="2" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></label>
            <button className="btn">Lưu danh mục</button>
          </form>
        </Modal>
      )}
    </>
  );
}
