import { useNavigate } from "react-router-dom";
import logo from "../../assets/logo_red.png";
import { useEffect, useRef, useState } from "react";
import { IoMdArrowRoundBack } from "react-icons/io";
import "./VerifyAccount.css";
import {
  checkEmail,
  resendVerification,
  verifyAccount as verifyAccountApi,
  forgotPassword,
} from "../../api/authApi";

function VerifyAccount(props) {
  const navigate = useNavigate();
  const [user, setUser] = useState("");
  const isResetPassword = props.isresetpass;
  const emailref = useRef(null);
  const coderef = useRef(null);

  if (!isResetPassword)
    useEffect(() => {
      emailref.current.style.display = "flex";
      coderef.current.style.display = "none";
    }, []);

  const searchAccount = (e) => {
    e.preventDefault();
    const email = document.getElementById("verify_email").value;
    const data = { email };
    console.log(data);
    checkEmail(data).then((response) => {
      if (response.data.status === "success") {
        setUser(response.data.user);
        emailref.current.style.display = "none";
        coderef.current.style.display = "flex";
      } else {
        alert(`${response.data.message}`);
      }
    });
  };

  const resendCode = () => {
    const data = { email: user.email };
    resendVerification(data).then((response) => {
      if (response.data.status === "success") {
        alert("Verification code was sent to your email");
      } else {
        alert(`Failed to send verification code: ${response.data.message}`);
      }
    });
  };

  const verifyAccount = (e) => {
    e.preventDefault();
    console.log("Verifying account");
    const email = document.getElementById("verify_email").value;
    const number = document.getElementById("verify_code").value;
    const data = {
      email,
      number,
    };
    verifyAccountApi(data).then((response) => {
      if (response.data.status === "success") {
        alert("Account verified successfully");
        navigate("/login");
      } else {
        alert(`Verification failed: ${response.data.message}`);
      }
    });
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    const email = document.getElementById("verify_email").value;
    forgotPassword({ email })
      .then((response) => {
        if (response.data.status === "success") {
          alert("Mật khẩu đã được gửi đến email của bạn");
          navigate("/login");
        } else {
          alert(`Failed to reset password: ${response.data.message}`);
        }
      });
  };

  return (
    <>
      {isResetPassword ? (
        <div id="verify_container">
          <div className="verify_border" ref={emailref}>
            <img src={logo} alt="logo" />
            <h2>Quên mật khẩu</h2>
            <p>Nhập email của bạn để nhận mật khẩu gửi về</p>
            <form onSubmit={handleForgotPassword}>
              <input
                type="email"
                placeholder="...@gmail.com"
                id="verify_email"
                required
              />
              <button type="submit">Gửi mật khẩu</button>
            </form>
          </div>
        </div>
      ) : (
        <div id="verify_container">
          <div className="verify_border" ref={emailref}>
            <img src={logo} alt="logo" />
            <h2>Xác thực tài khoản</h2>
            <p>Nhập email của bạn</p>
            <form onSubmit={searchAccount}>
              <input
                type="email"
                placeholder="...@gmail.com"
                id="verify_email"
                required
              />
              <button type="submit">Gửi</button>
            </form>
          </div>
          <div className="verify_border" ref={coderef}>
            <span style={{ margin: "0px", width: "100%" }}>
              <IoMdArrowRoundBack
                id="arrow_back"
                onClick={() => {
                  emailref.current.style.display = "flex";
                  coderef.current.style.display = "none";
                }}
              />
            </span>
            <img src={logo} alt="logo" />
            <h2>Xin chào {user.name}</h2>
            <p>Điền mã xác nhận được gửi đến email của bạn</p>
            <form onSubmit={verifyAccount}>
              <input
                type="text"
                placeholder="Mã xác thực email"
                id="verify_code"
                minLength={6}
                maxLength={6}
                required
              />
              <p>
                Chưa nhận được mã ? <span onClick={resendCode}>Gửi lại</span>
              </p>
              <button type="submit">Xác thực</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default VerifyAccount;
