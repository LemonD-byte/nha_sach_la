import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import { money, dateTime, couponLabel } from '../../api/format';

const pad = (n) => String(n).padStart(2, '0');
const toInput = (d) => {
  if (!d) return '';
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
};
const EMPTY = { code: '', description: '', discountType: 'percent', discountValue: 10, maxDiscount: 0, minOrderAmount: 0,
  usageLimit: 0, perUserLimit: 1, startsAt: '', expiresAt: '', isPublic: true, isActive: true };

function state(c) {
  const now = Date.now();
  if (!c.isActive) return ['Đã tắt', 'badge-red'];
  if (c.expiresAt && now > new Date(c.expiresAt)) return ['Hết hạn', 'badge-red'];
  if (c.startsAt && now < new Date(c.startsAt)) return ['Chưa bắt đầu', 'st-pending'];
  if (c.usageLimit > 0 && c.usedCount >= c.usageLimit) return ['Hết lượt', 'badge-red'];
  return ['Đang chạy', 'st-delivered'];
}

export default function AdminCoupons() {
  const toast = useToast();
  const [coupons, setCoupons] = useState([]);
  const [edit, setEdit] = useState(null);
  const load = () => api.get('/coupons').then((r) => setCoupons(r.data));
  useEffect(() => { load(); }, []);

  const open = (c) => setEdit(c ? { ...c, startsAt: toInput(c.startsAt), expiresAt: toInput(c.expiresAt) } : { ...EMPTY });
  const save = async (e) => {
    e.preventDefault();
    const body = { ...edit, startsAt: edit.startsAt ? new Date(edit.startsAt).toISOString() : null,
      expiresAt: edit.expiresAt ? new Date(edit.expiresAt).toISOString() : null };
    try {
      edit._id ? await api.put(`/coupons/${edit._id}`, body) : await api.post('/coupons', body);
      toast('Đã lưu mã giảm giá'); setEdit(null); load();
    } catch (er) { toast(errMsg(er), 'err'); }
  };
  const toggle = async (c) => {
    try { await api.put(`/coupons/${c._id}`, { isActive: !c.isActive }); load(); } catch (er) { toast(errMsg(er), 'err'); }
  };
  const remove = async (c) => {
    if (!confirm(`Xóa mã "${c.code}"?`)) return;
    try { const { data } = await api.delete(`/coupons/${c._id}`); toast(data.message); load(); } catch (er) { toast(errMsg(er), 'err'); }
  };
  const set = (k) => (e) => setEdit({ ...edit, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  const percent = edit?.discountType === 'percent';

  return (
    <>
      <div className="row-between"><h1>Mã giảm giá</h1><button className="btn" onClick={() => open(null)}>Thêm mã giảm giá</button></div>
      <table className="table">
        <thead><tr><th>Mã</th><th>Ưu đãi</th><th>Điều kiện</th><th>Đã dùng</th><th>Hiệu lực</th><th>Trạng thái</th><th></th></tr></thead>
        <tbody>{coupons.map((c) => {
          const [label, cls] = state(c);
          return (
            <tr key={c._id}>
              <td><strong>{c.code}</strong><div className="small muted">{c._id}{!c.isPublic && ' · mã riêng'}</div></td>
              <td>{couponLabel(c)}<div className="small muted">{c.description}</div></td>
              <td className="small">Đơn từ {money(c.minOrderAmount)}<br />{c.perUserLimit ? `${c.perUserLimit} lượt/khách` : 'Không giới hạn/khách'}</td>
              <td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ' / ∞'}</td>
              <td className="small">{c.startsAt ? dateTime(c.startsAt) : 'Ngay'} →<br />{c.expiresAt ? dateTime(c.expiresAt) : 'Không hết hạn'}</td>
              <td><span className={`badge ${cls}`}>{label}</span></td>
              <td className="nowrap">
                <button className="btn-link" onClick={() => open(c)}>Sửa</button>
                <button className="btn-link" onClick={() => toggle(c)}>{c.isActive ? 'Tắt' : 'Bật'}</button>
                <button className="btn-link danger" onClick={() => remove(c)}>Xóa</button>
              </td>
            </tr>
          );
        })}</tbody>
      </table>
      {coupons.length === 0 && <p className="muted center">Chưa có mã giảm giá nào.</p>}

      {edit && (
        <Modal title={edit._id ? `Sửa ${edit.code}` : 'Thêm mã giảm giá'} onClose={() => setEdit(null)}>
          <form onSubmit={save}>
            <label>Mã (chữ, số, - hoặc _)<input required value={edit.code} onChange={set('code')} disabled={!!edit._id} pattern="[A-Za-z0-9_\-]{3,30}" style={{ textTransform: 'uppercase' }} /></label>
            <label>Mô tả<input value={edit.description} onChange={set('description')} placeholder="VD: Giảm 10% cho đơn từ 100.000₫" /></label>
            <div className="row gap">
              <label className="grow">Loại giảm
                <select value={edit.discountType} onChange={set('discountType')}><option value="percent">Theo phần trăm (%)</option><option value="fixed">Số tiền cố định (₫)</option></select></label>
              <label className="grow">Giá trị {percent ? '(%)' : '(₫)'}
                <input type="number" required min="1" max={percent ? 100 : undefined} value={edit.discountValue} onChange={set('discountValue')} /></label>
            </div>
            <div className="row gap">
              {percent && <label className="grow">Giảm tối đa (₫, 0 = không giới hạn)<input type="number" min="0" value={edit.maxDiscount} onChange={set('maxDiscount')} /></label>}
              <label className="grow">Đơn tối thiểu (₫)<input type="number" min="0" value={edit.minOrderAmount} onChange={set('minOrderAmount')} /></label>
            </div>
            <div className="row gap">
              <label className="grow">Tổng lượt dùng (0 = không giới hạn)<input type="number" min="0" value={edit.usageLimit} onChange={set('usageLimit')} /></label>
              <label className="grow">Lượt dùng mỗi khách (0 = không giới hạn)<input type="number" min="0" value={edit.perUserLimit} onChange={set('perUserLimit')} /></label>
            </div>
            <div className="row gap">
              <label className="grow">Bắt đầu<input type="datetime-local" value={edit.startsAt} onChange={set('startsAt')} /></label>
              <label className="grow">Hết hạn<input type="datetime-local" value={edit.expiresAt} onChange={set('expiresAt')} /></label>
            </div>
            <label className="radio"><input type="checkbox" checked={edit.isPublic} onChange={set('isPublic')} /> Hiển thị công khai (bỏ chọn = mã riêng, khách phải tự nhập)</label>
            <label className="radio"><input type="checkbox" checked={edit.isActive} onChange={set('isActive')} /> Đang bật</label>
            <button className="btn">Lưu mã giảm giá</button>
          </form>
        </Modal>
      )}
    </>
  );
}