import React, { useState, useEffect, useMemo, useCallback } from "react";
import Footer from "../../components/Footer";
import Header from "../../components/Header";
import "./styles.css";
import { useUser } from "../../context/UserContext";
import { useNavigate } from "react-router-dom";
import {
  createOrder,
  createPayment,
  removeCartItems,
  validateVoucher,
} from "../../api/checkoutApi";
import { getProductListByIds } from "../../api/catalogApi";
import {
  VOUCHER_INVALID_MESSAGE,
  isVoucherInputBlockingCheckout,
  normalizeVoucherCode,
} from "./voucherCheckoutState";
import { VN_LOCATION_DATA } from "./vnLocationData";

/** Mock online payment channels (visual only; no gateway). */
const MOCK_PAY_CHANNELS = [
  { id: "wallet", icon: "◎", label: "Ví điện tử" },
  { id: "card", icon: "▭", label: "Thẻ ngân hàng" },
  { id: "qr", icon: "▢", label: "QR thanh toán" },
  { id: "gateway", icon: "◇", label: "Cổng thanh toán (mock)" },
];

/** Minimum time the processing UI is shown (feels intentional; API may be faster). */
const ONLINE_MIN_PROCESS_MS = 1400;
/** Success screen duration before navigating to /payment (existing flow). */
const ONLINE_SUCCESS_HOLD_MS = 2400;

