import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import BookDetail from "./pages/BookDetail";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import VerifyAccount from "./pages/VerifyAccount";
import ListProduct from "./pages/ListProduct";
import Order from "./pages/Order";
import VoucherPage from "./pages/VoucherPage";
import Admin from "./pages/Admin";
import FeaturedAuthors from "./pages/FeaturedAuthors";
import { useEffect } from "react";
import { useUser } from "./context/UserContext";
import PaymentPage from "./pages/Order/PaymentPage";
import { getMe as getCurrentProfile, refreshToken as refreshAuthToken } from "./api/authApi";

function App() {
  const { user, setUser } = useUser();

  useEffect(() => {
    const refreshToken = async () => {
      const token = localStorage.getItem("token");

      if (token) {
        try {
          const refreshRes = await refreshAuthToken({ token });
          const latestToken = refreshRes.data.token || token;
          localStorage.setItem("token", latestToken);

          const meRes = await getCurrentProfile(latestToken);
          setUser(meRes.data.user || refreshRes.data.user || null);
        } catch (error) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
          console.error("Error refreshing token:", error);
        }
      } else {
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        setUser(null);
      }
    };
    refreshToken();
  }, []);

  return (
      <BrowserRouter>
        <Routes>
          <Route path="/book/:id" element={<BookDetail />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify" element={<VerifyAccount />} />
          <Route path="/list" element={<ListProduct />} />
          <Route path="/authors" element={<FeaturedAuthors />} />
          <Route path="/order" element={<Order />} />
          <Route path="/forgot-password" element={<VerifyAccount isresetpass={true} />} />
          <Route path="/voucher" element={<VoucherPage />} />
          <Route path="/payment" element={<PaymentPage />} />
          {user && user.role === "admin" ? <Route path="/admin" element={<Admin />} /> : null}
          <Route path="/*" element={<HomePage />} />
        </Routes>
      </BrowserRouter>
  );
}

export default App;
