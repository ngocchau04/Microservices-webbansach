import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import "./BookDetail.css";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useUser } from "../../context/UserContext";
import {
  createProductReview,
  getProductById,
  getProductReviews,
  getSimilarProducts,
} from "../../api/catalogApi";
import { upsertCartItem } from "../../api/checkoutApi";
import { toggleFavorite } from "../../api/authApi";

const BookDetail = () => {
  const {user, setUser} = useUser();
  const { id } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [stars, setStars] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [similarBooks, setSimilarBooks] = useState([]);
  const navigate = useNavigate();

  // Fetch book details
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

  // Fetch similar books
  useEffect(() => {
    if (book && book.type) {
      getSimilarProducts(book.type)
        .then((response) => {
          const data = response?.data || [];
          console.log("Fetched similar books:", data); // Debugging log
          setSimilarBooks(Array.isArray(data) ? data : []);
        })
        .catch((error) => console.error("Error fetching similar books:", error));
    }
  }, [book]);

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    if (feedback.trim() === "" || stars < 1) {
      alert("Thêm bình luận để đánh giá.");
      return;
    }

    const token = localStorage.getItem("token");

    createProductReview(
      id,
      { content: feedback, stars },
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
      })
      .catch((error) => console.error("Error submitting feedback:", error));
  };

  const handleAddToCart = async () => {
    try {
      const jwt = localStorage.getItem("token");
      if (!jwt) {
        alert("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.");
        return;
      }
      const check = user.cart.find((item) => item.product === id);
      if (check) {
        alert("Sản phẩm đã có trong giỏ hàng.");
        return;
      }
      const response = await upsertCartItem({ productId: id, quantity: 1 });
      alert("Thêm vào giỏ hàng thành công.");
      setUser((prevUser) => ({
        ...prevUser,
        cart: [...prevUser.cart, { product: id }],
      }));
      console.log(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleBuyNow = async () => {
    const jwt = localStorage.getItem("token");
    if (!jwt) {
      alert("Vui lòng đăng nhập để mua sản phẩm.");
      return;
    }
    const order = {
        products: [
            { id: id, quantity: quantity }
        ]
    };
    console.log(order);
    await setUser((prevUsers) => ({
      ...prevUsers,
      order: order
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
        <p>Đang tải dữ liệu...</p>
        <Footer />
      </>
    )
  }

  if (!book) {
    return (
      <>
        <Header />
        <p>Không tìm thấy sách.</p>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <div className="book-detail-container">
        {/* Book Details Section */}
        <div className="book-detail">
          <div className="book-detail-left">
            <h1 className="book-title">{book.title}</h1>
            <div className="book-main-content">
              <img src={book.imgSrc} alt={book.title} className="main-image" />

              {/* Quantity and Price Row */}
              <div className="quantity-price-row">
                <div className="quantity-label">
                  <p>Số lượng:</p>
                </div>
                <div className="quantity-control">
                  <button
                    className="decrement"
                    onClick={() => setQuantity(quantity > 1 ? quantity - 1 : 1)}
                  >
                    -
                  </button>
                  <span className="quantity">{quantity}</span>
                  <button
                    className="increment"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <div className="book-price">
                  <p>
                    Giá: <span className="price">{book.price?.toLocaleString()} VND</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button className="add-to-cart" onClick={handleAddToCart}>
                Thêm vào giỏ hàng
              </button>
              <button className="buy-now" onClick={handleAddToFavorite}>
                Yêu thích
              </button>
              <button className="buy-now" onClick={handleBuyNow}>
                Mua ngay
              </button>
            </div>
          </div>

          {/* Book Information Table */}
          <div className="book-detail-right">
            <table className="book-details-table">
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
                    <td>{row.label}</td>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h3>Thông tin cuốn sách</h3>
            <p className="book-description">{book.description || "Không có thông tin mô tả."}</p>
          </div>
        </div>

        {/* Similar Books Section */}
        <div className="similar-books-section">
          <h3>Sách liên quan</h3>
          <div className="similar-books-container">
            {similarBooks.length > 0 ? (
              similarBooks.map((similarBook) => (
                <div
                  key={similarBook._id}
                  className="similar-book-card"
                  onClick={() => navigate(`/book/${similarBook._id}`)}
                  style={{ cursor: "pointer" }}
                >
                  <img src={similarBook.imgSrc} alt={similarBook.title} />
                  <p>{similarBook.title}</p>
                </div>
              ))
            ) : (
              <p>Không có sách liên quan.</p>
            )}
          </div>
        </div>


        {/* Feedback Section */}
        <div className="feedback-section">
          <h3>Đánh giá của độc giả</h3>
          <ul className="feedback-list">
            {feedbackList.map((feedback, index) => (
              <li key={index} className="feedback-item">
                <p className="feedback-stars">
                  {Array.from({ length: feedback.stars }, (_, i) => (
                    <span key={i} className="star filled">
                      ★
                    </span>
                  ))}
                  {Array.from({ length: 5 - feedback.stars }, (_, i) => (
                    <span key={i} className="star">
                      ★
                    </span>
                  ))}
                </p>
                <p>{feedback.content}</p>
                <small className="feedback-time">
                  {new Date(feedback.timestamp).toLocaleString()}
                </small>
              </li>
            ))}
          </ul>

          <form className="feedback-form" onSubmit={handleFeedbackSubmit}>
            <h4>Hãy đánh giá để giúp những độc giả khác lựa chọn được cuốn sách phù hợp nhất!</h4>
            <div className="rating-input">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`star ${stars >= star ? "filled" : ""}`}
                  onClick={() => setStars(star)}
                  style={{ cursor: "pointer" }}
                >
                  ★
                </span>
              ))}
            </div>
            <textarea
              placeholder="Viết bình luận của bạn tại đây..."
              rows="4"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <button type="submit">Gửi</button>
          </form>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default BookDetail;
