import { Link } from "react-router-dom";

function initialsFromName(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AuthorCard({ name, count, sampleBooks }) {
  const listUrl = `/list?author=${encodeURIComponent(name)}`;

  return (
    <article className="author-card">
      <div className="author-card__top">
        <div className="author-card__avatar" aria-hidden="true">
          {initialsFromName(name)}
        </div>
        <div className="author-card__meta">
          <h2 className="author-card__name">{name}</h2>
          <p className="author-card__count">
            <span className="author-card__count-num">{count}</span> đầu sách trong kho
          </p>
        </div>
      </div>

      {sampleBooks && sampleBooks.length > 0 ? (
        <div className="author-card__samples">
          <span className="author-card__samples-label">Một vài cuốn tiêu biểu</span>
          <ul className="author-card__covers">
            {sampleBooks.map((book) => {
              const src = book.imgSrc || book.image || "";
              return (
                <li key={book._id} className="author-card__cover-item">
                  <Link to={`/book/${book._id}`} className="author-card__cover-link" title={book.title}>
                    {src ? (
                      <img src={src} alt="" className="author-card__cover-img" />
                    ) : (
                      <div className="author-card__cover-placeholder" aria-hidden />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="author-card__actions">
        <Link to={listUrl} className="author-card__cta">
          Xem sách của tác giả
        </Link>
      </div>
    </article>
  );
}
