export default function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="row-between"><h2>{title}</h2><button className="btn-link" onClick={onClose}>Đóng</button></div>
        {children}
      </div>
    </div>
  );
}
