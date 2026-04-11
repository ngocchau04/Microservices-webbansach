import { useState } from 'react';
import './LoginPage.css';
import { FaUser, FaLock } from "react-icons/fa";
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../../context/UserContext.jsx';
import { login as loginApi } from "../../api/authApi";

function LoginPage() {
  const { setUser } = useUser();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const login = async () => {
    try {
      const data = { username, password };
      const response = await loginApi(data);
      if (response.data.status === "success") {
        const userData = response.data.user;
        const token = response.data.token;
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('token', token);
        setUser({ ...userData, token });
        if (userData.role === "admin") navigate('/admin');
        else navigate('/');
      } else {
        alert("Login failed");
      }
    } catch (error) {
      console.error("An error occurred:", error);
      alert("An error occurred. Please try again.");
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    login();
  };

  return (
    <div className="lgp">
      <div className="wrapper">
        <form onSubmit={handleSubmit}>
          <h1>Đăng nhập</h1>
          <div className="input-box">
            <input type="text" placeholder="Email" value={username}
              onChange={(e) => setUsername(e.target.value)} required />
            <FaUser className="icon" />
          </div>
          <div className="input-box">
            <input type="password" placeholder="Mật khẩu" value={password}
              onChange={(e) => setPassword(e.target.value)} required />
            <FaLock className="icon" />
          </div>
          <button type='submit'>Đăng nhập</button>
          <div className="register-link">
            <p>Chưa có tài khoản ? <Link to="/register" className="a">Đăng ký</Link></p>
            <p><Link to="/forgot-password" className="aa">Quên mật khẩu?</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
