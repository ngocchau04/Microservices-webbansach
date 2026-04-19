import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import "./styles.css";
import { getPaymentById } from "../../api/checkoutApi";

const PAYMENT_PROVIDER_LABELS = {
  vnpay: "VNPay",
  momo: "MoMo",
  mockpay: "MockPay",
};

function PaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const paymentIdFromQuery = searchParams.get("paymentId");
  const orderIdFromQuery = searchParams.get("orderId");
  const successFromQuery = searchParams.get("success");
  const providerFromQuery = searchParams.get("provider");

  const paymentId = paymentIdFromQuery || location.state?.paymentId || null;
  const orderId = orderIdFromQuery || location.state?.orderId || null;
  const total = location.state?.total ?? 0;
  const [loading, setLoading] = useState(Boolean(paymentIdFromQuery));
  const [payment, setPayment] = useState(null);
  const [notice, setNotice] = useState(null);
  const resolvedProvider = String(
    payment?.provider || location.state?.provider || providerFromQuery || "vnpay"
  ).toLowerCase();
  const channelLabel =
    location.state?.channelLabel ||
    PAYMENT_PROVIDER_LABELS[resolvedProvider] ||
    resolvedProvider.toUpperCase();

  useEffect(() => {
    if (!paymentId && !location.state) {
      navigate("/order");
    }
  }, [location.state, navigate, paymentId]);

  useEffect(() => {
    if (!paymentIdFromQuery) {
      return;
    }

    let active = true;
    setLoading(true);

    getPaymentById(paymentIdFromQuery)
      .then((data) => {
        if (!active) return;
        const item = data?.payment || data?.item || data || null;
        setPayment(item);
      })
      .catch((error) => {
        console.error("Failed to load payment status", error);
        if (!active) return;
        setNotice({
          type: "error",
          text: "Khong tai duoc trang thai giao dich. Ban van co the xem don trong trang ca nhan.",
        });
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [paymentIdFromQuery]);

  const formatMoney = (n) => new Intl.NumberFormat("vi-VN").format(Number(n) || 0);

  const shortId = (id) => {
    if (id == null) return "-";
    const value = String(id);
    return value.length > 12 ? `${value.slice(0, 10)}...` : value;
  };

  const resolvedAmount = payment?.amount ?? total;
  const resolvedStatus = String(payment?.status || "").toLowerCase();
  const querySuccess = successFromQuery === "1";
  const isSuccess = resolvedStatus
    ? resolvedStatus === "succeeded"
    : querySuccess;

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
              <p className="payment-complete__eyebrow">Ket qua thanh toan {channelLabel}</p>
              <h1 className="payment-complete__title">
                {loading ? "Dang cap nhat giao dich" : isSuccess ? "Thanh toan thanh cong" : "Thanh toan chua thanh cong"}
              </h1>
              <p className="payment-complete__lead">
                {loading
                  ? `He thong dang dong bo ket qua tu ${channelLabel} va cap nhat trang thai don hang.`
                  : isSuccess
                    ? "Giao dich da duoc ghi nhan tren he thong. Ban co the xem lai chi tiet trong trang ca nhan."
                    : "Giao dich khong thanh cong hoac bi huy. Ban co the thu lai tu trang dat hang."}
              </p>
            </div>

            <div className="payment-complete__panel">
              <div className="payment-complete__row">
                <span className="payment-complete__k">So tien thanh toan</span>
                <span className="payment-complete__v payment-complete__v--amount">
                  {formatMoney(resolvedAmount)} <span className="payment-complete__unit">VND</span>
                </span>
              </div>
              <div className="payment-complete__row">
                <span className="payment-complete__k">Kenh thanh toan</span>
                <span className="payment-complete__v">{channelLabel}</span>
              </div>
              <div className="payment-complete__row">
                <span className="payment-complete__k">Ma don hang</span>
                <span className="payment-complete__v payment-complete__v--mono" title={orderId || ""}>
                  {shortId(orderId)}
                </span>
              </div>
              <div className="payment-complete__row">
                <span className="payment-complete__k">Tham chieu thanh toan</span>
                <span className="payment-complete__v payment-complete__v--mono" title={paymentId || ""}>
                  {shortId(paymentId)}
                </span>
              </div>
              <div className="payment-complete__row">
                <span className="payment-complete__k">Trang thai</span>
                <span className="payment-complete__v">{loading ? "Dang xu ly" : isSuccess ? "Da thanh toan" : "That bai / da huy"}</span>
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
                onClick={() => navigate("/profile")}
              >
                Xem don hang
              </button>
              <p className="payment-complete__cta-hint">
                Ket qua duoc tra ve tu {channelLabel} va dong bo qua callback backend.
              </p>
            </div>

            <div className="payment-complete__links">
              <button type="button" className="payment-complete__link" onClick={() => navigate("/")}>
                Tiep tuc mua sam
              </button>
              <span className="payment-complete__links-sep" aria-hidden="true">
                ·
              </span>
              <button type="button" className="payment-complete__link" onClick={() => navigate("/order")}>
                Quay lai dat hang
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
