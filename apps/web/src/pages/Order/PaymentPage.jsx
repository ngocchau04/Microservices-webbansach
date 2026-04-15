import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import "./styles.css";
import { paymentWebhook } from "../../api/checkoutApi";

function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const total = location.state?.total ?? 0;
  const paymentId = location.state?.paymentId;
  const orderId = location.state?.orderId;
  const channelLabel = location.state?.channelLabel;

  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (!location.state) {
      navigate("/order");
    }
  }, [location.state, navigate]);

  const formatMoney = (n) => new Intl.NumberFormat("vi-VN").format(Number(n) || 0);

  const shortId = (id) => {
    if (id == null) return "—";
    const s = String(id);
    return s.length > 12 ? `${s.slice(0, 10)}…` : s;
  };

  const handleCompletePayment = async (e) => {
    e.preventDefault();
    setNotice(null);
    setSubmitting(true);

    try {
      if (paymentId) {
        await paymentWebhook({
          webhookSecret: "replace_with_mock_webhook_secret",
          transactionId: paymentId,
          orderId,
          status: "succeeded",
        });
      }

      setNotice({ type: "success", text: "Giao dịch demo đã hoàn tất. Chuyển đến tài khoản của bạn…" });
      window.setTimeout(() => navigate("/profile"), 1400);
    } catch (error) {
      console.error("Payment webhook failed", error);
      setNotice({
        type: "error",
        text: "Không thể xác nhận bước cuối (demo). Bạn vẫn có thể xem đơn trong hồ sơ.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!location.state) {
    return null;
  }

  return (
    <div className="payment-complete-page">
      <Header />
      <main className="payment-complete">
        <div className="payment-complete__wrap">
          <div className="payment-complete__card">
            <div className="payment-complete__hero" aria-hidden="true">
              <div className="payment-complete__badge">
                <svg className="payment-complete__badge-icon" viewBox="0 0 64 64" role="img">
                  <circle className="payment-complete__badge-ring" cx="32" cy="32" r="28" />
                  <path
                    className="payment-complete__badge-check"
                    pathLength="100"
                    fill="none"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20 33 L28 41 L44 25"
                  />
                </svg>
              </div>
              <p className="payment-complete__eyebrow">Thanh toán online (demo)</p>
              <h1 className="payment-complete__title">Biên lai thanh toán</h1>
              <p className="payment-complete__lead">
                Đơn hàng của bạn đã được ghi nhận. Đây là màn hình xác nhận giao dịch mô phỏng — không
                trừ tiền thật qua cổng thanh toán.
              </p>
            </div>

            <div className="payment-complete__panel">
              <div className="payment-complete__row">
                <span className="payment-complete__k">Số tiền thanh toán</span>
                <span className="payment-complete__v payment-complete__v--amount">
                  {formatMoney(total)} <span className="payment-complete__unit">VND</span>
                </span>
              </div>
              {channelLabel ? (
                <div className="payment-complete__row">
                  <span className="payment-complete__k">Kênh thanh toán</span>
                  <span className="payment-complete__v">{channelLabel}</span>
                </div>
              ) : null}
              <div className="payment-complete__row">
                <span className="payment-complete__k">Mã đơn hàng</span>
                <span className="payment-complete__v payment-complete__v--mono" title={orderId != null ? String(orderId) : ""}>
                  {shortId(orderId)}
                </span>
              </div>
              <div className="payment-complete__row">
                <span className="payment-complete__k">Tham chiếu thanh toán</span>
                <span className="payment-complete__v payment-complete__v--mono" title={paymentId != null ? String(paymentId) : ""}>
                  {shortId(paymentId)}
                </span>
              </div>
            </div>

            {notice ? (
              <div
                className={`payment-complete__notice payment-complete__notice--${notice.type}`}
                role="status"
              >
                {notice.text}
              </div>
            ) : null}

            <div className="payment-complete__cta-block">
              <button
                type="button"
                className="payment-complete__btn payment-complete__btn--primary"
                onClick={handleCompletePayment}
                disabled={submitting}
              >
                {submitting ? "Đang xác nhận…" : "Hoàn tất — ghi nhận giao dịch (demo)"}
              </button>
              <p className="payment-complete__cta-hint">
                Bước này gọi webhook demo trên hệ thống — giữ nguyên luồng kỹ thuật hiện tại.
              </p>
            </div>

            <div className="payment-complete__links">
              <button type="button" className="payment-complete__link" onClick={() => navigate("/")}>
                Tiếp tục mua sắm
              </button>
              <span className="payment-complete__links-sep" aria-hidden="true">
                ·
              </span>
              <button type="button" className="payment-complete__link" onClick={() => navigate("/profile")}>
                Xem đơn hàng
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default PaymentPage;
