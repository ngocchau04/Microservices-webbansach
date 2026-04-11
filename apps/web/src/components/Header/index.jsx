import { Link, useNavigate } from "react-router-dom";
import React, { useState, useEffect } from "react";
import { FaSearch, FaShoppingCart } from "react-icons/fa";
import { MdAccountCircle, MdLogout } from "react-icons/md";
import { LuLogIn } from "react-icons/lu";
import { useUser } from "../../context/UserContext";
import "./Header.css";
import logo from "../../assets/logo_yellow.png";

function Header() {
  const { user, setUser } = useUser();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [ totalCart, setTotalCart ] = useState(1);

  const [isfixed, setIsFixed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 200) {
        setIsFixed(true);
      } else {
        setIsFixed(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  
  useEffect(() => {
    if (user && user.cart){
      setTotalCart(user.cart.length);
    }
  }, [user]);

  const handleInputChange = (e) => {
    const searchTrim = e.target.value.trim();
    setSearchTerm(searchTrim);
  };

  const handleSearch = () => {
    navigate(`/list?title=${searchTerm}`);
  };

  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
      // Xóa thông tin người dùng khỏi localStorage
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      // Cập nhật trạng thái người dùng
      setUser(null);
      navigate("/");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className={isfixed ? "navbar fixed" : "navbar"}>
      <Link to="/">
        <div className="logo_container">
          <img src={logo} className="logo" />
        </div>
      </Link>
      <div className="search-container">
        <input
          type="text"
          placeholder="Tìm kiếm"
          className="tim-kiem"
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          value={searchTerm}
        />
        <div className="search-icon" onClick={handleSearch} >
          <FaSearch />
        </div>
      </div>
      <div className="extra-buttons">
        {user ? (
          <>
            <Link
              style={{ textDecoration: "none" }}
              to="/giohang"
              className="navv2 gio_hang"
            >
              <FaShoppingCart />
              <p className="total_cart">{totalCart}</p>
            </Link>
            <Link
              style={{ textDecoration: "none" }}
              to="/profile"
              className="navv2"
            >
              <MdAccountCircle />
            </Link>
            <button className="navv2" onClick={handleLogout}>
              <MdLogout />
            </button>
          </>
        ) : (
          <>
            <Link
              style={{ textDecoration: "none" }}
              to="/login"
              className="nav2"
            >
              <LuLogIn />
              Đăng nhập
            </Link>
            <Link
              style={{ textDecoration: "none" }}
              to="/register"
              className="nav2"
            >
              <LuLogIn />
              Đăng ký
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default Header;
