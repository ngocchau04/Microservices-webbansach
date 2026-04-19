import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo_red.png";
import { resetPassword } from "../../api/authApi";
import "./ForgotPassword.css";

function ForgotPasswordPage() {
  const navigate = useNavigate();

  const handleResetPassword = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "").trim();
    const newPassword = String(formData.get("newPassword") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    try {
      const response = await resetPassword({ email, newPassword, confirmPassword });
      if (response.data.status === "success") {
        alert(response.data.message || "Password updated successfully");
        navigate("/login");
        return;
      }

      alert(response.data.message || "Failed to reset password");
    } catch (error) {
      console.error(error);
      alert("An error occurred");
    }
  };

  return (
    <div id="verify_container">
      <div className="verify_border">
        <img src={logo} alt="logo" />
        <h2>Quên mật khẩu</h2>
        <p>Nhập email và đặt mật khẩu mới để đăng nhập lại</p>
        <form onSubmit={handleResetPassword}>
          <input type="email" placeholder="...@gmail.com" name="email" required />
          <input type="password" placeholder="Mật khẩu mới" name="newPassword" minLength={6} required />
          <input
            type="password"
            placeholder="Xác nhận mật khẩu mới"
            name="confirmPassword"
            minLength={6}
            required
          />
          <button type="submit">Cập nhật mật khẩu</button>
        </form>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
