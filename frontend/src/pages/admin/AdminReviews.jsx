import { useEffect, useState } from 'react';
import api, { errMsg } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import Stars from '../../components/Stars';
import { dateTime } from '../../api/format';

export default function AdminReviews() {
  const toast = useToast();
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('');
  const load = () => api.get('/reviews', { params: { status } }).then((r) => setList(r.data));
  useEffect(() => { load(); }, [status]); // eslint-disable-line

  const run = async (req, msg) => { try { await req; toast(msg); load(); } catch (e) { toast(errMsg(e), 'err'); } };

  return (
    <>
      <h1>Đánh giá</h1>
      <select value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">Tất cả</option><option value="visible">Đang hiển thị</option><option value="hidden">Đã ẩn</option>
      </select>
      {list.length === 0 && <p className="muted center">Chưa có đánh giá.</p>}
      {list.map((r) => (
        <div key={r._id} className="panel">
          <div className="row-between"><strong>{r.bookTitle}</strong><span className="muted small">{r._id} · đơn {r.orderCode} · {dateTime(r.createdAt)}</span></div>
          <div className="row gap"><Stars value={r.rating} size={15} /><span className="small">{r.userName}</span>{r.status === 'hidden' && <span className="badge st-cancelled">Đã ẩn</span>}</div>
          <p>{r.comment}</p>
          {r.reply && <blockquote>{r.reply}</blockquote>}
          <div className="row gap">
            <button className="btn-link" onClick={() => { const t = prompt('Nội dung phản hồi', r.reply || ''); if (t !== null) run(api.patch(`/reviews/${r._id}/reply`, { reply: t }), 'Đã lưu phản hồi'); }}>{r.reply ? 'Sửa phản hồi' : 'Phản hồi'}</button>
            <button className="btn-link danger" onClick={() => run(api.patch(`/reviews/${r._id}/status`, { status: r.status === 'visible' ? 'hidden' : 'visible' }), 'Đã cập nhật')}>{r.status === 'visible' ? 'Ẩn đánh giá' : 'Hiện lại'}</button>
          </div>
        </div>))}
    </>
  );
}
