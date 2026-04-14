import { Link } from "react-router-dom";

function formatPriceVnd(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "";
  }
  try {
    return `${Number(value).toLocaleString("vi-VN")} đ`;
  } catch {
    return String(value);
  }
}

export default function ChatProductCard({ item }) {
  const { title, author, price, imgSrc, reasonTag, reasonLine, graphBadges, detailPath } = item;
  const href = detailPath || "#";
  const badges = Array.isArray(graphBadges) ? graphBadges : [];

  const inner = (
    <>
      <div className="chat-card-cover">
        {imgSrc ? (
          <img src={imgSrc} alt="" className="chat-card-img" loading="lazy" />
        ) : (
          <div className="chat-card-img chat-card-img--placeholder" aria-hidden />
        )}
      </div>
      <div className="chat-card-body">
        <div className="chat-card-title">{title || "Sách"}</div>
        {author ? <div className="chat-card-author">{author}</div> : null}
        {badges.length > 0 ? (
          <div className="chat-card-badges" aria-label="Lý do gợi ý">
            {badges.slice(0, 3).map((b) => (
              <span key={b} className="chat-card-badge">
                {b}
              </span>
            ))}
          </div>
        ) : null}
        <div className="chat-card-meta">
          {price !== undefined && price !== null ? (
            <span className="chat-card-price">{formatPriceVnd(price)}</span>
          ) : null}
          {reasonTag ? <span className="chat-card-tag">{reasonTag}</span> : null}
        </div>
        {reasonLine ? <p className="chat-card-reason-line">{reasonLine}</p> : null}
        {detailPath ? <span className="chat-card-action">Xem chi tiết →</span> : null}
      </div>
    </>
  );

  if (detailPath && detailPath !== "#") {
    return (
      <Link to={detailPath} className="chat-product-card">
        {inner}
      </Link>
    );
  }

  return <div className="chat-product-card chat-product-card--static">{inner}</div>;
}
