import { useState } from "react";
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
import { MdLogout, MdSupportAgent } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../context/UserContext";

function Admin() {
  const [activeTab, setActiveTab] = useState("revenue");
  const { setUser } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (window.confirm("Ban co chac chan muon dang xuat khong?")) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      setUser(null);
      navigate("/");
    }
  };

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
        <button type="button" className="Admin-sidebar__item Admin-sidebar__item--logout" onClick={handleLogout}>
          <MdLogout className="Admin-sidebar__icon Admin-sidebar__icon--logout" aria-hidden />
          <span className="Admin-sidebar__label">Dang xuat</span>
        </button>
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
