import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";
import { useUser } from "../../context/UserContext";
import { MdDriveFileRenameOutline } from "react-icons/md";
import { FaEye } from "react-icons/fa";
import { getMyOrders } from "../../api/checkoutApi";
import { getProductListByIds } from "../../api/catalogApi";
import { getFavorites, removeFavorite, updateProfileField } from "../../api/authApi";
import OrderDetailModal from "../../components/OrderDetailModal/OrderDetailModal";
import OrderStatusBadge from "../../components/OrderStatusBadge/OrderStatusBadge";

const formatMoney = (n) => new Intl.NumberFormat("vi-VN").format(Number(n) || 0);

function formatOrderPaymentMethod(m) {
  const v = String(m || "").toLowerCase();
  if (v === "cod") return "COD";
  if (v === "online") return "Online";
  return m || "—";
}

function Profile() {
  const { user, setUser } = useUser();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [ht, setHt] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [error, setError] = useState("");
  const [orders, setOrders] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const isAdmin = String(user?.role || "").toLowerCase() === "admin";
  const roleLabel = isAdmin ? "Quản trị viên" : "Khách hàng";
  const accountStatus = user?.status || (user?.isActive === false ? "Tạm khóa" : "Hoạt động");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.sdt || "");
    } else {
      setName("");
      setPhone("");
    }
  }, [user]);

  const refreshOrders = useCallback(async () => {
    if (!user || !user._id || isAdmin) {
      setOrders([]);
      return;
    }
    try {
      const data = await getMyOrders();
      const items = data?.items ?? [];
      setOrders(Array.isArray(items) ? items : []);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  const fetchFavorites = useCallback(async () => {
    if (isAdmin) {
      setFavorites([]);
      return;
    }
    try {
      const jwt = localStorage.getItem("token");
      if (!jwt) return;

      const res = await getFavorites({
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (res.status === 200) {
        const serverFavorites = res.data.favorite || res.data?.data?.items || [];
        const favoriteIds = Array.from(
          new Set(
            serverFavorites
              .map((item) => {
                if (!item) return null;
                if (typeof item.product === "string") return item.product;
                if (item.product && typeof item.product._id === "string") return item.product._id;
                if (typeof item.favProId === "string") return item.favProId;
                return null;
              })
              .filter(Boolean)
          )
        );

        if (!favoriteIds.length) {
          setFavorites([]);
          return;
        }

        const productRes = await getProductListByIds({ ids: favoriteIds });
        const products = productRes?.data?.items || (Array.isArray(productRes?.data) ? productRes.data : []);
        const productById = new Map(products.map((product) => [String(product._id), product]));
        const normalized = favoriteIds
          .map((id) => productById.get(String(id)))
          .filter(Boolean)
          .map((product) => ({ product }));
        setFavorites(normalized);
      }
    } catch (err) {
      console.error("Error fetching favorites:", err);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleUpdate = async (field, value) => {
    if (
      !window.confirm(
        `Bạn chắc chắn muốn đổi ${
          field === "name" ? "tên" : field === "phone" ? "số điện thoại" : "mật khẩu"
        } chứ ?`
      )
    ) {
      return;
    }

    if (!user) return;

    try {
      const res = await updateProfileField(field, {
        email: user.email,
        [field]: value,
      });

      if (res.data.status === "success") {
        setUser(res.data.user);
        setIsEditingName(false);
        setIsEditingPhone(false);
        setIsEditingPassword(false);
        setError("");
      } else {
        setError(res.data.message);
      }
    } catch (err) {
      console.error(`Error updating ${field}:`, err);
      setError(`Error updating ${field}`);
    }
  };

  const handleRemoveFavorite = async (productId) => {
    try {
      const jwt = localStorage.getItem("token");
      if (!jwt) {
        alert("Vui lòng đăng nhập để xóa sản phẩm khỏi danh sách yêu thích.");
        return;
      }

      if (!window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này khỏi danh sách yêu thích?")) {
        return;
      }

      const res = await removeFavorite(
        { productId },
        {
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
        }
      );

      if (res.status === 200) {
        const serverFavorites = res.data.favorite || res.data?.data?.items || [];
        const favoriteIds = Array.from(
          new Set(
            serverFavorites
              .map((item) => {
                if (!item) return null;
                if (typeof item.product === "string") return item.product;
                if (item.product && typeof item.product._id === "string") return item.product._id;
                if (typeof item.favProId === "string") return item.favProId;
                return null;
              })
              .filter(Boolean)
          )
        );

        if (!favoriteIds.length) {
          setFavorites([]);
          return;
        }

        const productRes = await getProductListByIds({ ids: favoriteIds });
        const products = productRes?.data?.items || (Array.isArray(productRes?.data) ? productRes.data : []);
        const productById = new Map(products.map((product) => [String(product._id), product]));
        const normalized = favoriteIds
          .map((id) => productById.get(String(id)))
          .filter(Boolean)
          .map((product) => ({ product }));

        setFavorites(normalized);
      } else {
        alert("Failed to remove favorite");
      }
    } catch (err) {
      console.error("Error removing favorite:", err);
    }
  };

  const handleCardClick = (product) => {
    if (!product || !product._id) return;
    navigate(`/book/${product._id}`);
  };

  if (!user) {
    return (
      <div className="content">
        <div className="profile-page profile-page--guest">
          <h1>Thông tin tài khoản</h1>
          <p>Bạn cần đăng nhập để xem trang này.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className={`profile-page${isAdmin ? " profile-page--admin" : ""}`}>
        <section className="profile-hero">
          <div className="profile-hero__avatar" aria-hidden="true">
            {(name || user.email || "A").slice(0, 1).toUpperCase()}
          </div>
          <div className="profile-hero__main">
            <p className="profile-hero__eyebrow">{isAdmin ? "Admin Account" : "Tài khoản cá nhân"}</p>
            <h1 className="profile-hero__title">{name || "Chưa cập nhật tên"}</h1>
            <div className="profile-hero__meta">
              <span className="profile-pill">{roleLabel}</span>
              <span className="profile-pill profile-pill--neutral">{accountStatus}</span>
              <span className="profile-hero__meta-item">{user.email}</span>
              <span className="profile-hero__meta-item">{phone || "Chưa cập nhật số điện thoại"}</span>
            </div>
          </div>
        </section>

        <div className="profile-grid">
          <section className="profile-card">
            <header className="profile-card__head">
              <h2>Thông tin tài khoản</h2>
              <p>Quản lý thông tin đăng nhập và liên hệ của {isAdmin ? "quản trị viên" : "bạn"}.</p>
            </header>
            <div className="profile-fields">
              <div className="profile-field">
                <span className="profile-field__label">Họ và tên</span>
                <div className="profile-field__value-wrap">
                  {isEditingName ? (
                    <>
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                      <button className="content-button2" onClick={() => handleUpdate("name", name)}>
                        Lưu
                      </button>
                      <button className="content-button2" onClick={() => setIsEditingName(false)}>
                        Hủy
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="profile-field__value">{name || "Chưa cập nhật"}</span>
                      <button className="content-button" onClick={() => setIsEditingName(true)}>
                        <MdDriveFileRenameOutline />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="profile-field">
                <span className="profile-field__label">Số điện thoại</span>
                <div className="profile-field__value-wrap">
                  {isEditingPhone ? (
                    <>
                      <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} />
                      <button className="content-button2" onClick={() => handleUpdate("phone", phone)}>
                        Lưu
                      </button>
                      <button className="content-button2" onClick={() => setIsEditingPhone(false)}>
                        Hủy
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="profile-field__value">{phone || "Chưa cập nhật"}</span>
                      <button className="content-button" onClick={() => setIsEditingPhone(true)}>
                        <MdDriveFileRenameOutline />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="profile-field">
                <span className="profile-field__label">Email</span>
                <div className="profile-field__value-wrap">
                  <span className="profile-field__value">{user.email}</span>
                </div>
              </div>

              <div className="profile-field">
                <span className="profile-field__label">Mật khẩu</span>
                <div className="profile-field__value-wrap">
                  {isEditingPassword ? (
                    <>
                      <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} />
                      <button className="content-button2" onClick={() => handleUpdate("password", password)}>
                        Lưu
                      </button>
                      <button className="content-button2" onClick={() => setIsEditingPassword(false)}>
                        Hủy
                      </button>
                    </>
                  ) : ht ? (
                    <>
                      <span className="profile-field__value">{user.password || "********"}</span>
                      <button className="content-button" onClick={() => setIsEditingPassword(true)}>
                        <MdDriveFileRenameOutline />
                      </button>
                      <button className="content-button22" onClick={() => setHt(false)}>
                        <FaEye />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="profile-field__value">********</span>
                      <button className="content-button" onClick={() => setIsEditingPassword(true)}>
                        <MdDriveFileRenameOutline />
                      </button>
                      <button className="content-button22" onClick={() => setHt(true)}>
                        <FaEye />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            {error ? <p className="error-message">{error}</p> : null}
          </section>

          <section className="profile-card profile-card--summary">
            <header className="profile-card__head">
              <h2>{isAdmin ? "Tổng quan quản trị" : "Tổng quan tài khoản"}</h2>
              <p>
                {isAdmin
                  ? "Thông tin tóm tắt dành cho tài khoản có quyền quản trị hệ thống."
                  : "Thông tin nhanh về lịch sử mua hàng và danh sách yêu thích."}
              </p>
            </header>
            <div className="profile-summary">
              <article className="profile-summary__item">
                <span className="profile-summary__k">Vai trò</span>
                <span className="profile-summary__v">{roleLabel}</span>
              </article>
              <article className="profile-summary__item">
                <span className="profile-summary__k">Trạng thái tài khoản</span>
                <span className="profile-summary__v">{accountStatus}</span>
              </article>
              <article className="profile-summary__item">
                <span className="profile-summary__k">Đơn hàng cá nhân</span>
                <span className="profile-summary__v">{orders.length}</span>
              </article>
              <article className="profile-summary__item">
                <span className="profile-summary__k">Sản phẩm yêu thích</span>
                <span className="profile-summary__v">{favorites.length}</span>
              </article>
            </div>
            {isAdmin ? (
              <p className="profile-muted-note">
                Lịch sử đơn hàng và mục yêu thích không phải trọng tâm cho tài khoản quản trị, nên được giảm nhấn
                mạnh để ưu tiên thông tin tài khoản admin.
              </p>
            ) : null}
          </section>
        </div>

        {!isAdmin ? (
          <>
            <section className="profile-section">
              <h2>Đơn hàng</h2>
              {orders.length === 0 ? (
                <div className="profile-empty">Bạn chưa có đơn hàng nào.</div>
              ) : (
                <div id="orders" className="profile-orders">
                  <table className="profile-orders__table">
                    <thead>
                      <tr>
                        <th>STT</th>
                        <th>Mã đơn hàng</th>
                        <th>Tổng giá trị</th>
                        <th>Trạng thái</th>
                        <th>Thanh toán</th>
                        <th>Ngày đặt</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map((order, index) => (
                        <tr
                          key={order._id ?? index}
                          className="profile-orders__row"
                          tabIndex={0}
                          onClick={() => {
                            setSelectedOrder(order);
                            setOrderDetailOpen(true);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedOrder(order);
                              setOrderDetailOpen(true);
                            }
                          }}
                        >
                          <td className="stt">{index + 1}</td>
                          <td className="profile-orders__id" title={String(order._id)}>
                            {String(order._id).slice(0, 10)}…
                          </td>
                          <td className="profile-orders__money">{formatMoney(order.totals?.total ?? order.total ?? 0)} ₫</td>
                          <td>
                            <OrderStatusBadge status={order.orderStatus ?? order.status} />
                          </td>
                          <td>{formatOrderPaymentMethod(order.paymentMethod ?? order.type)}</td>
                          <td>{new Date(order.createdAt).toLocaleDateString("vi-VN")}</td>
                          <td>
                            <button
                              type="button"
                              className="profile-orders__detail-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedOrder(order);
                                setOrderDetailOpen(true);
                              }}
                            >
                              Chi tiết
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="profile-section">
              <h2>Sản phẩm yêu thích</h2>
              {favorites.length === 0 ? (
                <div className="profile-empty">Không có sản phẩm yêu thích nào.</div>
              ) : (
                <div className="favorites-list">
                  {favorites.map((favorite) => {
                    const product = favorite.product;
                    return (
                      <div key={product._id} className="cardsppp">
                        <img className="cardsppp-image" src={product.imgSrc} onClick={() => handleCardClick(product)} />
                        <p className="cardsppp-title">{product.title}</p>
                        <p className="cardsppp-price">{product.price}₫</p>
                        <button className="cardsppp-button" onClick={() => handleRemoveFavorite(product._id)}>
                          Xóa
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : (
          <section className="profile-section profile-section--muted">
            <h2>Khu vực dữ liệu khách hàng cá nhân</h2>
            <div className="profile-empty">
              Trang này đang ưu tiên thông tin tài khoản quản trị. Các mục dành cho hành vi mua sắm cá nhân đã được
              giảm nhấn mạnh để phù hợp vai trò Admin.
            </div>
          </section>
        )}

        {!isAdmin ? (
          <OrderDetailModal
            open={orderDetailOpen}
            order={selectedOrder}
            onOrdersInvalidate={refreshOrders}
            onClose={() => {
              setOrderDetailOpen(false);
              setSelectedOrder(null);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

export default Profile;