const Order = () => {
  const navigate = useNavigate();
  const { user, setUser } = useUser();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState("cod");
  /** Visual-only mock channel for online payment UI (no gateway integration). */
  const [mockPayChannel, setMockPayChannel] = useState("wallet");
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || user?.sdt || "");
  const [provinceCode, setProvinceCode] = useState("");
  const [districtCode, setDistrictCode] = useState("");
  const [wardName, setWardName] = useState("");
  const [addressDetail, setAddressDetail] = useState(user?.address || "");
  const [addressError, setAddressError] = useState("");
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState("");
  /** Online-only: mock payment confirmation step before order API calls. */
  const [paymentConfirmOpen, setPaymentConfirmOpen] = useState(false);
  /** idle: confirm form; processing: API + min time; success: brief hold before redirect */
  const [onlinePayPhase, setOnlinePayPhase] = useState("idle");
  /** Populated after successful online API; drives redirect to /payment */
  const [pendingPaymentNav, setPendingPaymentNav] = useState(null);
  /** Rotating microcopy during processing (0 → 1) for clearer payment steps */
  const [processingCopyStep, setProcessingCopyStep] = useState(0);

  const voucherDiscount = appliedVoucher?.discount ?? 0;
  const voucherValid = Boolean(appliedVoucher);
  const voucherInvalid = Boolean(voucherError);

  const orderedProducts = user?.order?.products || [];

  useEffect(() => {
    const fetchBooks = async () => {
      if (!orderedProducts.length) {
        setBooks([]);
        setLoading(false);
        return;
      }

      try {
        const ids = orderedProducts.map((item) => item.id);
        const res = await getProductListByIds({ ids });
        const items = Array.isArray(res?.data) ? res.data : [];
        setBooks(items);
      } catch (error) {
        console.error("Loi khi lay danh sach sach:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [user?.order?.products]);

  const productMap = useMemo(() => {
    const map = new Map();
    books.forEach((book) => {
      map.set(String(book._id), book);
    });
    return map;
  }, [books]);

  const lineItems = useMemo(() => {
    return orderedProducts
      .map((item) => {
        const book = productMap.get(String(item.id));
        if (!book) return null;

        return {
          id: String(item.id),
          quantity: Number(item.quantity) || 1,
          title: book.title,
          image: book.imgSrc,
          price: Number(book.price) || 0,
          discountPercent: Number(book.discount) || 0,
        };
      })
      .filter(Boolean);
  }, [orderedProducts, productMap]);

  const subtotal = useMemo(
    () => lineItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [lineItems]
  );

  const total = Math.max(subtotal - voucherDiscount, 0);
  const isOnlinePayment = selectedPayment === "online";
  const selectedMockChannel = useMemo(
    () => MOCK_PAY_CHANNELS.find((c) => c.id === mockPayChannel) || MOCK_PAY_CHANNELS[0],
    [mockPayChannel]
  );

  const canSubmitCheckout = useMemo(() => {
    const token = localStorage.getItem("token");
    if (!token) return false;
    if (!lineItems.length) return false;
    if (!name.trim() || !email.trim() || !phone.trim()) return false;
    if (!provinceCode || !districtCode || !wardName || !addressDetail.trim()) return false;
    if (isVoucherInputBlockingCheckout({ voucherInput, appliedVoucher })) return false;
    return true;
  }, [lineItems, name, email, phone, provinceCode, districtCode, wardName, addressDetail, voucherInput, appliedVoucher]);
  const selectedProvince = useMemo(
    () => VN_LOCATION_DATA.find((province) => province.code === provinceCode) || null,
    [provinceCode]
  );
  const districtOptions = selectedProvince?.districts || [];
  const selectedDistrict = useMemo(
    () => districtOptions.find((district) => district.code === districtCode) || null,
    [districtOptions, districtCode]
  );
  const wardOptions = selectedDistrict?.wards || [];
  const composedShippingAddress = useMemo(() => {
    const parts = [
      addressDetail.trim(),
      wardName.trim(),
      selectedDistrict?.name,
      selectedProvince?.name,
    ].filter(Boolean);
    return parts.join(", ");
  }, [addressDetail, wardName, selectedDistrict?.name, selectedProvince?.name]);

  const formatMoney = (money) =>
    new Intl.NumberFormat("vi-VN").format(Number(money) || 0);

  const formatTitle = (title = "") => {
    if (title.length > 30) {
      return `${title.slice(0, 30)}...`;
    }
    return title;
  };

  const updateOrderProducts = (next) => {
    setUser((prev) => ({
      ...prev,
      order: {
        ...(prev?.order || {}),
        products: next,
      },
    }));
  };

  const clearVoucherState = () => {
    setAppliedVoucher(null);
    setVoucherError("");
  };

  const handleProvinceChange = (nextCode) => {
    setProvinceCode(nextCode);
    setDistrictCode("");
    setWardName("");
    setAddressError("");
  };

  const handleDistrictChange = (nextCode) => {
    setDistrictCode(nextCode);
    setWardName("");
    setAddressError("");
  };

  const handleIncreaseQuantity = (index) => {
    const next = [...orderedProducts];
    next[index].quantity += 1;
    updateOrderProducts(next);
    clearVoucherState();
  };

  const handleDecreaseQuantity = (index) => {
    const next = [...orderedProducts];
    if (next[index].quantity > 1) {
      next[index].quantity -= 1;
      updateOrderProducts(next);
      clearVoucherState();
    }
  };

  const handleDelete = (index) => {
    const next = [...orderedProducts];
    next.splice(index, 1);
    updateOrderProducts(next);
    clearVoucherState();
  };

  const handleVoucher = async () => {
    const code = voucherInput.trim();
    if (!code) {
      setAppliedVoucher(null);
      setVoucherError("Vui lòng nhập mã voucher.");
      return;
    }

    try {
      const res = await validateVoucher({
        code,
        subtotal,
      });

      const discountValue = Number(res?.discount ?? res?.voucher?.discountAmount ?? 0);
      const appliedCode =
        res?.voucherProjection?.code ||
        res?.voucher?.code ||
        normalizeVoucherCode(code);

      setAppliedVoucher({ code: appliedCode, discount: discountValue });
      setVoucherError("");
    } catch (error) {
      console.error("Loi khi su dung voucher:", error);
      setAppliedVoucher(null);
      setVoucherError(VOUCHER_INVALID_MESSAGE);
    }
  };

  const validateCheckoutForm = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      alert("Vui long dang nhap de dat hang!");
      return false;
    }
    if (!lineItems.length) {
      alert("Vui long them san pham vao gio hang!");
      return false;
    }
    if (!name.trim() || !email.trim() || !phone.trim()) {
      alert("Vui long dien day du thong tin giao hang!");
      return false;
    }
    if (!provinceCode || !districtCode || !wardName || !addressDetail.trim()) {
      setAddressError("Vui lòng chọn đầy đủ Tỉnh/Thành, Quận/Huyện, Phường/Xã và nhập địa chỉ chi tiết.");
      alert("Vui lòng hoàn thiện đầy đủ địa chỉ giao hàng.");
      return false;
    }
    if (isVoucherInputBlockingCheckout({ voucherInput, appliedVoucher })) {
      setVoucherError(VOUCHER_INVALID_MESSAGE);
      return false;
    }
    setAddressError("");
    return true;
  }, [
    lineItems.length,
    name,
    email,
    phone,
    provinceCode,
    districtCode,
    wardName,
    addressDetail,
    voucherInput,
    appliedVoucher,
  ]);

  /** Create order + clear cart; shared by COD checkout and online modal flow. */
  const submitOrderCore = useCallback(async () => {
    const orderPayload = {
      userId: user?._id,
      name,
      phone,
      email,
      address: composedShippingAddress,
      paymentMethod: selectedPayment,
      products: lineItems.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      })),
      voucherCode: appliedVoucher?.code ?? null,
    };

    const orderRes = await createOrder(orderPayload);
    const createdOrder =
      orderRes?.order || orderRes?.item || (orderRes?._id ? orderRes : null);
    const orderId = createdOrder?._id;

    if (!orderId) {
      throw new Error("Order id not returned");
    }

    const ids = lineItems.map((item) => item.id);
    if (ids.length) {
      await removeCartItems(ids);
    }

    setUser((prev) => ({
      ...prev,
      cart: (prev?.cart || []).filter((item) => !ids.includes(item.product)),
      order: { products: [] },
    }));

    return { orderId };
  }, [
    user?._id,
    name,
    phone,
    email,
    composedShippingAddress,
    selectedPayment,
    lineItems,
    appliedVoucher?.code,
    setUser,
  ]);

  /** Online: same API sequence as before, returns navigate state (no navigation). */
  const finalizeOnlinePaymentApi = useCallback(async () => {
    const { orderId } = await submitOrderCore();
    const paymentRes = await createPayment({ orderId, method: "online" });
    const paymentId =
      paymentRes?.payment?._id ||
      paymentRes?.item?._id ||
      paymentRes?.transactionId;
    return {
      total,
      orderId,
      paymentId,
      channelLabel: selectedMockChannel.label,
    };
  }, [submitOrderCore, total, selectedMockChannel.label]);

  /** COD only; online uses finalizeOnlinePaymentApi from the confirmation modal. */
  const completeCheckout = useCallback(async () => {
    const { orderId } = await submitOrderCore();
    await createPayment({ orderId, method: "cod" });
    alert("Dat hang thanh cong!");
    navigate("/profile");
  }, [submitOrderCore, navigate]);

  /** COD: validate and submit immediately. Online: open mock confirmation modal first. */
  const handleBuy = async () => {
    if (!validateCheckoutForm()) return;

    if (selectedPayment === "online") {
      setOnlinePayPhase("idle");
      setPendingPaymentNav(null);
      setPaymentConfirmOpen(true);
      return;
    }

    try {
      await completeCheckout();
    } catch (error) {
      console.error("Loi khi dat hang:", error);
      const serverMsg = error?.response?.data?.message;
      alert(serverMsg || "Dat hang that bai!");
    }
  };

  const closePaymentConfirm = useCallback(() => {
    if (onlinePayPhase === "processing" || onlinePayPhase === "success") return;
    setPaymentConfirmOpen(false);
    setOnlinePayPhase("idle");
    setPendingPaymentNav(null);
  }, [onlinePayPhase]);

  const handleConfirmOnlinePayment = async () => {
    if (!validateCheckoutForm()) return;
    setOnlinePayPhase("processing");
    setPendingPaymentNav(null);
    const started = Date.now();
    try {
      const navState = await finalizeOnlinePaymentApi();
      const elapsed = Date.now() - started;
      if (elapsed < ONLINE_MIN_PROCESS_MS) {
        await new Promise((r) => setTimeout(r, ONLINE_MIN_PROCESS_MS - elapsed));
      }
      setPendingPaymentNav(navState);
      setOnlinePayPhase("success");
    } catch (error) {
      console.error("Loi khi dat hang:", error);
      const serverMsg = error?.response?.data?.message;
      alert(serverMsg || "Dat hang that bai!");
      setOnlinePayPhase("idle");
      setPendingPaymentNav(null);
    }
  };

  useEffect(() => {
    if (onlinePayPhase !== "success" || !pendingPaymentNav) return;
    const id = window.setTimeout(() => {
      navigate("/payment", { state: pendingPaymentNav });
    }, ONLINE_SUCCESS_HOLD_MS);
    return () => window.clearTimeout(id);
  }, [onlinePayPhase, pendingPaymentNav, navigate]);

  useEffect(() => {
    if (onlinePayPhase !== "processing") {
      setProcessingCopyStep(0);
      return;
    }
    setProcessingCopyStep(0);
    const id = window.setTimeout(() => setProcessingCopyStep(1), 850);
    return () => window.clearTimeout(id);
  }, [onlinePayPhase]);

  useEffect(() => {
    if (!paymentConfirmOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closePaymentConfirm();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [paymentConfirmOpen, closePaymentConfirm]);

  /** While online payment modal is processing/success, cart may clear — avoid empty-order flash */
  const holdOnlineCheckoutUi =
    paymentConfirmOpen &&
    isOnlinePayment &&
    (onlinePayPhase === "processing" || onlinePayPhase === "success");

  const renderPaymentConfirmModal = () => {
    if (!paymentConfirmOpen || !isOnlinePayment) return null;
    return (
      <div
        className="pay-confirm-overlay"
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget) closePaymentConfirm();
        }}
      >
        <div
          className={`pay-confirm pay-confirm--phase-${onlinePayPhase}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={
            onlinePayPhase === "idle"
              ? "pay-confirm-title"
              : onlinePayPhase === "processing"
                ? "pay-confirm-processing-title"
                : "pay-confirm-success-title"
          }
          aria-busy={onlinePayPhase === "processing"}
        >
          <div className="pay-confirm__glow" aria-hidden="true" />

          {onlinePayPhase === "idle" ? (
            <>
              <header className="pay-confirm__head">
                <div className="pay-confirm__brand-mark" aria-hidden="true">
                  <span className="pay-confirm__brand-icon">✓</span>
                </div>
                <h2 id="pay-confirm-title" className="pay-confirm__title">
                  Xác nhận thanh toán online
                </h2>
                <p className="pay-confirm__subtitle">
                  Bạn đang ở bước xác nhận thanh toán cuối cùng. Giao dịch mô phỏng an toàn — không trừ tiền
                  thật.
                </p>
              </header>

              <div className="pay-confirm__method-card">
                <div className="pay-confirm__method-visual" aria-hidden="true">
                  <span className="pay-confirm__method-icon">{selectedMockChannel.icon}</span>
                </div>
                <div className="pay-confirm__method-copy">
                  <span className="pay-confirm__method-label">Kênh thanh toán</span>
                  <span className="pay-confirm__method-name">{selectedMockChannel.label}</span>
                </div>
              </div>

              <div className="pay-confirm__amount-block">
                <span className="pay-confirm__amount-label">Số tiền thanh toán</span>
                <p className="pay-confirm__amount">
                  {formatMoney(total)} <span className="pay-confirm__currency">VND</span>
                </p>
              </div>

              <ul className="pay-confirm__trust" aria-label="Thông tin bảo mật">
                <li className="pay-confirm__trust-item">
                  <span className="pay-confirm__trust-dot" aria-hidden="true" />
                  Thanh toán bảo mật
                </li>
                <li className="pay-confirm__trust-item">
                  <span className="pay-confirm__trust-dot" aria-hidden="true" />
                  Xác nhận tức thì
                </li>
                <li className="pay-confirm__trust-item">
                  <span className="pay-confirm__trust-dot" aria-hidden="true" />
                  Luồng demo — không kết nối cổng thật
                </li>
              </ul>

              <div className="pay-confirm__actions">
                <button
                  type="button"
                  className="pay-confirm__btn pay-confirm__btn--secondary"
                  onClick={closePaymentConfirm}
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  className="pay-confirm__btn pay-confirm__btn--primary"
                  onClick={handleConfirmOnlinePayment}
                >
                  Xác nhận thanh toán
                </button>
              </div>
            </>
          ) : null}

          {onlinePayPhase === "processing" ? (
            <div className="pay-confirm__phase pay-confirm__phase--processing" key="processing">
              <header className="pay-confirm__head pay-confirm__head--compact">
                <h2 id="pay-confirm-processing-title" className="pay-confirm__title pay-confirm__title--sm">
                  {processingCopyStep === 0 ? "Đang xác nhận giao dịch" : "Đang xử lý thanh toán"}
                </h2>
                <p className="pay-confirm__subtitle pay-confirm__subtitle--muted">
                  Giao dịch demo — an toàn và minh họa. Vui lòng không đóng cửa sổ này.
                </p>
              </header>

              <ol
                className={`pay-confirm__stepline pay-confirm__stepline--step-${processingCopyStep}`}
                aria-label="Tiến trình"
              >
                <li className="pay-confirm__step pay-confirm__step--done">
                  <span className="pay-confirm__step-dot" aria-hidden="true" />
                  <span className="pay-confirm__step-label">Xác nhận thanh toán</span>
                </li>
                <li
                  className={`pay-confirm__step${
                    processingCopyStep === 0 ? " pay-confirm__step--active" : " pay-confirm__step--done"
                  }`}
                >
                  <span className="pay-confirm__step-dot" aria-hidden="true" />
                  <span className="pay-confirm__step-label">Xác nhận giao dịch</span>
                </li>
                <li
                  className={`pay-confirm__step${
                    processingCopyStep === 1 ? " pay-confirm__step--active" : ""
                  }`}
                >
                  <span className="pay-confirm__step-dot" aria-hidden="true" />
                  <span className="pay-confirm__step-label">Hoàn tất</span>
                </li>
              </ol>

              <div className="pay-confirm__process-visual" aria-hidden="true">
                <div className="pay-confirm__orbit">
                  <div className="pay-confirm__orbit-ring" />
                  <div className="pay-confirm__orbit-core">
                    <span className="pay-confirm__orbit-icon">{selectedMockChannel.icon}</span>
                  </div>
                </div>
                <div className="pay-confirm__bars">
                  <span className="pay-confirm__bar" />
                  <span className="pay-confirm__bar" />
                  <span className="pay-confirm__bar" />
                </div>
              </div>

              <div className="pay-confirm__process-copy">
                <p className="pay-confirm__process-primary">
                  {processingCopyStep === 0
                    ? "Đang xác nhận giao dịch..."
                    : "Đang xử lý thanh toán..."}
                </p>
                <p className="pay-confirm__process-secondary">
                  {processingCopyStep === 0
                    ? "Đang kiểm tra và ghi nhận giao dịch trên hệ thống demo..."
                    : "Đang khóa số tiền và hoàn tất thanh toán mô phỏng — vui lòng chờ thêm giây lát."}
                </p>
              </div>
            </div>
          ) : null}

          {onlinePayPhase === "success" && pendingPaymentNav ? (
            <div className="pay-confirm__phase pay-confirm__phase--success" key="success">
              <div className="pay-confirm__success-visual" aria-hidden="true">
                <svg className="pay-confirm__success-svg" viewBox="0 0 64 64" role="img">
                  <circle className="pay-confirm__success-circle-bg" cx="32" cy="32" r="28" />
                  <path
                    className="pay-confirm__success-check"
                    pathLength="100"
                    fill="none"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20 33 L28 41 L44 25"
                  />
                </svg>
              </div>
              <h2 id="pay-confirm-success-title" className="pay-confirm__success-title">
                Thanh toán thành công
              </h2>
              <p className="pay-confirm__success-sub">Đơn hàng của bạn đã được xác nhận</p>

              <div className="pay-confirm__success-summary">
                <div className="pay-confirm__success-row">
                  <span className="pay-confirm__success-k">Mã đơn (tham chiếu)</span>
                  <span
                    className="pay-confirm__success-v pay-confirm__success-v--mono"
                    title={pendingPaymentNav.orderId != null ? String(pendingPaymentNav.orderId) : ""}
                  >
                    {pendingPaymentNav.orderId != null
                      ? String(pendingPaymentNav.orderId).slice(0, 10) + "…"
                      : "—"}
                  </span>
                </div>
                <div className="pay-confirm__success-row">
                  <span className="pay-confirm__success-k">Kênh thanh toán</span>
                  <span className="pay-confirm__success-v">
                    {pendingPaymentNav.channelLabel || selectedMockChannel.label}
                  </span>
                </div>
                <div className="pay-confirm__success-row pay-confirm__success-row--amount">
                  <span className="pay-confirm__success-k">Số tiền</span>
                  <span className="pay-confirm__success-amount">
                    {formatMoney(pendingPaymentNav.total)}{" "}
                    <span className="pay-confirm__currency">VND</span>
                  </span>
                </div>
              </div>

              <p className="pay-confirm__success-redirect">
                Bạn sẽ được chuyển sang trang biên lai thanh toán trong giây lát...
              </p>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="order-page order-page--state">
          <div className="order-page__state-card">
            <p className="order-page__state-text">Dang tai...</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  if (!lineItems.length && !holdOnlineCheckoutUi) {
    return (
      <>
        <Header />
        <div className="order-page order-page--state">
          <div className="order-page__state-card order-page__state-card--empty">
            <h2 className="order-page__state-title">Khong co don hang nao</h2>
            <p className="order-page__state-desc">Hay chon san pham tu gio hang de tiep tuc.</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      {holdOnlineCheckoutUi && !lineItems.length ? (
        <main className="order-page order-page--checkout-hold" aria-label="Đang hoàn tất thanh toán online">
          <div className="order-page__checkout-hold-bg" aria-hidden="true" />
        </main>
      ) : (
      <div className="order-body order-page">
        <div className="order-page__inner">
          <div className="order-layout">
            <section className="order-details" aria-label="San pham trong don">
              <header className="order-details__head">
                <span className="order-details__badge">San pham da chon</span>
                <span className="order-details__count">{lineItems.length} mat hang</span>
              </header>
              {lineItems.map((item, index) => (
                <article key={item.id} className="order-item">
                  <div className="order-item__media">
                    <div className="order-item__thumb">
                      <img src={item.image} alt={item.title || "San pham"} className="order-item-image" />
                    </div>
                  </div>
                  <div className="order-item__body">
                    <div className="order-item__header-block">
                      <h3 className="order-item__title">{formatTitle(item.title)}</h3>
                      <div className="order-item__meta">
                        <div className="order-item__price-row">
                          <span className="order-item__price-label">Don gia</span>
                          <span className="order-item__price">
                            <strong className="order-item__price-num">
                              {formatMoney(item.price)}
                              <span className="order-item__currency"> VND</span>
                            </strong>
                          </span>
                        </div>
                        <span className="order-item__discount-note">Giam gia: {item.discountPercent}%</span>
                      </div>
                    </div>
                    <div className="order-item__subtotal" aria-label="Thanh tien dong">
                      <span className="order-item__subtotal-label">Thanh tien</span>
                      <span className="order-item__subtotal-value">
                        {formatMoney(item.price * item.quantity)} <span className="order-item__currency">VND</span>
                      </span>
                    </div>
                    <div className="order-item__actions">
                      <div className="order-item__stepper" role="group" aria-label="So luong">
                        <button
                          type="button"
                          className="order-item__qty-btn"
                          onClick={() => handleDecreaseQuantity(index)}
                          aria-label="Giam so luong"
                        >
                          −
                        </button>
                        <span className="order-item__qty" aria-live="polite">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          className="order-item__qty-btn"
                          onClick={() => handleIncreaseQuantity(index)}
                          aria-label="Tang so luong"
                        >
                          +
                        </button>
                      </div>
                      <button type="button" className="order-item__remove" onClick={() => handleDelete(index)}>
                        <span className="order-item__remove-icon" aria-hidden="true">
                          ×
                        </span>
                        <span className="order-item__remove-label">Xoa</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <aside className="user-info user-panel" aria-label="Thong tin giao hang">
              <h2 className="user-panel__title">Thong tin nguoi dung</h2>
              <p className="user-panel__lead">Dien thong tin nhan hang chinh xac de giao hang nhanh hon.</p>

              <div className="user-panel__field">
                <label className="user-panel__label" htmlFor="order-name">
                  Ten
                </label>
                <input
                  id="order-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="user-info-input user-panel__input"
                  required
                  autoComplete="name"
                />
              </div>
              <div className="user-panel__field">
                <label className="user-panel__label" htmlFor="order-email">
                  Email
                </label>
                <input
                  id="order-email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="user-info-input user-panel__input"
                  required
                  autoComplete="email"
                />
              </div>
              <div className="user-panel__field">
                <label className="user-panel__label" htmlFor="order-phone">
                  So dien thoai
                </label>
                <input
                  id="order-phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="user-info-input user-panel__input"
                  required
                  autoComplete="tel"
                />
              </div>
              <div className="user-panel__field">
                <label className="user-panel__label" htmlFor="order-province">
                  Địa chỉ giao hàng
                </label>
                <div className="user-panel__address-card">
                  <p className="user-panel__address-lead">
                    Chọn khu vực giao hàng theo thứ tự để hệ thống ghi nhận địa chỉ chính xác hơn.
                  </p>
                  <div className="user-panel__address-grid">
                    <div className="user-panel__address-cell">
                      <label className="user-panel__sublabel" htmlFor="order-province">
                        Tỉnh / Thành phố
                      </label>
                      <select
                        id="order-province"
                        value={provinceCode}
                        onChange={(e) => handleProvinceChange(e.target.value)}
                        className="user-info-input user-panel__input user-panel__select"
                        required
                      >
                        <option value="">Chọn Tỉnh / Thành phố</option>
                        {VN_LOCATION_DATA.map((province) => (
                          <option key={province.code} value={province.code}>
                            {province.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="user-panel__address-cell">
                      <label className="user-panel__sublabel" htmlFor="order-district">
                        Quận / Huyện
                      </label>
                      <select
                        id="order-district"
                        value={districtCode}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        className="user-info-input user-panel__input user-panel__select"
                        disabled={!provinceCode}
                        required
                      >
                        <option value="">{provinceCode ? "Chọn Quận / Huyện" : "Chọn Tỉnh / Thành trước"}</option>
                        {districtOptions.map((district) => (
                          <option key={district.code} value={district.code}>
                            {district.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="user-panel__address-cell">
                      <label className="user-panel__sublabel" htmlFor="order-ward">
                        Phường / Xã
                      </label>
                      <select
                        id="order-ward"
                        value={wardName}
                        onChange={(e) => {
                          setWardName(e.target.value);
                          setAddressError("");
                        }}
                        className="user-info-input user-panel__input user-panel__select"
                        disabled={!districtCode}
                        required
                      >
                        <option value="">{districtCode ? "Chọn Phường / Xã" : "Chọn Quận / Huyện trước"}</option>
                        {wardOptions.map((ward) => (
                          <option key={ward} value={ward}>
                            {ward}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="user-panel__address-cell user-panel__address-cell--detail">
                      <label className="user-panel__sublabel" htmlFor="order-address-detail">
                        Địa chỉ chi tiết
                      </label>
                      <input
                        id="order-address-detail"
                        type="text"
                        value={addressDetail}
                        onChange={(e) => {
                          setAddressDetail(e.target.value);
                          setAddressError("");
                        }}
                        className="user-info-input user-panel__input"
                        placeholder="Số nhà, tên đường, tòa nhà..."
                        required
                        autoComplete="street-address"
                      />
                    </div>
                  </div>
                  <div className="user-panel__address-preview" aria-live="polite">
                    <span className="user-panel__address-preview-label">Địa chỉ giao hàng:</span>
                    <span className="user-panel__address-preview-value">
                      {composedShippingAddress || "Vui lòng chọn khu vực và nhập địa chỉ chi tiết"}
                    </span>
                  </div>
                  {addressError ? (
                    <p className="user-panel__address-error" role="alert">
                      {addressError}
                    </p>
                  ) : null}
                </div>
              </div>

              <div
                className={`user-panel__voucher user-panel__voucher-surface${
                  voucherInvalid ? " user-panel__voucher-surface--invalid" : ""
                }${voucherValid && !voucherError ? " user-panel__voucher-surface--applied" : ""}`}
                data-voucher-ui={
                  voucherInvalid ? "invalid" : voucherValid && !voucherError ? "applied" : "default"
                }
              >
                <div className="user-panel__voucher-head">
                  <label className="user-panel__label" htmlFor="order-voucher">
                    Voucher
                  </label>
                  <p className="user-panel__voucher-hint">
                    Nhập mã giảm giá (nếu có), sau đó chọn Áp dụng.
                  </p>
                </div>
                <div
                  className={`user-panel__voucher-field-wrap${
                    voucherInvalid ? " user-panel__voucher-field-wrap--error" : ""
                  }`}
                >
                  <div className="user-panel__voucher-row">
                    <input
                      id="order-voucher"
                      type="text"
                      value={voucherInput}
                      className={`user-info-input user-panel__input user-panel__input--voucher${
                        voucherInvalid ? " user-panel__input--voucher-invalid" : ""
                      }`}
                      onChange={(e) => {
                        const next = e.target.value;
                        setVoucherInput(next);
                        setVoucherError("");
                        const t = next.trim();
                        if (!t) {
                          setAppliedVoucher(null);
                        } else if (
                          appliedVoucher &&
                          normalizeVoucherCode(t) !== normalizeVoucherCode(appliedVoucher.code)
                        ) {
                          setAppliedVoucher(null);
                        }
                      }}
                      placeholder="Nhập mã giảm giá"
                      autoComplete="off"
                      spellCheck={false}
                      aria-invalid={voucherInvalid}
                      aria-describedby={
                        [
                          voucherError ? "order-voucher-error" : null,
                          voucherValid && !voucherError ? "order-voucher-success" : null,
                        ]
                          .filter(Boolean)
                          .join(" ") || undefined
                      }
                    />
                    <button
                      type="button"
                      className="user-panel__voucher-btn"
                      onClick={handleVoucher}
                    >
                      Áp dụng
                    </button>
                  </div>
                </div>
                {voucherError ? (
                  <div
                    id="order-voucher-error"
                    className="user-panel__voucher-feedback user-panel__voucher-feedback--error"
                    role="alert"
                  >
                    <span className="user-panel__voucher-feedback-icon" aria-hidden="true">
                      <svg viewBox="0 0 20 20" width="18" height="18" focusable="false">
                        <path
                          fill="currentColor"
                          d="M10 2a8 8 0 108 8 8 8 0 00-8-8zm.75 12h-1.5v-1.5h1.5V14zm0-8.25h-1.5v5.25h1.5V5.75z"
                        />
                      </svg>
                    </span>
                    <p className="user-panel__voucher-feedback-text">{voucherError}</p>
                  </div>
                ) : null}
                {voucherValid && !voucherError ? (
                  <div
                    id="order-voucher-success"
                    className="user-panel__voucher-feedback user-panel__voucher-feedback--success"
                    role="status"
                  >
                    <div className="user-panel__voucher-success-head">
                      <span className="user-panel__voucher-chip">Đã áp dụng</span>
                      <span className="user-panel__voucher-code-pill">{appliedVoucher.code}</span>
                    </div>
                    <p className="user-panel__voucher-success-line">
                      <span className="user-panel__voucher-success-label">Giảm giá</span>
                      <span className="user-panel__voucher-success-value">
                        −{formatMoney(voucherDiscount)} VND
                      </span>
                    </p>
                  </div>
                ) : null}
              </div>

              <div
                className={`payment-method${
                  isOnlinePayment ? " payment-method--mode-online" : " payment-method--mode-cod"
                }`}
                data-checkout-pay-mode={isOnlinePayment ? "online" : "cod"}
              >
                <div className="payment-method__head">
                  <span className="payment-method__step-tag" aria-hidden="true">
                    Bước 1
                  </span>
                  <h3 className="payment-method__title">Phương thức thanh toán</h3>
                  <p className="payment-method__subtitle">
                    Chọn thanh toán khi nhận hàng hoặc thanh toán trực tuyến (luồng demo, không trừ tiền
                    thật).
                  </p>
                </div>
                <div className="payment-method__options" role="radiogroup" aria-label="Phương thức thanh toán">
                  <label className="payment-method__option">
                    <input
                      type="radio"
                      id="cod"
                      name="payment"
                      value="cod"
                      checked={selectedPayment === "cod"}
                      onChange={(e) => setSelectedPayment(e.target.value)}
                    />
                    <span className="payment-method__text">
                      Thanh toán khi nhận hàng (COD)
                    </span>
                  </label>
                  <label className="payment-method__option">
                    <input
                      type="radio"
                      id="online"
                      name="payment"
                      value="online"
                      checked={selectedPayment === "online"}
                      onChange={(e) => setSelectedPayment(e.target.value)}
                    />
                    <span className="payment-method__text">Thanh toán online</span>
                  </label>
                </div>

                {selectedPayment === "cod" ? (
                  <p className="payment-method__hint payment-method__hint--cod">
                    Bạn sẽ thanh toán khi nhận hàng. Sau khi đặt, đơn được ghi nhận và giao theo địa chỉ đã
                    nhập.
                  </p>
                ) : (
                  <div className="payment-online-panel" role="region" aria-label="Cấu hình thanh toán online">
                    <div className="payment-online-panel__stepbar" aria-hidden="true">
                      <span className="payment-online-panel__step-pill">Bước 2</span>
                      <span className="payment-online-panel__step-line" />
                    </div>
                    <div className="payment-online-panel__head">
                      <div>
                        <p className="payment-online-panel__eyebrow">Kênh thanh toán (demo)</p>
                        <p className="payment-online-panel__title">Chọn cách bạn muốn thanh toán</p>
                        <p className="payment-online-panel__lead">
                          Đây chỉ là lựa chọn giao diện để minh họa. Bước xác nhận cuối cùng sẽ mở sau khi
                          bạn nhấn nút ở phần tóm tắt bên dưới.
                        </p>
                      </div>
                      <div className="payment-online-panel__badges" aria-hidden="true">
                        <span className="payment-online-panel__badge">Luồng demo</span>
                        <span className="payment-online-panel__badge payment-online-panel__badge--gold">
                          Không cổng thật
                        </span>
                      </div>
                    </div>
                    <p className="payment-online-panel__pick-label">Chọn một kênh (ô vuông có thể bấm)</p>
                    <div className="payment-online-panel__grid" role="group" aria-label="Kênh thanh toán demo">
                      {MOCK_PAY_CHANNELS.map((ch) => (
                        <button
                          key={ch.id}
                          type="button"
                          className={`payment-online-panel__tile${
                            mockPayChannel === ch.id ? " payment-online-panel__tile--active" : ""
                          }`}
                          onClick={() => setMockPayChannel(ch.id)}
                          aria-pressed={mockPayChannel === ch.id}
                        >
                          <span className="payment-online-panel__tile-icon" aria-hidden="true">
                            {ch.icon}
                          </span>
                          <span className="payment-online-panel__tile-label">{ch.label}</span>
                        </button>
                      ))}
                    </div>
                    <ul className="payment-online-panel__trust" aria-label="Lưu ý an toàn (demo)">
                      <li>Giao dịch được mã hóa trong luồng demo — không kết nối cổng thanh toán thật.</li>
                      <li>Hệ thống không lưu thông tin thẻ, ví hoặc mật khẩu thanh toán.</li>
                      <li>Bạn xác nhận thanh toán một lần nữa trong cửa sổ tiếp theo trước khi hoàn tất đơn.</li>
                    </ul>
                    <p className="payment-online-panel__mock-note">
                      Minh họa giao diện — không trừ tiền thật. Luồng đặt hàng và API giữ nguyên như phiên bản
                      hiện tại.
                    </p>
                  </div>
                )}
              </div>
            </aside>
          </div>

          <section
            className={`order-summary${
              isOnlinePayment ? " order-summary--online-pay" : " order-summary--cod-pay"
            }`}
            aria-label={isOnlinePayment ? "Xác nhận thanh toán" : "Tóm tắt đơn hàng"}
          >
            <div className="order-summary__accent" aria-hidden="true" />
            <div className="order-summary__inner">
              <div className="order-summary__copy">
                <div className="order-summary__head">
                  <span className="order-summary__step-tag" aria-hidden="true">
                    {isOnlinePayment ? "Bước 3" : "Bước cuối"}
                  </span>
                  <h2 className="order-summary__heading">
                    {isOnlinePayment ? "Tóm tắt & xác nhận thanh toán" : "Tóm tắt đơn hàng"}
                  </h2>
                  <p className="order-summary__sub">
                    {isOnlinePayment
                      ? "Kiểm tra phương thức, kênh demo và tổng tiền trước khi mở bước xác nhận thanh toán."
                      : "Kiểm tra giá và thông tin giao hàng trước khi đặt hàng."}
                  </p>
                  {isOnlinePayment ? (
                    <div className="order-summary__trust-strip" aria-hidden="true">
                      <span className="order-summary__trust-pill">Xác nhận hai lần (demo)</span>
                      <span className="order-summary__trust-pill order-summary__trust-pill--emph">
                        Không trừ tiền thật
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="order-summary__rows">
                  <div className="order-summary__row order-summary__row--pay-method">
                    <span className="order-summary__label">Phương thức thanh toán</span>
                    <span className="order-summary__value order-summary__value--strong">
                      {isOnlinePayment ? "Thanh toán online (demo)" : "Thanh toán khi nhận hàng (COD)"}
                    </span>
                  </div>
                  {isOnlinePayment ? (
                    <div className="order-summary__row order-summary__row--pay-channel">
                      <span className="order-summary__label">Kênh đã chọn (demo)</span>
                      <span className="order-summary__value order-summary__value--strong">
                        {selectedMockChannel.label}
                      </span>
                    </div>
                  ) : null}
                  <div className="order-summary__row">
                    <span className="order-summary__label">Tổng số sản phẩm</span>
                    <span className="order-summary__value">{lineItems.length}</span>
                  </div>
                  <div className="order-summary__row">
                    <span className="order-summary__label">Tạm tính</span>
                    <span className="order-summary__value">{formatMoney(subtotal)} VND</span>
                  </div>
                  {voucherDiscount > 0 ? (
                    <div className="order-summary__row order-summary__row--discount">
                      <span className="order-summary__label">Giảm giá từ voucher</span>
                      <span className="order-summary__value order-summary__value--discount">
                        −{formatMoney(voucherDiscount)} VND
                      </span>
                    </div>
                  ) : null}
                  {isOnlinePayment ? (
                    <>
                      <div className="order-summary__row order-summary__row--soft">
                        <span className="order-summary__label">Phí thanh toán</span>
                        <span className="order-summary__value order-summary__value--muted">0 VND</span>
                      </div>
                      <div className="order-summary__row order-summary__row--soft order-summary__row--trust-text">
                        <span className="order-summary__label order-summary__label--trust">
                          Giao dịch được mã hóa (demo)
                        </span>
                        <span className="order-summary__value order-summary__value--ok">✓</span>
                      </div>
                    </>
                  ) : null}
                  <div
                    className={`order-summary__row order-summary__row--total${
                      isOnlinePayment ? " order-summary__row--total-pay" : ""
                    }`}
                  >
                    <span className="order-summary__label">
                      {isOnlinePayment ? "Tổng thanh toán" : "Tổng giá trị"}
                    </span>
                    <span className="order-summary__total">{formatMoney(total)} VND</span>
                  </div>
                  <div
                    className={`order-summary__readiness${
                      canSubmitCheckout
                        ? " order-summary__readiness--ok"
                        : " order-summary__readiness--pending"
                    }`}
                    role="status"
                  >
                    {canSubmitCheckout
                      ? isOnlinePayment
                        ? "Sẵn sàng: có thể mở bước xác nhận thanh toán online."
                        : "Sẵn sàng: có thể đặt hàng."
                      : "Chưa đủ điều kiện: hoàn thành địa chỉ, thông tin nhận hàng và voucher (nếu nhập)."}
                  </div>
                </div>
              </div>
              <div
                className={`order-summary__cta-wrap${
                  isOnlinePayment ? " order-summary__cta-wrap--online" : ""
                }`}
              >
                <p className="order-summary__cta-note">
                  {isOnlinePayment
                    ? "Mở cửa sổ xác nhận thanh toán demo — đơn chỉ được ghi nhận sau khi bạn xác nhận ở bước đó."
                    : "Ghi nhận đơn COD và chuyển tới trang cá nhân sau khi thành công."}
                </p>
                <button
                  type="button"
                  className={`order-summary__cta${
                    isOnlinePayment ? " order-summary__cta--online-pay" : ""
                  }`}
                  onClick={handleBuy}
                  disabled={!canSubmitCheckout}
                  title={
                    canSubmitCheckout
                      ? undefined
                      : "Vui lòng đăng nhập, có sản phẩm, điền đủ thông tin giao hàng và xử lý voucher (nếu có)."
                  }
                >
                  {isOnlinePayment ? "Tiếp tục thanh toán" : "Đặt hàng"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
      )}

      {renderPaymentConfirmModal()}

      <Footer />
    </>
  );
};

export default Order;
