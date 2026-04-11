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
      <div className="Admin-sidebar">
        <div>
          <button onClick={() => setActiveTab("revenue")}>
            <FaMoneyBillTrendUp style={{ marginBottom: "-2px" }} /> Doanh thu
          </button>
          <button onClick={() => setActiveTab("order")}>
            <HiShoppingBag style={{ marginBottom: "-2px" }} /> Don hang
          </button>
          <button onClick={() => setActiveTab("product")}>
            <AiFillProduct style={{ marginBottom: "-3px" }} /> San pham
          </button>
          <button onClick={() => setActiveTab("user")}>
            <FaUserFriends style={{ marginBottom: "-3px" }} /> Khach hang
          </button>
          <button onClick={() => setActiveTab("voucher")}>
            <IoTicket style={{ marginBottom: "-2px" }} /> Voucher
          </button>
          <button onClick={() => setActiveTab("support")}>
            <MdSupportAgent style={{ marginBottom: "-2px" }} /> Feedback
          </button>
        </div>
        <button onClick={handleLogout}>
          <MdLogout style={{ fontSize: "30px", marginBottom: "-6px" }} /> Dang xuat
        </button>
      </div>
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
