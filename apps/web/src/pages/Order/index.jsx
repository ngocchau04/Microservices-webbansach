import React, { useState, useEffect, useMemo } from "react";
import Footer from "../../components/Footer";
import Header from "../../components/Header";
import "./styles.css";
import { useUser } from "../../context/UserContext";
import { useNavigate } from "react-router-dom";
import {
  createOrder,
  createPayment,
  removeCartItems,
  validateVoucher,
} from "../../api/checkoutApi";
import { getProductListByIds } from "../../api/catalogApi";

const Order = () => {
  const navigate = useNavigate();
  const { user, setUser } = useUser();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState("cod");
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || user?.sdt || "");
  const [address, setAddress] = useState(user?.address || "");
  const [voucher, setVoucher] = useState("");
  const [voucherDiscount, setVoucherDiscount] = useState(0);

  const orderedProducts = user?.order?.products || [];

  useEffect(() => {
    const fetchBooks = async () => {
      if (!orderedProducts.length) {
        setBooks([]);
        setLoading(false);
        return;
      }

      try {
        const ids = orderedProducts.map((item) => item.id);
        const res = await getProductListByIds({ ids });
        const items = Array.isArray(res?.data) ? res.data : [];
        setBooks(items);
      } catch (error) {
        console.error("Loi khi lay danh sach sach:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [user?.order?.products]);

  const productMap = useMemo(() => {
    const map = new Map();
    books.forEach((book) => {
      map.set(String(book._id), book);
    });
    return map;
  }, [books]);

  const lineItems = useMemo(() => {
    return orderedProducts
      .map((item) => {
        const book = productMap.get(String(item.id));
        if (!book) return null;

        return {
          id: String(item.id),
          quantity: Number(item.quantity) || 1,
          title: book.title,
          image: book.imgSrc,
          price: Number(book.price) || 0,
          discountPercent: Number(book.discount) || 0,
        };
      })
      .filter(Boolean);
  }, [orderedProducts, productMap]);

  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [lineItems]
  );

  const total = Math.max(subtotal - voucherDiscount, 0);

  const formatMoney = (money) =>
    new Intl.NumberFormat("vi-VN").format(Number(money) || 0);

  const formatTitle = (title = "") => {
    if (title.length > 30) {
      return `${title.slice(0, 30)}...`;
    }
    return title;
  };

  const updateOrderProducts = (next) => {
    setUser((prev) => ({
      ...prev,
      order: {
        ...(prev?.order || {}),
        products: next,
      },
    }));
  };

  const handleIncreaseQuantity = (index) => {
    const next = [...orderedProducts];
    next[index].quantity += 1;
    updateOrderProducts(next);
    setVoucherDiscount(0);
  };

  const handleDecreaseQuantity = (index) => {
    const next = [...orderedProducts];
    if (next[index].quantity > 1) {
      next[index].quantity -= 1;
      updateOrderProducts(next);
      setVoucherDiscount(0);
    }
  };

  const handleDelete = (index) => {
    const next = [...orderedProducts];
    next.splice(index, 1);
    updateOrderProducts(next);
    setVoucherDiscount(0);
  };

  const handleVoucher = async () => {
    if (!voucher.trim()) {
      alert("Vui long nhap voucher");
      return;
    }

    try {
      const res = await validateVoucher({
        code: voucher.trim(),
        subtotal,
      });

      const discountValue = Number(res?.discount || res?.voucher?.discountAmount || 0);
      setVoucherDiscount(discountValue);
      alert("Su dung voucher thanh cong!");
    } catch (error) {
      console.error("Loi khi su dung voucher:", error);
      setVoucherDiscount(0);
      alert("Su dung voucher that bai!");
    }
  };

  const handleBuy = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Vui long dang nhap de dat hang!");
      return;
    }

    if (!lineItems.length) {
      alert("Vui long them san pham vao gio hang!");
      return;
    }

    if (!name.trim() || !email.trim() || !phone.trim() || !address.trim()) {
      alert("Vui long dien day du thong tin giao hang!");
      return;
    }

    try {
      const orderPayload = {
        userId: user?._id,
        name,
        phone,
        email,
        address,
        paymentMethod: selectedPayment,
        products: lineItems.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
        voucherCode: voucher.trim() || null,
      };

      const orderRes = await createOrder(orderPayload);
      const createdOrder =
        orderRes?.order || orderRes?.item || (orderRes?._id ? orderRes : null);
      const orderId = createdOrder?._id;

      if (!orderId) {
        throw new Error("Order id not returned");
      }

      const ids = lineItems.map((item) => item.id);
      if (ids.length) {
        await removeCartItems(ids);
      }

      setUser((prev) => ({
        ...prev,
        cart: (prev?.cart || []).filter((item) => !ids.includes(item.product)),
        order: { products: [] },
      }));

      if (selectedPayment === "online") {
        const paymentRes = await createPayment({ orderId, method: "online" });
        navigate("/payment", {
          state: {
            total,
            orderId,
            paymentId:
              paymentRes?.payment?._id ||
              paymentRes?.item?._id ||
              paymentRes?.transactionId,
          },
        });
      } else {
        await createPayment({ orderId, method: "cod" });
        alert("Dat hang thanh cong!");
        navigate("/profile");
      }
    } catch (error) {
      console.error("Loi khi dat hang:", error);
      alert("Dat hang that bai!");
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="order-page order-page--state">
          <div className="order-page__state-card">
            <p className="order-page__state-text">Dang tai...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!lineItems.length) {
    return (
      <>
        <Header />
        <div className="order-page order-page--state">
          <div className="order-page__state-card order-page__state-card--empty">
            <h2 className="order-page__state-title">Khong co don hang nao</h2>
            <p className="order-page__state-desc">Hay chon san pham tu gio hang de tiep tuc.</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="order-body order-page">
        <div className="order-page__inner">
          <div className="order-layout">
            <section className="order-details" aria-label="San pham trong don">
              <header className="order-details__head">
                <span className="order-details__badge">San pham da chon</span>
                <span className="order-details__count">{lineItems.length} mat hang</span>
              </header>
              {lineItems.map((item, index) => (
                <article key={item.id} className="order-item">
                  <div className="order-item__media">
                    <div className="order-item__thumb">
                      <img src={item.image} alt={item.title || "San pham"} className="order-item-image" />
                    </div>
                  </div>
                  <div className="order-item__body">
                    <div className="order-item__header-block">
                      <h3 className="order-item__title">{formatTitle(item.title)}</h3>
                      <div className="order-item__meta">
                        <div className="order-item__price-row">
                          <span className="order-item__price-label">Don gia</span>
                          <span className="order-item__price">
                            <strong className="order-item__price-num">
                              {formatMoney(item.price)}
                              <span className="order-item__currency"> VND</span>
                            </strong>
                          </span>
                        </div>
                        <span className="order-item__discount-note">Giam gia: {item.discountPercent}%</span>
                      </div>
                    </div>
                    <div className="order-item__subtotal" aria-label="Thanh tien dong">
                      <span className="order-item__subtotal-label">Thanh tien</span>
                      <span className="order-item__subtotal-value">
                        {formatMoney(item.price * item.quantity)} <span className="order-item__currency">VND</span>
                      </span>
                    </div>
                    <div className="order-item__actions">
                      <div className="order-item__stepper" role="group" aria-label="So luong">
                        <button
                          type="button"
                          className="order-item__qty-btn"
                          onClick={() => handleDecreaseQuantity(index)}
                          aria-label="Giam so luong"
                        >
                          −
                        </button>
                        <span className="order-item__qty" aria-live="polite">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="order-item__qty-btn"
                          onClick={() => handleIncreaseQuantity(index)}
                          aria-label="Tang so luong"
                        >
                          +
                        </button>
                      </div>
                      <button type="button" className="order-item__remove" onClick={() => handleDelete(index)}>
                        <span className="order-item__remove-icon" aria-hidden="true">
                          ×
                        </span>
                        <span className="order-item__remove-label">Xoa</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <aside className="user-info user-panel" aria-label="Thong tin giao hang">
              <h2 className="user-panel__title">Thong tin nguoi dung</h2>
              <p className="user-panel__lead">Dien thong tin nhan hang chinh xac de giao hang nhanh hon.</p>

              <div className="user-panel__field">
                <label className="user-panel__label" htmlFor="order-name">
                  Ten
                </label>
                <input
                  id="order-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="user-info-input user-panel__input"
                  required
                  autoComplete="name"
                />
              </div>
              <div className="user-panel__field">
                <label className="user-panel__label" htmlFor="order-email">
                  Email
                </label>
                <input
                  id="order-email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="user-info-input user-panel__input"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="user-panel__field">
                <label className="user-panel__label" htmlFor="order-phone">
                  So dien thoai
                </label>
                <input
                  id="order-phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="user-info-input user-panel__input"
                  required
                  autoComplete="tel"
                />
              </div>
              <div className="user-panel__field">
                <label className="user-panel__label" htmlFor="order-address">
                  Dia chi
                </label>
                <input
                  id="order-address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="user-info-input user-panel__input"
                  required
                  autoComplete="street-address"
                />
              </div>

              <div className="user-panel__voucher">
                <label className="user-panel__label" htmlFor="order-voucher">
                  Voucher
                </label>
                <div className="user-panel__voucher-row">
                  <input
                    id="order-voucher"
                    type="text"
                    value={voucher}
                    className="user-info-input user-panel__input user-panel__input--voucher"
                    onChange={(e) => {
                      setVoucher(e.target.value);
                      setVoucherDiscount(0);
                    }}
                    placeholder="Nhap ma giam gia"
                  />
                  <button type="button" className="user-panel__voucher-btn" onClick={handleVoucher}>
                    Ap dung
                  </button>
                </div>
              </div>

              <div className="payment-method">
                <h3 className="payment-method__title">Phuong thuc thanh toan</h3>
                <div className="payment-method__options">
                  <label className="payment-method__option">
                    <input
                      type="radio"
                      id="cod"
                      name="payment"
                      value="cod"
                      checked={selectedPayment === "cod"}
                      onChange={(e) => setSelectedPayment(e.target.value)}
                    />
                    <span className="payment-method__text">Thanh toan khi nhan hang (COD)</span>
                  </label>
                  <label className="payment-method__option">
                    <input
                      type="radio"
                      id="online"
                      name="payment"
                      value="online"
                      checked={selectedPayment === "online"}
                      onChange={(e) => setSelectedPayment(e.target.value)}
                    />
                    <span className="payment-method__text">Thanh toan online (mock)</span>
                  </label>
                </div>
              </div>
            </aside>
          </div>

          <section className="order-summary" aria-label="Tom tat don hang">
            <div className="order-summary__accent" aria-hidden="true" />
            <div className="order-summary__inner">
              <div className="order-summary__copy">
                <div className="order-summary__head">
                  <h2 className="order-summary__heading">Tom tat don hang</h2>
                  <p className="order-summary__sub">Kiem tra gia truoc khi xac nhan</p>
                </div>
                <div className="order-summary__rows">
                  <div className="order-summary__row">
                    <span className="order-summary__label">Tong so san pham</span>
                    <span className="order-summary__value">{lineItems.length}</span>
                  </div>
                  <div className="order-summary__row">
                    <span className="order-summary__label">Tam tinh</span>
                    <span className="order-summary__value">{formatMoney(subtotal)} VND</span>
                  </div>
                  {voucherDiscount > 0 ? (
                    <div className="order-summary__row order-summary__row--discount">
                      <span className="order-summary__label">Giam gia tu voucher</span>
                      <span className="order-summary__value order-summary__value--discount">
                        −{formatMoney(voucherDiscount)} VND
                      </span>
                    </div>
                  ) : null}
                  <div className="order-summary__row order-summary__row--total">
                    <span className="order-summary__label">Tong gia tri</span>
                    <span className="order-summary__total">{formatMoney(total)} VND</span>
                  </div>
                </div>
              </div>
              <div className="order-summary__cta-wrap">
                <p className="order-summary__cta-note">Xac nhan thong tin va hoan tat don</p>
                <button type="button" className="order-summary__cta" onClick={handleBuy}>
                  Dat hang
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Order;
