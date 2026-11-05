import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { money } from '../../api/format';

const EMPTY = { title: '', author: '', price: '', stock: '', description: '', imageUrl: '', categoryId: '', isActive: true };

export default function AdminBooks() {
  const { user } = useAuth();
  const toast = useToast();
  const [cats, setCats] = useState([]);
  const [data, setData] = useState({ items: [], pages: 1, page: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState(null);

  const load = () => api.get('/books', { params: { includeInactive: true, search, page, limit: 15 } }).then((r) => setData(r.data));
  useEffect(() => { api.get('/categories').then((r) => setCats(r.data)); }, []);
  useEffect(() => { load(); }, [page]); // eslint-disable-line

  const save = async (e) => {
    e.preventDefault();
    const body = { ...edit, price: +edit.price, stock: +edit.stock };
    try {
      edit._id ? await api.put(`/books/${edit._id}`, body) : await api.post('/books', body);
      toast('Đã lưu sản phẩm'); setEdit(null); load();
    } catch (er) { toast(errMsg(er), 'err'); }
  };
  const remove = async (b) => {
    if (!confirm(`Xóa "${b.title}"?`)) return;
    try { const { data: d } = await api.delete(`/books/${b._id}`); toast(d.message); load(); } catch (er) { toast(errMsg(er), 'err'); }
  };
  const f = (k, extra = {}) => ({ value: edit[k] ?? '', onChange: (e) => setEdit({ ...edit, [k]: e.target.value }), ...extra });
  const catName = (id) => cats.find((c) => c._id === id)?.name || id;

  return (
    <>
      <div className="row-between"><h1>Sản phẩm</h1><button className="btn" onClick={() => setEdit({ ...EMPTY, categoryId: cats[0]?._id || '' })}>Thêm sản phẩm</button></div>
      <form className="row gap" onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}>
        <input placeholder="Tìm theo tên hoặc tác giả" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn btn-ghost">Tìm</button>
      </form>
      <table className="table">
        <thead><tr><th>Mã</th><th>Tên</th><th>Danh mục</th><th>Giá</th><th>Tồn</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>{data.items.map((b) => (
          <tr key={b._id}>
            <td>{b._id}</td><td>{b.title}<div className="muted small">{b.author}</div></td><td>{catName(b.categoryId)}</td>
            <td>{money(b.price)}</td><td>{b.stock}</td><td>{b.isActive ? 'Đang bán' : <span className="muted">Đã ẩn</span>}</td>
            <td className="nowrap"><button className="btn-link" onClick={() => setEdit(b)}>Sửa</button>{user.role === 'admin' && <button className="btn-link danger" onClick={() => remove(b)}>Xóa</button>}</td>
          </tr>))}
        </tbody>
      </table>
      <Pagination page={data.page} pages={data.pages} onChange={setPage} />

      {edit && (
        <Modal title={edit._id ? `Sửa ${edit._id}` : 'Thêm sản phẩm'} onClose={() => setEdit(null)}>
          <form onSubmit={save}>
            <label>Tên sản phẩm<input required {...f('title')} /></label>
            <label>Tác giả / thương hiệu<input {...f('author')} /></label>
            <div className="row gap">
              <label className="grow">Giá (₫)<input type="number" min="0" required {...f('price')} /></label>
              <label className="grow">Tồn kho<input type="number" min="0" required {...f('stock')} /></label>
            </div>
            <label>Danh mục<select required {...f('categoryId')}>{cats.map((c) => <option key={c._id} value={c._id}>{c.group} › {c.name}</option>)}</select></label>
            <label>Đường dẫn ảnh bìa<input placeholder="https://…" {...f('imageUrl')} /></label>
            <label>Mô tả<textarea rows="3" {...f('description')} /></label>
            <label className="radio"><input type="checkbox" checked={edit.isActive} onChange={(e) => setEdit({ ...edit, isActive: e.target.checked })} /> Đang bán</label>
            <button className="btn">Lưu sản phẩm</button>
          </form>
        </Modal>
      )}
    </>
  );
}
