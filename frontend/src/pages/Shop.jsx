import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import BookCard from '../components/BookCard';
import FilterSidebar from '../components/FilterSidebar';
import Pagination from '../components/Pagination';

const SORTS = [['newest', 'Mới nhất'], ['rating', 'Đánh giá cao'], ['price-asc', 'Giá thấp đến cao'], ['price-desc', 'Giá cao đến thấp'], ['name', 'Tên A–Z']];
const csv = (v) => (v ? v.split(',').filter(Boolean) : []);

export default function Shop() {
  const [sp, setSp] = useSearchParams();
  const [cats, setCats] = useState([]);
  const [facets, setFacets] = useState({ authors: [], categories: {}, prices: [] });
  const [data, setData] = useState({ items: [], pages: 1, total: 0, page: 1 });
  const [loading, setLoading] = useState(true);
  const [showFilter, setShowFilter] = useState(false);

  const params = useMemo(() => Object.fromEntries(sp.entries()), [sp]);
  const key = sp.toString();

  useEffect(() => { api.get('/categories').then((r) => setCats(r.data)); }, []);
  useEffect(() => {
    setLoading(true);
    const { page, limit, sort, ...filters } = params;
    api.get('/books', { params: { limit: 12, ...params } }).then((r) => setData(r.data)).finally(() => setLoading(false));
    api.get('/books/facets', { params: filters }).then((r) => setFacets(r.data));
  }, [key]); // eslint-disable-line

  /** Cập nhật bộ lọc trên URL; mọi thay đổi (trừ đổi trang) đưa về trang 1 */
  const update = (patch, keepPage = false) => {
    const next = { ...params, ...patch };
    if (!keepPage) delete next.page;
    Object.keys(next).forEach((k) => { if (next[k] === '' || next[k] == null || next[k] === false) delete next[k]; });
    setSp(next);
  };
  const toggleIn = (field, value) => {
    const cur = csv(params[field]);
    update({ [field]: (cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value]).join(',') });
  };

  // Các “chip” bộ lọc đang áp dụng
  const catName = (id) => cats.find((c) => c._id === id)?.name;
  const chips = [
    params.search && { label: `Từ khóa: ${params.search}`, clear: { search: '' } },
    params.group && { label: params.group, clear: { group: '', categoryId: '' } },
    params.categoryId && { label: catName(params.categoryId), clear: { categoryId: '' } },
    ...csv(params.prices).map((p) => ({ label: facets.prices.find((x) => x.key === p)?.label || p, clear: { prices: csv(params.prices).filter((x) => x !== p).join(',') } })),
    ...csv(params.authors).map((a) => ({ label: a, clear: { authors: csv(params.authors).filter((x) => x !== a).join(',') } })),
    params.minRating && { label: `Từ ${params.minRating} sao`, clear: { minRating: '' } },
    params.inStock && { label: 'Còn hàng', clear: { inStock: '' } },
  ].filter(Boolean);

  return (
    <div className="shop">
      <button className="btn btn-ghost filter-toggle" onClick={() => setShowFilter(!showFilter)}>{showFilter ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}</button>
      <FilterSidebar className={showFilter ? 'open' : ''} cats={cats} facets={facets} params={params} update={update} toggleIn={toggleIn} />

      <section className="shop-main">
        <div className="toolbar">
          <div>
            <h1>{params.search ? `Kết quả cho “${params.search}”` : params.categoryId ? catName(params.categoryId) : params.group || 'Tất cả sản phẩm'}</h1>
            <span className="muted small">{data.total} sản phẩm</span>
          </div>
          <div className="row gap wrap">
            <label className="inline">Sắp xếp theo
              <select value={params.sort || 'newest'} onChange={(e) => update({ sort: e.target.value })}>{SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </label>
            <label className="inline">Hiển thị
              <select value={params.limit || 12} onChange={(e) => update({ limit: e.target.value })}>{[12, 24, 48].map((n) => <option key={n} value={n}>{n} sản phẩm</option>)}</select>
            </label>
          </div>
        </div>

        {chips.length > 0 && (
          <div className="active-chips">
            {chips.map((c, i) => <button key={i} className="fchip" onClick={() => update(c.clear)}>{c.label} <span aria-hidden>×</span></button>)}
            <button className="btn-link" onClick={() => setSp({})}>Xóa tất cả</button>
          </div>
        )}

        {loading ? <p className="center muted">Đang tải…</p> : data.items.length === 0 ? (
          <div className="panel center"><h2>Không tìm thấy sản phẩm phù hợp</h2><p className="muted">Hãy thử bỏ bớt bộ lọc hoặc đổi từ khóa.</p><button className="btn" onClick={() => setSp({})}>Xóa bộ lọc</button></div>
        ) : <div className="grid">{data.items.map((b) => <BookCard key={b._id} book={b} />)}</div>}
        <Pagination page={data.page} pages={data.pages} onChange={(page) => { update({ page }, true); window.scrollTo({ top: 0 }); }} />
      </section>
    </div>
  );
}
