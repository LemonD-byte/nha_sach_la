import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api, { errMsg } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

/** Nút trái tim dùng chung cho BookCard (variant "card") và BookDetail (variant "inline").
 *  Chưa đăng nhập → /login; admin/staff không có tính năng này nên không hiện. */
export default function WishButton({ bookId, variant = 'card' }) {
  const { user, wishIds, setWishIds } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const loc = useLocation();
  const [busy, setBusy] = useState(false);

  if (user && user.role !== 'customer') return null;
  const liked = wishIds.includes(bookId);

  const click = async (e) => {
    e.preventDefault(); e.stopPropagation(); // nút nằm trong thẻ <Link> của BookCard
    if (!user) return nav('/login', { state: { from: loc.pathname + loc.search } });
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await (liked ? api.delete(`/wishlist/${bookId}`) : api.post(`/wishlist/${bookId}`));
      setWishIds(data.ids);
      toast(liked ? 'Đã bỏ khỏi yêu thích' : 'Đã thêm vào yêu thích');
    } catch (err) { toast(errMsg(err), 'err'); }
    setBusy(false);
  };

  const label = liked ? 'Bỏ thích' : 'Thêm vào yêu thích';
  return (
    <button type="button" className={`wish wish-${variant} ${liked ? 'on' : ''}`} onClick={click} disabled={busy}
      aria-pressed={liked} aria-label={label} title={label}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
        <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 7.9 3.4 4.8 6.6 4.8c2 0 3.6 1.1 5.4 3.2 1.8-2.1 3.4-3.2 5.4-3.2 3.2 0 5.2 3.1 3.9 6.5-1.8 4.6-9.3 9.2-9.3 9.2z" />
      </svg>
      {variant === 'inline' && <span>{liked ? 'Đã yêu thích' : 'Yêu thích'}</span>}
    </button>
  );
}
