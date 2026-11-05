import { useState } from 'react';

const csv = (v) => (v ? v.split(',').filter(Boolean) : []);

function Section({ title, children }) {
  return <div className="fsec"><h3>{title}</h3>{children}</div>;
}

export default function FilterSidebar({ className = '', cats, facets, params, update, toggleIn }) {
  const [more, setMore] = useState(false);
  const groups = [...new Set(cats.map((c) => c.group))];
  const count = (id) => facets.categories[id] || 0;
  const groupCount = (g) => cats.filter((c) => c.group === g).reduce((s, c) => s + count(c._id), 0);
  const total = Object.values(facets.categories).reduce((a, b) => a + b, 0);
  const authors = more ? facets.authors : facets.authors.slice(0, 6);
  const authorTitle = params.group === 'Sách' ? 'Tác giả' : 'Thương hiệu / Tác giả';

  return (
    <aside className={`sidebar-filter ${className}`}>
      <Section title="Nhóm sản phẩm">
        <ul className="tree">
          <li><button className={!params.group && !params.categoryId ? 'on' : ''} onClick={() => update({ group: '', categoryId: '' })}>Tất cả <em>{total}</em></button></li>
          {groups.map((g) => (
            <li key={g}>
              <button className={params.group === g && !params.categoryId ? 'on' : ''} onClick={() => update({ group: g, categoryId: '' })}>{g} <em>{groupCount(g)}</em></button>
              {params.group === g && (
                <ul>{cats.filter((c) => c.group === g).map((c) => (
                  <li key={c._id}><button className={params.categoryId === c._id ? 'on' : ''} onClick={() => update({ group: g, categoryId: c._id })}>{c.name} <em>{count(c._id)}</em></button></li>
                ))}</ul>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Giá">
        {facets.prices.map((p) => (
          <label key={p.key} className="check">
            <input type="checkbox" checked={csv(params.prices).includes(p.key)} onChange={() => toggleIn('prices', p.key)} disabled={!p.count && !csv(params.prices).includes(p.key)} />
            <span>{p.label}</span><em>{p.count}</em>
          </label>
        ))}
      </Section>

      <Section title={authorTitle}>
        {authors.map((a) => (
          <label key={a.value} className="check">
            <input type="checkbox" checked={csv(params.authors).includes(a.value)} onChange={() => toggleIn('authors', a.value)} />
            <span>{a.value === 'Đang cập nhật' ? 'Khác' : a.value}</span><em>{a.count}</em>
          </label>
        ))}
        {facets.authors.length > 6 && <button className="btn-link" onClick={() => setMore(!more)}>{more ? 'Thu gọn' : `Xem thêm (${facets.authors.length - 6})`}</button>}
      </Section>

      <Section title="Đánh giá">
        {[['', 'Tất cả'], ['4', 'Từ 4 sao trở lên'], ['3', 'Từ 3 sao trở lên']].map(([v, l]) => (
          <label key={v} className="check"><input type="radio" name="rating" checked={(params.minRating || '') === v} onChange={() => update({ minRating: v })} /><span>{l}</span></label>
        ))}
      </Section>

      <Section title="Tình trạng">
        <label className="check"><input type="checkbox" checked={!!params.inStock} onChange={(e) => update({ inStock: e.target.checked ? 'true' : '' })} /><span>Chỉ hiện sản phẩm còn hàng</span></label>
      </Section>
    </aside>
  );
}
