import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { money, dateTime, couponLabel } from '../api/format';

const BellIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
);

export default function CouponBell() {
  const { user } = useAuth();
  const key = `seenCoupons:${user._id}`;
  const [list, setList] = useState([]);
  const [seen, setSeen] = useState(() => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } });
  const [fresh, setFresh] = useState([]);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState('');
  const box = useRef(null);

  const load = useCallback(() => api.get('/coupons/available').then((r) => setList(r.data)).catch(() => {}), []);
  useEffect(() => {
    load();
    const timer = setInterval(load, 60000);          // kiểm tra mã mới mỗi 60 giây
    window.addEventListener('focus', load);          // và mỗi khi khách quay lại tab
    return () => { clearInterval(timer); window.removeEventListener('focus', load); };
  }, [load]);
  useEffect(() => {
    const close = (e) => { if (box.current && !box.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const unread = list.filter((c) => !seen.includes(c.code)).length;
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setFresh(list.filter((c) => !seen.includes(c.code)).map((c) => c.code));
      const all = list.map((c) => c.code);
      setSeen(all);
      try { localStorage.setItem(key, JSON.stringify(all)); } catch { /* bỏ qua */ }
    }
  };
  const copy = async (code) => {
    try { await navigator.clipboard.writeText(code); setCopied(code); setTimeout(() => setCopied(''), 1500); } catch { /* bỏ qua */ }
  };

  return (
    <div className="bell" ref={box}>
      <button type="button" className="hdr-icon bell-btn" onClick={toggle} title="Mã giảm giá" aria-label="Thông báo mã giảm giá">
        <BellIcon />{unread > 0 && <b className="count">{unread}</b>}<span>Thông báo</span>
      </button>
      {open && (
        <div className="bell-panel">
          <div className="bell-head">Mã giảm giá dành cho bạn</div>
          {list.length === 0 && <p className="muted small bell-empty">Hiện chưa có mã giảm giá nào.</p>}
          {list.map((c) => (
            <div key={c.code} className="bell-item">
              <div className="row-between"><strong className="bell-code">{c.code}</strong>{fresh.includes(c.code) && <span className="badge">Mới</span>}</div>
              <div>{couponLabel(c)}</div>
              <div className="small muted">{c.description}</div>
              <div className="small muted">Đơn từ {money(c.minOrderAmount)} · {c.expiresAt ? `HSD ${dateTime(c.expiresAt)}` : 'Không hết hạn'}</div>
              <button type="button" className="btn-link" onClick={() => copy(c.code)}>{copied === c.code ? 'Đã sao chép ✓' : 'Sao chép mã'}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}