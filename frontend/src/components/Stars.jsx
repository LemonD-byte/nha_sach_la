export default function Stars({ value = 0, onChange, size = 18 }) {
  return (
    <span className="stars" style={{ fontSize: size }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(value) ? 'on' : ''} onClick={onChange ? () => onChange(n) : undefined}
          style={{ cursor: onChange ? 'pointer' : 'default' }}>★</span>
      ))}
    </span>
  );
}
