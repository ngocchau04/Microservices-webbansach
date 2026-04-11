import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import "./styles.css";
import { paymentWebhook } from "../../api/checkoutApi";

function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const total = location.state?.total || 0;
  const paymentId = location.state?.paymentId;
  const orderId = location.state?.orderId;

  useEffect(() => {
    if (!location.state) {
      navigate("/order");
    }
  }, [location, navigate]);

  const handleCompletePayment = async (e) => {
    e.preventDefault();

    try {
      if (paymentId) {
        await paymentWebhook({
          webhookSecret: "replace_with_mock_webhook_secret",
          transactionId: paymentId,
          orderId,
          status: "succeeded",
        });
      }

      alert("Ban da thanh toan thanh cong!");
      navigate("/profile");
    } catch (error) {
      console.error("Payment webhook failed", error);
      alert("Thanh toan that bai, vui long thu lai.");
    }
  };

  return (
    <div>
      <Header />
      <div className="paymentpage">
        <h1>Thanh Toan</h1>
        <p>Tong thanh toan: {new Intl.NumberFormat("vi-VN").format(total)} VND</p>
        <button onClick={handleCompletePayment}>Hoan tat</button>
      </div>
      <Footer />
    </div>
  );
}

export default PaymentPage;

