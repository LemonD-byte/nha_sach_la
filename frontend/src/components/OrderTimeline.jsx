import { STATUS, dateTime } from '../api/format';

export default function OrderTimeline({ history = [] }) {
  return (
    <ol className="timeline">
      {history.map((h, i) => (
        <li key={i}>
          <strong>{STATUS[h.status]}</strong> <span className="muted small">{dateTime(h.at)}</span>
          {h.note && <div className="small">{h.note}</div>}
        </li>
      ))}
    </ol>
  );
}
