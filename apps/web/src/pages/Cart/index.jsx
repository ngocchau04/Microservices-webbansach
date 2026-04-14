import React, { useState, useEffect, useMemo } from "react";
import "./Cart.css";
import { useUser } from "../../context/UserContext";
import { useNavigate } from "react-router-dom";
import {
  getCart,
  removeCartItemByProduct,
  upsertCartItem,
} from "../../api/checkoutApi";

const normalizeCartItems = (payload) => {
  const rawItems =
    payload?.cart?.items || payload?.items || payload?.cart || [];

  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems
    .map((item) => {
      if (item?.product?._id) {
        return {
          _id: item._id || item.product._id,
          productId: item.product._id,
          title: item.product.title,
          price: Number(item.product.price) || 0,
          image: item.product.imgSrc || "",
          quantity: Number(item.quantity) || 1,
        };
      }

      if (item?.productId) {
        return {
          _id: item._id || item.productId,
          productId: String(item.productId),
          title: item.title,
          price: Number(item.price) || 0,
          image: item.image || "",
          quantity: Number(item.quantity) || 1,
        };
      }

      return null;
    })
    .filter(Boolean);
};

function Cart() {
  const navigate = useNavigate();
  const { setUser } = useUser();

  const [cartItems, setCartItems] = useState([]);
  const [checkeds, setCheckeds] = useState([]);
  const [total, setTotal] = useState(0);
  const [count, setCount] = useState(0);
  const [discount, setDiscount] = useState(0);

  const syncUserCart = (items) => {
    setUser((prev) => ({
      ...prev,
      cart: items.map((item) => ({
        product: item.productId,
        quantity: item.quantity,
      })),
    }));
  };

  const refreshCart = async () => {
    try {
      const data = await getCart();
      const normalized = normalizeCartItems(data);
      setCartItems(normalized);
      syncUserCart(normalized);
    } catch (error) {
      console.error("Loi khi lay gio hang:", error);
      setCartItems([]);
    }
  };

  useEffect(() => {
    refreshCart();
  }, []);

  const checkedItemMap = useMemo(() => {
    return new Set(checkeds);
  }, [checkeds]);

  const handleCheck = (e) => {
    const { name, checked } = e.target;
    const item = cartItems.find((it) => it.productId === name);
    if (!item) return;

    const itemTotal = item.price * item.quantity;

    if (checked) {
      setCheckeds((prev) => [...prev, name]);
      setTotal((prev) => prev + itemTotal);
      setCount((prev) => prev + 1);
    } else {
      setCheckeds((prev) => prev.filter((id) => id !== name));
      setTotal((prev) => prev - itemTotal);
      setCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleDelete = async (productId) => {
    try {
      if (!window.confirm("Ban co chac chan muon xoa san pham nay khoi gio hang?")) {
        return;
      }

      await removeCartItemByProduct(productId);

      const nextItems = cartItems.filter((item) => item.productId !== productId);
      setCartItems(nextItems);
      setCheckeds((prev) => prev.filter((id) => id !== productId));
      syncUserCart(nextItems);
    } catch (error) {
      console.error("Loi khi xoa san pham:", error);
    }
  };

  const handleDecreaseQuantity = async (productId) => {
    const item = cartItems.find((it) => it.productId === productId);
    if (!item || item.quantity <= 1) return;

    try {
      const quantity = item.quantity - 1;
      await upsertCartItem({ productId, quantity });

      const nextItems = cartItems.map((it) =>
        it.productId === productId ? { ...it, quantity } : it
      );
      setCartItems(nextItems);
      syncUserCart(nextItems);
      await refreshCart();
    } catch (error) {
      console.error("Loi khi giam so luong san pham:", error);
    }
  };

  const handleIncreaseQuantity = async (productId) => {
    const item = cartItems.find((it) => it.productId === productId);
    if (!item) return;

    try {
      const quantity = item.quantity + 1;
      await upsertCartItem({ productId, quantity });

      const nextItems = cartItems.map((it) =>
        it.productId === productId ? { ...it, quantity } : it
      );
      setCartItems(nextItems);
      syncUserCart(nextItems);
      await refreshCart();
    } catch (error) {
      console.error("Loi khi tang so luong san pham:", error);
    }
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);

  const handleCheckout = () => {
    const selected = cartItems.filter((item) => checkedItemMap.has(item.productId));

    if (!selected.length) {
      return;
    }

    const order = {
      products: selected.map((item) => ({
        id: item.productId,
        quantity: item.quantity,
      })),
    };

    setUser((prev) => ({
      ...prev,
      order,
    }));

    navigate("/order");
  };

  const handleCheckAll = () => {
    const ids = cartItems.map((item) => item.productId);
    const totalPrice = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    setCheckeds(ids);
    setTotal(totalPrice);
    setDiscount(0);
    setCount(cartItems.length);
  };

  const handleUncheckAll = () => {
    setCheckeds([]);
    setTotal(0);
    setDiscount(0);
    setCount(0);
  };

  const hasItems = cartItems.length > 0;

  return (
    <div className="cart-page">
      <div className="cart-page__inner">
        <header className="cart-page__header">
          <h2 className="cart-page__title">Gio hang cua ban</h2>
          <p className="cart-page__subtitle">Kiem tra san pham va dat hang khi san sang</p>
        </header>

        <div className={`cart-page__grid${!hasItems ? " cart-page__grid--empty" : ""}`}>
          <div className="cart-page__main">
            <div className="cart-page__main-panel">
              <div className="cart-items">
                {!hasItems ? (
                  <div className="cart-page__empty">
                    <p className="cart-page__empty-title">Gio hang dang trong</p>
                    <p className="cart-page__empty-text">Hay them sach vao gio hang de tiep tuc mua sam.</p>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div key={item._id} className="cart-item">
                      <label className="cart-item__check">
                        <input
                          type="checkbox"
                          name={item.productId}
                          checked={checkeds.includes(item.productId)}
                          onChange={handleCheck}
                        />
                      </label>
                      <img src={item.image} alt={item.title || "San pham"} className="cart-item-image" />
                      <div className="cart-item-info">
                        <h3 className="cart-item-title">{item.title}</h3>
                        <p className="cart-item-price-line">Don gia: {formatPrice(item.price)}</p>
                        <p className="cart-item-qty-label">So luong: {item.quantity}</p>
                        <p className="cart-item-line-total">Thanh tien: {formatPrice(item.price * item.quantity)}</p>
                      </div>
                      <div className="cart-item-actions">
                        <div className="cart-item-stepper">
                          <button type="button" className="cart-item-stepper__btn" onClick={() => handleDecreaseQuantity(item.productId)} aria-label="Giam">
                            −
                          </button>
                          <button type="button" className="cart-item-stepper__btn" onClick={() => handleIncreaseQuantity(item.productId)} aria-label="Tang">
                            +
                          </button>
                        </div>
                        <button type="button" className="cart-item-remove" onClick={() => handleDelete(item.productId)}>
                          Xoa
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {hasItems && (
                <div className="cart-toolbar">
                  <span className="cart-toolbar__label">Chon nhanh</span>
                  <div className="cart-toolbar__actions">
                    <button type="button" className="cart-toolbar__btn cart-toolbar__btn--primary" onClick={handleCheckAll}>
                      Chon tat ca
                    </button>
                    <button type="button" className="cart-toolbar__btn cart-toolbar__btn--ghost" onClick={handleUncheckAll}>
                      Bo chon tat ca
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="cart-summary cart-summary--sticky">
            <div className="cart-summary__accent" aria-hidden="true" />
            <h3 className="cart-summary__heading">Tom tat don hang</h3>
            <p className="cart-summary__hint">Ap dung cho san pham da tick chon</p>
            <div className="cart-summary__rows">
              <div className="cart-summary__row">
                <span className="cart-summary__label">So luong san pham da chon</span>
                <span className="cart-summary__value">{count}</span>
              </div>
              <div className="cart-summary__row">
                <span className="cart-summary__label">Giam gia</span>
                <span className="cart-summary__value cart-summary__value--muted">{formatPrice(discount)}</span>
              </div>
              <div className="cart-summary__row cart-summary__row--total">
                <span className="cart-summary__label">Tong tien</span>
                <span className="cart-summary__total">{formatPrice(total)}</span>
              </div>
            </div>
            <button type="button" className="checkout-button" onClick={handleCheckout} disabled={!count}>
              Dat hang
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Cart;
