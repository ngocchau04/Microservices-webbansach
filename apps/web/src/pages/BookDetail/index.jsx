import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import "./BookDetail.css";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useUser } from "../../context/UserContext";
import {
  createProductReview,
  getProductById,
  getProducts,
  getProductReviews,
  getSimilarProducts,
} from "../../api/catalogApi";
import { getCart, getReviewEligibility, upsertCartItem } from "../../api/checkoutApi";
import { toggleFavorite } from "../../api/authApi";

const BookDetail = () => {
  const { user, setUser } = useUser();
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [stars, setStars] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [similarBooks, setSimilarBooks] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();
  const [reviewEligibility, setReviewEligibility] = useState(null);
  const [reviewEligibilityMsg, setReviewEligibilityMsg] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const getCartStockErrorMessage = (error) => {
    const payload = error?.response?.data || {};
    const code = payload?.code;
    const remainingStock = Number(payload?.remainingStock);
    const currentStock = Number(payload?.currentStock);

    if (code === "CHECKOUT_STOCK_OUT") {
      return "Sản phẩm này hiện đã hết hàng, vui lòng quay lại sau!";
    }
    if (code === "CHECKOUT_STOCK_MAX_IN_CART") {
      return "Bạn đã thêm tối đa số lượng hiện có trong kho.";
    }
    if (code === "CHECKOUT_STOCK_EXCEEDED") {
      if (Number.isFinite(remainingStock) && remainingStock > 0) {
        return `Sản phẩm chỉ còn ${remainingStock} cuốn trong kho.`;
      }
      if (Number.isFinite(currentStock) && currentStock >= 0) {
        return `Số lượng bạn chọn vượt quá tồn kho hiện tại. Sản phẩm còn ${currentStock} cuốn.`;
      }
      return "Số lượng bạn chọn vượt quá tồn kho hiện tại.";
    }

    if (String(payload?.message || "").includes("Quantity exceeds current stock")) {
      return "Số lượng bạn chọn vượt quá tồn kho hiện tại.";
    }

    return payload?.message || "Không thể cập nhật giỏ hàng.";
  };

  useEffect(() => {
    getProductById(id)
      .then((response) => {
        const product = response?.data?.item || response?.data?.product || null;
        setBook(product);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching book details:", error);
        setLoading(false);
      });

    getProductReviews(id)
      .then((response) => {
        const items = response?.data?.items || response?.data?.reviews || [];
        const normalized = Array.isArray(items)
          ? items.map((item) => ({
              ...item,
              timestamp: item.timestamp || item.createdAt,
            }))
          : [];
        setFeedbackList(normalized);
      })
      .catch((error) => console.error("Error fetching feedbacks:", error));
  }, [id]);

  useEffect(() => {
    if (!book) return undefined;

    let cancelled = false;
    const currentId = String(book._id ?? book.id ?? "");
    const targetLimit = 10;

    const extractSimilar = (response) => {
      const raw = response?.data;
      if (Array.isArray(raw)) return raw;
      if (raw && Array.isArray(raw.items)) return raw.items;
      if (Array.isArray(raw?.data?.items)) return raw.data.items;
      return [];
    };

    const extractProductList = (response) => {
      const raw = response?.data;
      if (Array.isArray(raw)) return raw;
      const items = raw?.items ?? raw?.products ?? raw?.data?.items;
      return Array.isArray(items) ? items : [];
    };

    const mergeRelated = (seen, merged, items) => {
      if (!Array.isArray(items)) return;
      for (const b of items) {
        const bid = String(b?._id ?? b?.id ?? "");
        if (!bid || seen.has(bid)) continue;
        seen.add(bid);
        merged.push(b);
        if (merged.length >= targetLimit) break;
      }
    };

    (async () => {
      try {
        const seen = new Set([currentId]);
        const merged = [];

        if (book.type) {
          try {
            const res = await getSimilarProducts(book.type);
            if (cancelled) return;
            mergeRelated(seen, merged, extractSimilar(res));
          } catch (e) {
            console.error("Error fetching related by type:", e);
          }
        }

        if (merged.length < targetLimit && book.author?.trim()) {
          try {
            const res = await getProducts({
              author: book.author.trim(),
              limit: 32,
              page: 1,
            });
            if (cancelled) return;
            mergeRelated(seen, merged, extractProductList(res));
          } catch (e) {
            console.error("Error fetching related by author:", e);
          }
        }

        if (merged.length < targetLimit) {
          try {
            const res = await getProducts({ limit: 32, page: 1 });
            if (cancelled) return;
            mergeRelated(seen, merged, extractProductList(res));
          } catch (e) {
            console.error("Error fetching related fallback list:", e);
          }
        }

        if (!cancelled) {
          setSimilarBooks(merged.slice(0, targetLimit));
        }
      } catch (error) {
        console.error("Error loading related books:", error);
        if (!cancelled) setSimilarBooks([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [book]);

  useEffect(() => {
    const loadEligibility = async () => {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams(location.search);
      const orderId = params.get("reviewOrder") || undefined;

      if (!token || !user?._id) {
        setReviewEligibility(null);
        setReviewEligibilityMsg("Chỉ khách đã mua và xác nhận nhận hàng mới có thể đánh giá.");
        return;
      }

      try {
        const payload = await getReviewEligibility({ productId: id, orderId });
        setReviewEligibility(payload || null);
        setReviewEligibilityMsg(
          payload?.eligible
            ? "Bạn đủ điều kiện đánh giá sản phẩm này."
            : payload?.message || "Bạn chưa đủ điều kiện đánh giá sản phẩm này."
        );
      } catch (error) {
        console.error("Error loading review eligibility:", error);
        const msg =
          error?.response?.data?.message ||
          "Không xác minh được quyền đánh giá. Vui lòng thử lại sau.";
        setReviewEligibility(null);
        setReviewEligibilityMsg(msg);
      }
    };

    loadEligibility();
  }, [id, location.search, user?._id]);

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    if (!reviewEligibility?.eligible) {
      alert(reviewEligibilityMsg || "Bạn chưa đủ điều kiện đánh giá.");
      return;
    }
    if (feedback.trim() === "" || stars < 1) {
      alert("Thêm bình luận để đánh giá.");
      return;
    }

    const token = localStorage.getItem("token");

    setReviewSubmitting(true);
    createProductReview(
      id,
      { content: feedback, stars, orderId: reviewEligibility?.orderId },
      token ? { headers: { Authorization: `Bearer ${token}` } } : {}
    )
      .then((data) => {
        const created = data?.data?.item || data?.data?.feedback || null;
        if (created) {
          setFeedbackList([
            {
              ...created,
              timestamp: created.timestamp || created.createdAt,
            },
            ...feedbackList,
          ]);
        }
        setFeedback("");
        setStars(0);
        setReviewEligibility((prev) =>
          prev
            ? {
                ...prev,
                eligible: false,
                message: "Đơn hàng đã hoàn tất sau khi đánh giá.",
              }
            : prev
        );
        setReviewEligibilityMsg("Đơn hàng đã hoàn tất sau khi đánh giá.");
      })
      .catch((error) => {
        console.error("Error submitting feedback:", error);
        const msg = error?.response?.data?.message || "Không thể gửi đánh giá.";
        alert(msg);
      })
      .finally(() => setReviewSubmitting(false));
  };

  const handleAddToCart = async () => {
    try {
      const jwt = localStorage.getItem("token");
      if (!jwt) {
        alert("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.");
        return;
      }
      const addQtyRaw = Number(quantity);
      const addQty =
        Number.isFinite(addQtyRaw) && addQtyRaw > 0 ? Math.floor(addQtyRaw) : 1;

      let serverQty = 0;
      try {
        const cartPayload = await getCart();
        const rawItems =
          cartPayload?.cart?.items || cartPayload?.items || [];
        const line = Array.isArray(rawItems)
          ? rawItems.find((it) => {
              const pid = it.productId ?? it.product?._id;
              return String(pid) === String(id);
            })
          : null;
        const q = Number(line?.quantity);
        serverQty = Number.isFinite(q) && q > 0 ? q : 0;
      } catch {
        const existingCart = Array.isArray(user?.cart) ? user.cart : [];
        const fallback = existingCart.find(
          (item) => String(item.product) === String(id)
        );
        const fq = Number(fallback?.quantity);
        serverQty = Number.isFinite(fq) && fq > 0 ? fq : 0;
      }

      const nextQty = serverQty + addQty;
      await upsertCartItem({ productId: id, quantity: nextQty });
      alert("Thêm vào giỏ hàng thành công.");
      setUser((prevUser) => {
        const cart = [...(prevUser?.cart || [])];
        const idx = cart.findIndex(
          (item) => String(item.product) === String(id)
        );
        const entry = { product: id, quantity: nextQty };
        if (idx >= 0) {
          cart[idx] = { ...cart[idx], ...entry };
        } else {
          cart.push(entry);
        }
        return { ...prevUser, cart };
      });
    } catch (error) {
      console.error(error);
      const msg = getCartStockErrorMessage(error);
      alert(msg);
    }
  };

  const handleBuyNow = async () => {
    const jwt = localStorage.getItem("token");
    if (!jwt) {
      alert("Vui lòng đăng nhập để mua sản phẩm.");
      return;
    }
    const order = {
      products: [{ id: id, quantity: quantity }],
    };
    console.log(order);
    await setUser((prevUsers) => ({
      ...prevUsers,
      order: order,
    }));
    navigate("/order");
  };

  const handleAddToFavorite = async () => {
    const jwt = localStorage.getItem("token");
    if (!jwt) {
      alert("Vui lòng đăng nhập để thêm sản phẩm vào yêu thích.");
      return;
    }
    const check = user.favorite.find((item) => item.product === id);
    if (check) {
      alert("Sản phẩm đã có trong danh sách yêu thích.");
      return;
    }
    const response = await toggleFavorite({ productId: id });
    alert("Thêm vào yêu thích thành công.");
    setUser((prevUser) => ({
      ...prevUser,
      favorite: [...prevUser.favorite, { product: id }],
    }));
    console.log(response.data);
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="book-detail-page book-detail-page--state">
          <div className="book-detail-page__state-card">
            <p className="book-detail-page__state-text">Đang tải dữ liệu...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!book) {
    return (
      <>
        <Header />
        <div className="book-detail-page book-detail-page--state">
          <div className="book-detail-page__state-card book-detail-page__state-card--empty">
            <p className="book-detail-page__state-title">Không tìm thấy sách.</p>
            <p className="book-detail-page__state-desc">Vui lòng quay lại trang chủ hoặc tìm sách khác.</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="book-detail-container book-detail-page">
        <div className="book-detail">
          <div className="book-detail-left book-detail__primary">
            <div className="book-hero">
              <h1 className="book-title">{book.title}</h1>
              <div className="book-main-content">
                <div className="book-hero__visual">
                  <div className="book-hero__frame" aria-hidden="true" />
                  <img src={book.imgSrc} alt={book.title} className="main-image" />
                </div>
                <div className="quantity-price-row">
                  <div className="quantity-block">
                    <span className="quantity-label">Số lượng</span>
                    <div className="quantity-control">
                      <button
                        type="button"
                        className="book-qty-btn"
                        onClick={() => setQuantity(quantity > 1 ? quantity - 1 : 1)}
                        aria-label="Giảm số lượng"
                      >
                        −
                      </button>
                      <span className="quantity">{quantity}</span>
                      <button
                        type="button"
                        className="book-qty-btn"
                        onClick={() => setQuantity(quantity + 1)}
                        aria-label="Tăng số lượng"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="book-price">
                    <span className="book-price__label">Giá bán</span>
                    <p className="book-price__value">
                      <span className="price">{book.price?.toLocaleString("vi-VN")}</span>
                      <span className="book-price__currency"> VND</span>
                    </p>
                  </div>
                </div>
              </div>
              <div className="action-buttons">
                <button type="button" className="book-action-btn book-action-btn--cart" onClick={handleAddToCart}>
                  Thêm vào giỏ hàng
                </button>
                <button type="button" className="book-action-btn book-action-btn--ghost" onClick={handleAddToFavorite}>
                  Yêu thích
                </button>
                <button type="button" className="book-action-btn book-action-btn--primary" onClick={handleBuyNow}>
                  Mua ngay
                </button>
              </div>
            </div>
          </div>

          <div className="book-detail-right book-detail__spec">
            <div className="book-spec-card">
              <h2 className="book-spec-card__title">Thông tin sản phẩm</h2>
              <table className="book-details-table book-spec-table">
                <tbody>
                  {[
                    { label: "Tác giả", value: book.author },
                    { label: "Người dịch", value: book.translator || "N/A" },
                    { label: "SKU", value: book.sku || "N/A" },
                    { label: "Nhà Xuất Bản", value: book.publisher || "N/A" },
                    { label: "Năm xuất bản", value: book.publicationYear || "N/A" },
                    { label: "Ngôn ngữ", value: book.language || "N/A" },
                    { label: "Trọng lượng", value: book.weight || "N/A" },
                    { label: "Kích thước", value: book.dimensions || "N/A" },
                    { label: "Số trang", value: book.pages || "N/A" },
                    { label: "Loại bìa", value: book.binding || "N/A" },
                  ].map((row, index) => (
                    <tr key={index}>
                      <th scope="row">{row.label}</th>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="book-desc-card">
              <h3 className="book-desc-card__title">Thông tin cuốn sách</h3>
              <p className="book-description">{book.description || "Không có thông tin mô tả."}</p>
            </div>
          </div>
        </div>

        <section className="similar-books-section book-related" aria-label="Sách liên quan">
          <div className="book-related__head">
            <h3 className="book-related__title">Sách liên quan</h3>
            <p className="book-related__sub">Ưu tiên cùng thể loại, cùng tác giả, sau đó là sách đang có tại cửa hàng</p>
          </div>
          <div className="similar-books-container book-related__track">
            {similarBooks.length > 0 ? (
              similarBooks.map((similarBook) => {
                const relatedId = similarBook._id ?? similarBook.id;
                if (relatedId == null) return null;
                const rid = String(relatedId);
                return (
                  <Link
                    key={rid}
                    to={`/book/${rid}`}
                    className="similar-book-card"
                  >
                    <div className="similar-book-card__cover">
                      <img src={similarBook.imgSrc} alt="" />
                    </div>
                    <p className="similar-book-card__title">{similarBook.title}</p>
                  </Link>
                );
              })
            ) : (
              <div className="book-related__empty" role="status">
                <p className="book-related__empty-title">Chưa có sách gợi ý</p>
                <p className="book-related__empty-text">
                  Hiện không còn đầu sách khác để gợi ý ngoài sản phẩm bạn đang xem.
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="feedback-section book-reviews book-reviews--premium" aria-label="Đánh giá">
          <div className="book-reviews__accent" aria-hidden="true" />
          <header className="book-reviews__head">
            <div className="book-reviews__head-text">
              <h3 className="book-reviews__title">Đánh giá của độc giả</h3>
              <p className="book-reviews__sub">
                Chia sẻ trải nghiệm để cộng đồng chọn sách tốt hơn — mọi đánh giá đều được hiển thị công khai.
              </p>
            </div>
            <div className="book-reviews__stat" aria-live="polite">
              <span className="book-reviews__stat-num">{feedbackList.length}</span>
              <span className="book-reviews__stat-label">nhận xét</span>
            </div>
          </header>

          <div className="book-reviews__content">
            {feedbackList.length === 0 ? (
              <div className="book-reviews__empty">
                <div className="book-reviews__empty-visual" aria-hidden="true">
                  <span className="book-reviews__empty-icon">★</span>
                </div>
                <p className="book-reviews__empty-title">Chưa có đánh giá nào</p>
                <p className="book-reviews__empty-text">
                  Hãy là người đầu tiên chia sẻ cảm nhận về cuốn sách — điều này giúp độc giả khác đọc thông minh hơn.
                </p>
              </div>
            ) : (
              <ul className="feedback-list">
                {feedbackList.map((fb, index) => (
                  <li key={index} className="feedback-item">
                    <div className="feedback-item__accent" aria-hidden="true" />
                    <div className="feedback-item__head">
                      <div className="feedback-item__badge" aria-hidden="true">
                        <span className="feedback-item__badge-icon">★</span>
                      </div>
                      <div className="feedback-item__head-main">
                        <p className="feedback-stars" aria-label={`${fb.stars} trên 5 sao`}>
                          {Array.from({ length: fb.stars }, (_, i) => (
                            <span key={i} className="star filled">
                              ★
                            </span>
                          ))}
                          {Array.from({ length: 5 - fb.stars }, (_, i) => (
                            <span key={i} className="star">
                              ★
                            </span>
                          ))}
                        </p>
                        <time className="feedback-time" dateTime={fb.timestamp ? String(fb.timestamp) : undefined}>
                          {fb.timestamp ? new Date(fb.timestamp).toLocaleString("vi-VN") : ""}
                        </time>
                      </div>
                    </div>
                    <p className="feedback-item__content">{fb.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="book-reviews__form-shell">
            {reviewEligibility?.eligible ? (
              <form className="feedback-form book-reviews__form" onSubmit={handleFeedbackSubmit}>
                <div className="book-reviews__form-intro">
                  <h4 className="book-reviews__form-title">Viết đánh giá của bạn</h4>
                  <p className="book-reviews__form-lead">
                    Bạn có thể đánh giá trong 14 ngày sau khi xác nhận đã nhận hàng.
                  </p>
                </div>

                <div className="book-reviews__rating-panel">
                  <span className="book-reviews__rating-label" id="rating-label">
                    Mức đánh giá
                  </span>
                  <div className="rating-input" role="group" aria-labelledby="rating-label">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`book-review-star ${stars >= star ? "book-review-star--active" : ""}`}
                        onClick={() => setStars(star)}
                        aria-label={`${star} sao`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <p className="book-reviews__rating-hint">
                    {stars > 0 ? `Đã chọn: ${stars} / 5 sao` : "Chọn từ 1 đến 5 sao theo mức độ hài lòng."}
                  </p>
                </div>

                <div className="book-reviews__field">
                  <label className="book-reviews__field-label" htmlFor="book-review-body">
                    Nội dung nhận xét
                  </label>
                  <textarea
                    id="book-review-body"
                    className="book-reviews__textarea"
                    placeholder="Chia sẻ cảm nhận về nội dung, chất lượng in, trải nghiệm đọc..."
                    rows={4}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </div>

                <div className="book-reviews__submit-row">
                  <button type="submit" className="book-feedback-submit" disabled={reviewSubmitting}>
                    {reviewSubmitting ? "Đang gửi..." : "Gửi"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="book-reviews__eligibility-note">
                {reviewEligibilityMsg || "Chỉ khách đã mua và xác nhận nhận hàng mới có thể đánh giá."}
              </div>
            )}
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default BookDetail;
