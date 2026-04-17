import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { buildAuthorDirectory } from "./aggregateAuthors";
import { fetchCatalogProductsForAuthorDirectory } from "./fetchCatalogProducts";
import AuthorCard from "./AuthorCard";
import "./FeaturedAuthors.css";

function FeaturedAuthors() {
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await fetchCatalogProductsForAuthorDirectory();
        if (!cancelled) {
          setAuthors(buildAuthorDirectory(list));
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setError("Không tải được danh sách tác giả. Vui lòng thử lại sau.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return authors;
    }
    return authors.filter((a) => a.name.toLowerCase().includes(q));
  }, [authors, query]);

  return (
    <div className="featured-authors-page">
      <Header />
      <main className="featured-authors-main">
        <div className="featured-authors-hero">
          <p className="featured-authors-crumb">
            <Link to="/">Trang chủ</Link>
            <span>/</span>
            Tác giả nổi bật
          </p>
          <h1 className="featured-authors-title">Khám phá theo tác giả</h1>
          <p className="featured-authors-subtitle">
            Tập hợp các tác giả có sách trong kho Bookie. Chọn tác giả để xem toàn bộ đầu sách hoặc mở nhanh
            từng cuốn tiêu biểu.
          </p>
          {!loading && !error && authors.length > 0 ? (
            <p className="featured-authors-meta" role="status">
              <span className="featured-authors-meta__num">{authors.length}</span> tác giả · dữ liệu từ danh mục
              sách
            </p>
          ) : null}
          <div className="featured-authors-search">
            <input
              type="search"
              placeholder="Tìm theo tên tác giả..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Tìm tác giả"
            />
          </div>
        </div>

        {loading && <div className="featured-authors-loading">Đang tải danh sách tác giả…</div>}
        {error && <div className="featured-authors-error">{error}</div>}

        {!loading && !error && filtered.length === 0 && (
          <div className="featured-authors-empty">
            {authors.length === 0 ? (
              <>
                <p className="featured-authors-empty__title">Chưa tìm thấy tác giả trong danh mục</p>
                <p className="featured-authors-empty__text">
                  Hệ thống chưa đọc được sản phẩm nào từ kho sách để gom theo tác giả. Vui lòng thử lại sau hoặc
                  kiểm tra kết nối tới dịch vụ danh mục.
                </p>
              </>
            ) : (
              <>
                <p className="featured-authors-empty__title">Không khớp tìm kiếm</p>
                <p className="featured-authors-empty__text">
                  Không có tác giả khớp bộ lọc. Thử từ khóa khác hoặc xóa ô tìm kiếm để xem toàn bộ.
                </p>
              </>
            )}
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="featured-authors-grid">
            {filtered.map((a) => (
              <AuthorCard key={a.name} name={a.name} count={a.count} sampleBooks={a.sampleBooks} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default FeaturedAuthors;
