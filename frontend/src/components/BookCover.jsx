// Bìa sách: dùng ảnh nếu có, nếu không thì vẽ bìa xanh lá cổ điển với tên sách
export default function BookCover({ book, className = '' }) {
  if (book.imageUrl) return <img className={`cover ${className}`} src={book.imageUrl} alt={book.title} />;
  return (
    <div className={`cover cover-blank ${className}`} aria-label={book.title}>
      <span className="cover-leaf">🍃</span>
      <span className="cover-title">{book.title}</span>
      <span className="cover-author">{book.author}</span>
    </div>
  );
}
