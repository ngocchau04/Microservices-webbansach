import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";
import { useUser } from "../../context/UserContext";
import { MdDriveFileRenameOutline } from "react-icons/md";
import { FaEye } from "react-icons/fa";
import { getOrdersByUserId } from "../../api/checkoutApi";
import { getProductListByIds } from "../../api/catalogApi";
import {
  getFavorites,
  removeFavorite,
  updateProfileField,
} from "../../api/authApi";

function Profile() {
  const { user, setUser } = useUser();
  const navigate = useNavigate();

  // ------------ STATE CƠ BẢN ------------
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

  // ❗ TẤT CẢ hook đều ở TOP-LEVEL, KHÔNG trong if/handle

  // Đồng bộ thông tin user vào name/phone khi user thay đổi
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.sdt || "");
    } else {
      setName("");
      setPhone("");
    }
  }, [user]);

  // Lấy danh sách đơn hàng sau khi đã có user._id
  useEffect(() => {
    if (!user || !user._id) return;

    const fetchOrders = async () => {
      try {
        const data = await getOrdersByUserId(user._id);
        setOrders(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetching orders:", err);
      }
    };

    fetchOrders();
  }, [user]);

  // ✨ Thêm hàm này (ngoài useEffect, nhưng trong component)
  const fetchFavorites = async () => {
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
                if (item.product && typeof item.product._id === "string") {
                  return item.product._id;
                }
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
        const products =
          productRes?.data?.items ||
          (Array.isArray(productRes?.data) ? productRes.data : []);
        const productById = new Map(
          products.map((product) => [String(product._id), product])
        );
        const normalized = favoriteIds
          .map((id) => productById.get(String(id)))
          .filter(Boolean)
          .map((product) => ({ product }));

        setFavorites(normalized);
      } else {
        console.error("Failed to fetch favorites");
      }
    } catch (err) {
      console.error("Error fetching favorites:", err);
    }
  };

  // useEffect chỉ việc gọi lại hàm trên
  useEffect(() => {
    fetchFavorites();
  }, []);

  // ------------ HÀM UPDATE THÔNG TIN ------------
  const handleUpdate = async (field, value) => {
    if (
      !window.confirm(
        `Bạn chắc chắn muốn đổi ${
          field === "name"
            ? "tên"
            : field === "phone"
            ? "số điện thoại"
            : "mật khẩu"
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

    // ------------ HÀM XỬ LÝ YÊU THÍCH ------------
    const handleRemoveFavorite = async (productId) => {
      try {
        const jwt = localStorage.getItem("token");
        if (!jwt) {
          alert("Vui lòng đăng nhập để xóa sản phẩm khỏi danh sách yêu thích.");
          return;
        }

        if (
          !window.confirm(
            "Bạn có chắc chắn muốn xóa sản phẩm này khỏi danh sách yêu thích?"
          )
        ) {
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
                if (item.product && typeof item.product._id === "string") {
                  return item.product._id;
                }
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
        const products =
          productRes?.data?.items ||
          (Array.isArray(productRes?.data) ? productRes.data : []);
        const productById = new Map(
          products.map((product) => [String(product._id), product])
        );
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

  // ------------ GUARD: CHƯA CÓ USER THÌ KHÔNG RENDER PROFILE ------------
  if (!user) {
    return (
      <div className="content">
        <h1>Thông tin cá nhân</h1>
        <p>Bạn cần đăng nhập để xem trang này.</p>
      </div>
    );
  }

  // ------------ JSX ------------
  return (
    <div className="content">
      <div>
        <div style={{ height: "20px" }} />
        <h1>Thông tin cá nhân</h1>
        <div className="thong-tin-ca-nhan">
          {/* Họ tên */}
          <div className="info-item">
            <span>Họ và tên: </span>
            {isEditingName ? (
              <>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <button
                  className="content-button2"
                  onClick={() => handleUpdate("name", name)}
                >
                  Lưu
                </button>
                <button
                  className="content-button2"
                  onClick={() => setIsEditingName(false)}
                >
                  Hủy
                </button>
              </>
            ) : (
              <>
                <span>{name}</span>
                <button
                  className="content-button"
                  onClick={() => setIsEditingName(true)}
                >
                  <MdDriveFileRenameOutline style={{ marginBottom: "-4px" }} />
                </button>
              </>
            )}
          </div>

          {/* Số điện thoại */}
          <div className="info-item">
            <span>Số điện thoại: </span>
            {isEditingPhone ? (
              <>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <button
                  className="content-button2"
                  onClick={() => handleUpdate("phone", phone)}
                >
                  Lưu
                </button>
                <button
                  className="content-button2"
                  onClick={() => setIsEditingPhone(false)}
                >
                  Hủy
                </button>
              </>
            ) : (
              <>
                <span>{phone}</span>
                <button
                  className="content-button"
                  onClick={() => setIsEditingPhone(true)}
                >
                  <MdDriveFileRenameOutline style={{ marginBottom: "-4px" }} />
                </button>
              </>
            )}
          </div>

          <div style={{ height: "15px" }} />
          {/* Email */}
          <div className="info-item">
            <span>Email: </span>
            <span>{user.email}</span>
          </div>

          <div style={{ height: "10px" }} />
          {/* Mật khẩu */}
          <div className="info-item">
            <span>Mật khẩu: </span>
            {isEditingPassword ? (
              <>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className="content-button2"
                  onClick={() => handleUpdate("password", password)}
                >
                  Lưu
                </button>
                <button
                  className="content-button2"
                  onClick={() => setIsEditingPassword(false)}
                >
                  Hủy
                </button>
              </>
            ) : ht ? (
              <>
                <span>{user.password}</span>
                <button
                  className="content-button"
                  onClick={() => setIsEditingPassword(true)}
                >
                  <MdDriveFileRenameOutline style={{ marginBottom: "-4px" }} />
                </button>
                <button
                  className="content-button22"
                  onClick={() => setHt(false)}
                >
                  <FaEye />
                </button>
              </>
            ) : (
              <>
                <span>********</span>
                <button
                  className="content-button"
                  onClick={() => setIsEditingPassword(true)}
                >
                  <MdDriveFileRenameOutline style={{ marginBottom: "-4px" }} />
                </button>
                <button
                  className="content-button22"
                  onClick={() => setHt(true)}
                >
                  <FaEye />
                </button>
              </>
            )}
          </div>

          {error && <p className="error-message">{error}</p>}
        </div>
      </div>

      {/* Đơn hàng */}
      <div style={{ height: "20px" }} />
      <h1>Đơn hàng</h1>
      <div style={{ height: "20px" }} />
      {orders.length === 0 ? (
        <h2 style={{ textAlign: "center" }}>Bạn chưa có đơn hàng nào</h2>
      ) : (
        <div id="orders">
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Mã đơn hàng</th>
                <th>Tổng giá trị</th>
                <th>Trạng thái</th>
                <th>Phương thức thanh toán</th>
                <th>Ngày đặt</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => (
                <tr key={order._id ?? index}>
                  <td className="stt">{index + 1}</td>
                  <td className="stt">{order._id}</td>
                  <td>{order.total ?? order.totals?.total ?? 0}</td>
                  <td>{order.status ?? order.orderStatus}</td>
                  <td>{order.type ?? order.paymentMethod}</td>
                  <td>{new Date(order.createdAt).toLocaleDateString("vi-VN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sản phẩm yêu thích */}
      <div style={{ height: "30px" }} />
      <h1>Sản phẩm yêu thích</h1>
      {favorites.length === 0 ? (
        <h2 style={{ textAlign: "center" }}>
          Không có sản phẩm yêu thích nào
        </h2>
      ) : (
        <div className="favorites-list">
          {favorites.map((favorite) => {
            const product = favorite.product;
            return (
              <div key={product._id} className="cardsppp">
                <img
                  className="cardsppp-image"
                  src={product.imgSrc}
                  onClick={() => handleCardClick(product)}
                />
                <p className="cardsppp-title">{product.title}</p>
                <p className="cardsppp-price">{product.price}₫</p>
                <button
                  className="cardsppp-button"
                  onClick={() => handleRemoveFavorite(product._id)}
                >
                  Xóa
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Profile;

