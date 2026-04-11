import './RegisterPage.css';
import { FaUser, FaLock } from "react-icons/fa";
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useUser } from '../../context/UserContext';
import { FaPhone } from "react-icons/fa";
import { SiGmail } from "react-icons/si";
import { MdDriveFileRenameOutline } from "react-icons/md";
import { register as registerApi } from "../../api/authApi";

function RegisterPage() {
  const { setUser } = useUser();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', sdt: '' });
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  }

  const register = async () => {
    try {
      const response = await registerApi(formData);
      if (response.data.status === "success") {
        localStorage.removeItem('token');
        setUser(null);
        navigate('/verify');
      } else {
        alert(response.data.message || "Registration failed");
      }
    } catch (error) {
      alert("An error occurred");
      console.error(error);
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    register();
  }

  return (
    <div className="rgtp">
      <div className="wrapper2">
        <form method='post' onSubmit={handleSubmit}>
          <h1>Đăng ký</h1>
          <div className="input-box2">
            <input type="text" placeholder="Họ và tên"
              id='name' value={formData.name} onChange={handleChange} required />
            <MdDriveFileRenameOutline className='icon' />
          </div>
          <div className="input-box2">
            <input type="text" placeholder="Số điện thoại"
              id='sdt' value={formData.sdt} onChange={handleChange} required />
            <FaPhone className="icon" />
          </div>
          <div className="input-box2">
            <input type="text" placeholder="Email"
              id='email' value={formData.email} onChange={handleChange} required />
            <SiGmail className="icon" />
          </div>
          <div className="input-box2">
            <input type="password" placeholder="Mật khẩu"
              id='password' value={formData.password} onChange={handleChange} required />
            <FaLock className="icon" />
          </div>
          <button type='submit'>Đăng ký</button>
          <div className="register-link">
            <p>Đã có tài khoản ? <Link to="/login" className="a">Đăng nhập</Link></p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RegisterPage;
