// “Đã xem gần đây”: lưu id sách trong localStorage, tối đa 10, mới nhất ở đầu, không trùng
const KEY = 'recentBooks';
const MAX = 10;

export function getRecent() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(v) ? v.slice(0, MAX) : [];
  } catch { return []; }
}
const save = (ids) => { try { localStorage.setItem(KEY, JSON.stringify(ids.slice(0, MAX))); } catch { /* bỏ qua */ } };

export const pushRecent = (id) => save([id, ...getRecent().filter((x) => x !== id)]);
export const removeRecent = (id) => save(getRecent().filter((x) => x !== id));
