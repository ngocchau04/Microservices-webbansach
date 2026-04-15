import { useState, useRef, useEffect, useCallback } from "react";
import AdminUser from "./AdminUser";
import AdminProduct from "./AdminProduct";
import AdminVoucher from "./AdminVoucher";
import AdminOrder from "./AdminOrder";
import AdminRevenue from "./AdminRevenue";
import AdminSupport from "./AdminSupport";
import "./Admin.css";
import { HiShoppingBag } from "react-icons/hi2";
import { AiFillProduct } from "react-icons/ai";
import { FaUserFriends } from "react-icons/fa";
import { IoTicket } from "react-icons/io5";
import { FaMoneyBillTrendUp } from "react-icons/fa6";
import { MdSupportAgent } from "react-icons/md";
import { HiOutlineLogout } from "react-icons/hi";
import { IoPersonCircleOutline } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";

function Admin() {
  const [activeTab, setActiveTab] = useState("revenue");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountWrapRef = useRef(null);
  const { user, setUser } = useUser();
  const navigate = useNavigate();

  const displayName =
    (typeof user?.name === "string" && user.name.trim()) ||
    (typeof user?.username === "string" && user.username.trim()) ||
    "Admin";

  const displayEmail = typeof user?.email === "string" && user.email.trim() ? user.email.trim() : null;

  const avatarInitials = (() => {
    const n = displayName.trim();
    if (!n) return "A";
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
    }
    return n.slice(0, 2).toUpperCase();
  })();

  const handleLogout = () => {
    if (window.confirm("Ban co chac chan muon dang xuat khong?")) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setUser(null);
      navigate("/");
    }
  };

  const closeAccountMenu = useCallback(() => setAccountMenuOpen(false), []);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const onDocPointer = (e) => {
      if (accountWrapRef.current && !accountWrapRef.current.contains(e.target)) {
        setAccountMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [accountMenuOpen]);

  return (
    <div className="Admin-container">
      <aside className="Admin-sidebar" aria-label="Menu quản trị">
        <nav className="Admin-sidebar__nav">
          <button
            type="button"
            className={`Admin-sidebar__item${activeTab === "revenue" ? " Admin-sidebar__item--active" : ""}`}
            onClick={() => setActiveTab("revenue")}
          >
            <FaMoneyBillTrendUp className="Admin-sidebar__icon" aria-hidden />
            <span className="Admin-sidebar__label">Doanh thu</span>
          </button>
          <button
            type="button"
            className={`Admin-sidebar__item${activeTab === "order" ? " Admin-sidebar__item--active" : ""}`}
            onClick={() => setActiveTab("order")}
          >
            <HiShoppingBag className="Admin-sidebar__icon" aria-hidden />
            <span className="Admin-sidebar__label">Don hang</span>
          </button>
          <button
            type="button"
            className={`Admin-sidebar__item${activeTab === "product" ? " Admin-sidebar__item--active" : ""}`}
            onClick={() => setActiveTab("product")}
          >
            <AiFillProduct className="Admin-sidebar__icon" aria-hidden />
            <span className="Admin-sidebar__label">San pham</span>
          </button>
          <button
            type="button"
            className={`Admin-sidebar__item${activeTab === "user" ? " Admin-sidebar__item--active" : ""}`}
            onClick={() => setActiveTab("user")}
          >
            <FaUserFriends className="Admin-sidebar__icon" aria-hidden />
            <span className="Admin-sidebar__label">Khach hang</span>
          </button>
          <button
            type="button"
            className={`Admin-sidebar__item${activeTab === "voucher" ? " Admin-sidebar__item--active" : ""}`}
            onClick={() => setActiveTab("voucher")}
          >
            <IoTicket className="Admin-sidebar__icon" aria-hidden />
            <span className="Admin-sidebar__label">Voucher</span>
          </button>
          <button
            type="button"
            className={`Admin-sidebar__item${activeTab === "support" ? " Admin-sidebar__item--active" : ""}`}
            onClick={() => setActiveTab("support")}
          >
            <MdSupportAgent className="Admin-sidebar__icon" aria-hidden />
            <span className="Admin-sidebar__label">Feedback</span>
          </button>
        </nav>

        <div className="Admin-sidebar__account" ref={accountWrapRef}>
          <button
            type="button"
            className={`Admin-sidebar__account-trigger${accountMenuOpen ? " Admin-sidebar__account-trigger--open" : ""}`}
            onClick={() => setAccountMenuOpen((o) => !o)}
            aria-expanded={accountMenuOpen}
            aria-haspopup="true"
            aria-controls="admin-account-menu"
            id="admin-account-trigger"
          >
            <span className="Admin-sidebar__account-avatar" aria-hidden="true">
              {avatarInitials}
            </span>
            <span className="Admin-sidebar__account-text">
              <span className="Admin-sidebar__account-name">{displayName}</span>
              <span className="Admin-sidebar__account-role">Quản trị viên</span>
            </span>
            <span className="Admin-sidebar__account-chevron" aria-hidden="true" />
          </button>

          {accountMenuOpen ? (
            <div
              className="Admin-sidebar__account-panel"
              id="admin-account-menu"
              role="menu"
              aria-labelledby="admin-account-trigger"
            >
              <div className="Admin-sidebar__account-panel-head">
                <p className="Admin-sidebar__account-panel-name">{displayName}</p>
                {displayEmail ? (
                  <p className="Admin-sidebar__account-panel-email">{displayEmail}</p>
                ) : null}
                <p className="Admin-sidebar__account-panel-badge">Admin · Toàn quyền quản trị</p>
              </div>
              <div className="Admin-sidebar__account-actions">
                <button
                  type="button"
                  className="Admin-sidebar__account-action"
                  role="menuitem"
                  onClick={() => {
                    closeAccountMenu();
                    navigate("/profile");
                  }}
                >
                  <IoPersonCircleOutline className="Admin-sidebar__account-action-icon" aria-hidden />
                  <span>Thông tin tài khoản</span>
                </button>
                <button
                  type="button"
                  className="Admin-sidebar__account-action Admin-sidebar__account-action--logout"
                  role="menuitem"
                  onClick={() => {
                    closeAccountMenu();
                    handleLogout();
                  }}
                >
                  <HiOutlineLogout className="Admin-sidebar__account-action-icon" aria-hidden />
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </aside>
      <div className="Admin-content">
        {activeTab === "revenue" && <AdminRevenue />}
        {activeTab === "user" && <AdminUser />}
        {activeTab === "product" && <AdminProduct />}
        {activeTab === "voucher" && <AdminVoucher />}
        {activeTab === "order" && <AdminOrder />}
        {activeTab === "support" && <AdminSupport />}
      </div>
    </div>
  );
}

export default Admin;
