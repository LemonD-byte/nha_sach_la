import { Link } from 'react-router-dom';
import BookCover from './BookCover';
import Stars from './Stars';
import WishButton from './WishButton';
import { money } from '../api/format';

export default function BookCard({ book }) {
  const out = book.stock === 0;
  return (
    <Link to={`/books/${book._id}`} className={`book-card ${out ? 'is-out' : ''}`}>
      <div className="cover-wrap">
        <BookCover book={book} />
        <WishButton bookId={book._id} />
        {out && <span className="ribbon ribbon-red">Hết hàng</span>}
        {!out && book.stock <= 10 && <span className="ribbon">Còn {book.stock}</span>}
      </div>
      <div className="book-card-body">
        <h3>{book.title}</h3>
        <p className="muted small">{book.author === 'Đang cập nhật' ? '' : book.author}</p>
        <strong className="price">{money(book.price)}</strong>
        <div className="small rate"><Stars value={book.ratingAvg} size={14} /><span className="muted">{book.ratingCount ? ` (${book.ratingCount})` : ''}</span></div>
      </div>
    </Link>
  );
}
