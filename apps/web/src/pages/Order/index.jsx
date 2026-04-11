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
        <h2>Dang tai...</h2>
        <Footer />
      </>
    );
  }

  if (!lineItems.length) {
    return (
      <>
        <Header />
        <h2>Khong co don hang nao</h2>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="order-body">
        <div className="order-layout">
          <div className="order-details">
            {lineItems.map((item, index) => (
              <div key={item.id} className="order-item">
                <img src={item.image} alt={item.title} className="order-item-image" />
                <div>
                  <h3>{formatTitle(item.title)}</h3>
                  <p>Gia: {formatMoney(item.price)} VND</p>
                  <p>
                    <button onClick={() => handleDecreaseQuantity(index)}>-</button>
                    {item.quantity}
                    <button onClick={() => handleIncreaseQuantity(index)}>+</button>
                  </p>
                  <p>Giam gia: {item.discountPercent}%</p>
                  <button onClick={() => handleDelete(index)}>Xoa</button>
                </div>
              </div>
            ))}
          </div>
          <div className="user-info">
            <h2>Thong tin nguoi dung</h2>
            <p>Ten:</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="user-info-input"
              required
            />
            <p>Email:</p>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="user-info-input"
              required
            />
            <p>So dien thoai:</p>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="user-info-input"
              required
            />
            <p>Dia chi:</p>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="user-info-input"
              required
            />
            <p>Voucher:</p>
            <input
              type="text"
              value={voucher}
              className="user-info-input"
              onChange={(e) => {
                setVoucher(e.target.value);
                setVoucherDiscount(0);
              }}
            />
            <button onClick={handleVoucher}>Ap dung</button>
            <div className="payment-method">
              <h3>Phuong thuc thanh toan</h3>
              <label>
                <input
                  type="radio"
                  id="cod"
                  name="payment"
                  value="cod"
                  checked={selectedPayment === "cod"}
                  onChange={(e) => setSelectedPayment(e.target.value)}
                />
                Thanh toan khi nhan hang
              </label>
              <label style={{ marginLeft: "12px" }}>
                <input
                  type="radio"
                  id="online"
                  name="payment"
                  value="online"
                  checked={selectedPayment === "online"}
                  onChange={(e) => setSelectedPayment(e.target.value)}
                />
                Thanh toan online (mock)
              </label>
            </div>
          </div>
        </div>
        <div className="order-summary">
          <div>
            <h2>Tom tat don hang</h2>
            <p>Tong so san pham: {lineItems.length}</p>
            <p>Tong gia tri: {formatMoney(total)} VND</p>
            {voucherDiscount > 0 ? (
              <p>Giam gia tu Voucher: {formatMoney(voucherDiscount)} VND</p>
            ) : null}
          </div>
          <button onClick={handleBuy}>Dat hang</button>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Order;

