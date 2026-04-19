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
import {
  listProvincesV2,
  listWardsByProvinceV2,
} from "../../api/addressApi";

/** Available online payment channels for the current gateway integration. */
const ONLINE_PAY_CHANNELS = [
  {
    id: "vnpay",
    icon: "V",
    label: "VNPay Sandbox",
    providerLabel: "VNPay",
    redirectLabel: "VNPay sandbox",
  },
  {
    id: "momo",
    icon: "MoMo",
    label: "MoMo Test",
    providerLabel: "MoMo",
    redirectLabel: "MoMo test",
  },
];

/** Minimum time the processing UI is shown (feels intentional; API may be faster). */
const ONLINE_MIN_PROCESS_MS = 1400;
/** Success screen duration before redirecting to the provider page. */
const ONLINE_SUCCESS_HOLD_MS = 2400;

const Order = () => {
  const navigate = useNavigate();
  const { user, setUser } = useUser();
  const savedShipping = user?.shippingAddress || {};

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState("cod");
  const [selectedOnlineProvider, setSelectedOnlineProvider] = useState("vnpay");
  const [name, setName] = useState(savedShipping.name || user?.name || "");
  const [email, setEmail] = useState(savedShipping.email || user?.email || "");
  const [phone, setPhone] = useState(savedShipping.phone || user?.phone || user?.sdt || "");
  const [provinceCode, setProvinceCode] = useState(savedShipping.provinceCode || "");
  const [wardCode, setWardCode] = useState(savedShipping.wardCode || "");
  const [addressDetail, setAddressDetail] = useState(
    savedShipping.addressDetail || user?.address || ""
  );
  const [addressError, setAddressError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [provinces, setProvinces] = useState([]);
  const [wardOptions, setWardOptions] = useState([]);
  const [provinceLoading, setProvinceLoading] = useState(false);
  const [wardLoading, setWardLoading] = useState(false);
  const [voucherInput, setVoucherInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [voucherError, setVoucherError] = useState("");
  /** Online-only confirmation step before order API calls. */
  const [paymentConfirmOpen, setPaymentConfirmOpen] = useState(false);
  /** idle: confirm form; processing: API + min time; success: brief hold before redirect */
  const [onlinePayPhase, setOnlinePayPhase] = useState("idle");
  /** Populated after successful online API; drives redirect to the provider page. */
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

  useEffect(() => {
    let active = true;

    const loadProvinces = async () => {
      setProvinceLoading(true);
      setLocationError("");

      try {
        const items = await listProvincesV2();
        if (!active) return;
        setProvinces(items);
      } catch (error) {
        console.error("Loi khi lay danh sach tinh/thanh:", error);
        if (!active) return;
        setProvinces([]);
        setLocationError("Không thể tải danh sách tỉnh/thành. Vui lòng thử lại.");
      } finally {
        if (active) {
          setProvinceLoading(false);
        }
      }
    };

    loadProvinces();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    if (!provinceCode) {
      setWardOptions([]);
      setWardLoading(false);
      return () => {
        active = false;
      };
    }

    const loadWards = async () => {
      setLocationError("");
      setWardLoading(true);

      try {
        const items = await listWardsByProvinceV2(provinceCode);
        if (!active) return;
        setWardOptions(items);
      } catch (error) {
        console.error("Loi khi lay danh sach phuong/xa:", error);
        if (!active) return;
        setWardOptions([]);
        setLocationError("Không thể tải phường/xã. Vui lòng chọn lại tỉnh/thành.");
      } finally {
        if (active) {
          setWardLoading(false);
        }
      }
    };

    loadWards();

    return () => {
      active = false;
    };
  }, [provinceCode]);

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
  const selectedOnlineChannel = useMemo(
    () =>
      ONLINE_PAY_CHANNELS.find((channel) => channel.id === selectedOnlineProvider) ||
      ONLINE_PAY_CHANNELS[0],
    [selectedOnlineProvider]
  );

  const canSubmitCheckout = useMemo(() => {
    const token = localStorage.getItem("token");
    if (!token) return false;
    if (!lineItems.length) return false;
    if (!name.trim() || !email.trim() || !phone.trim()) return false;
    if (!provinceCode || !wardCode || !addressDetail.trim()) return false;
    if (isVoucherInputBlockingCheckout({ voucherInput, appliedVoucher })) return false;
    return true;
  }, [lineItems, name, email, phone, provinceCode, wardCode, addressDetail, voucherInput, appliedVoucher]);
  const selectedProvince = useMemo(
    () => provinces.find((province) => String(province.code) === String(provinceCode)) || null,
    [provinces, provinceCode]
  );
  const selectedWard = useMemo(
    () => wardOptions.find((ward) => String(ward.code) === String(wardCode)) || null,
    [wardOptions, wardCode]
  );
  const composedShippingAddress = useMemo(() => {
    const parts = [
      addressDetail.trim(),
      selectedWard?.name,
      selectedProvince?.name,
    ].filter(Boolean);
    return parts.join(", ");
  }, [addressDetail, selectedWard?.name, selectedProvince?.name]);

  const formatMoney = (money) =>
    new Intl.NumberFormat("vi-VN").format(Number(money) || 0);

  const formatTitle = (title = "") => {
    if (title.length > 30) {
      return `${title.slice(0, 30)}...`;
    }
    return title;
  };

  const paymentChannelIconClass = useCallback(
    (channel) =>
      channel?.icon && String(channel.icon).length > 1
        ? "payment-online-panel__tile-icon payment-online-panel__tile-icon--wordmark"
        : "payment-online-panel__tile-icon",
    []
  );

  const confirmIconClass = useCallback(
    (channel) =>
      channel?.icon && String(channel.icon).length > 1
        ? "pay-confirm__method-icon pay-confirm__method-icon--wordmark"
        : "pay-confirm__method-icon",
    []
  );

  const orbitIconClass = useCallback(
    (channel) =>
      channel?.icon && String(channel.icon).length > 1
        ? "pay-confirm__orbit-icon pay-confirm__orbit-icon--wordmark"
        : "pay-confirm__orbit-icon",
    []
  );

  const persistShippingDraft = useCallback(() => {
    if (!user) return;

    const nextShippingAddress = {
      name,
      email,
      phone,
      provinceCode,
      provinceName: selectedProvince?.name || "",
      wardCode,
      wardName: selectedWard?.name || "",
      addressDetail,
      fullAddress: composedShippingAddress,
    };

    const prevShippingAddress = user?.shippingAddress || {};
    const hasChanged =
      prevShippingAddress.name !== nextShippingAddress.name ||
      prevShippingAddress.email !== nextShippingAddress.email ||
      prevShippingAddress.phone !== nextShippingAddress.phone ||
      prevShippingAddress.provinceCode !== nextShippingAddress.provinceCode ||
      prevShippingAddress.provinceName !== nextShippingAddress.provinceName ||
      prevShippingAddress.wardCode !== nextShippingAddress.wardCode ||
      prevShippingAddress.wardName !== nextShippingAddress.wardName ||
      prevShippingAddress.addressDetail !== nextShippingAddress.addressDetail ||
      prevShippingAddress.fullAddress !== nextShippingAddress.fullAddress;

    if (!hasChanged) return;

    setUser({
      ...user,
      address: composedShippingAddress || user?.address || "",
      shippingAddress: nextShippingAddress,
    });
  }, [
    user,
    setUser,
    name,
    email,
    phone,
    provinceCode,
    wardCode,
    addressDetail,
    selectedProvince?.name,
    selectedWard?.name,
    composedShippingAddress,
  ]);

  useEffect(() => {
    persistShippingDraft();
  }, [persistShippingDraft]);

  const updateOrderProducts = (next) => {
    setUser({
      ...user,
      order: {
        ...(user?.order || {}),
        products: next,
      },
    });
  };

  const clearVoucherState = () => {
    setAppliedVoucher(null);
    setVoucherError("");
  };

  const handleProvinceChange = (nextCode) => {
    setProvinceCode(nextCode);
    setWardCode("");
    setAddressError("");
    setLocationError("");
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
    if (!provinceCode || !wardCode || !addressDetail.trim()) {
      setAddressError("Vui lòng chọn đầy đủ Tỉnh/Thành, Phường/Xã và nhập địa chỉ chi tiết.");
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
    wardCode,
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

    setUser({
      ...user,
      cart: (user?.cart || []).filter((item) => !ids.includes(item.product)),
      address: composedShippingAddress,
      shippingAddress: {
        ...(user?.shippingAddress || {}),
        name,
        email,
        phone,
        provinceCode,
        provinceName: selectedProvince?.name || "",
        wardCode,
        wardName: selectedWard?.name || "",
        addressDetail,
        fullAddress: composedShippingAddress,
      },
      order: { products: [] },
    });

    return { orderId };
  }, [
    user,
    user?._id,
    name,
    phone,
    email,
    provinceCode,
    wardCode,
    addressDetail,
    selectedProvince?.name,
    selectedWard?.name,
    composedShippingAddress,
    selectedPayment,
    lineItems,
    appliedVoucher?.code,
    setUser,
  ]);

  /** Online: create order first, then create payment and receive provider checkout URL. */
  const finalizeOnlinePaymentApi = useCallback(async () => {
    const { orderId } = await submitOrderCore();
    const paymentRes = await createPayment({
      orderId,
      method: "online",
      provider: selectedOnlineChannel.id,
    });
    const paymentId =
      paymentRes?.payment?._id ||
      paymentRes?.item?._id ||
      paymentRes?.transactionId;
    const checkoutUrl = paymentRes?.checkoutUrl || paymentRes?.data?.checkoutUrl;

    if (!checkoutUrl) {
      throw new Error("Payment checkout URL not returned");
    }

    return {
      total,
      orderId,
      paymentId,
      checkoutUrl,
      channelLabel: selectedOnlineChannel.label,
      provider: paymentRes?.provider || selectedOnlineChannel.id,
    };
  }, [submitOrderCore, total, selectedOnlineChannel]);

  /** COD only; online uses finalizeOnlinePaymentApi from the confirmation modal. */
  const completeCheckout = useCallback(async () => {
    const { orderId } = await submitOrderCore();
    await createPayment({ orderId, method: "cod" });
    alert("Dat hang thanh cong!");
    navigate("/profile");
  }, [submitOrderCore, navigate]);

  /** COD: validate and submit immediately. Online: open confirmation modal first. */
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
      window.location.assign(pendingPaymentNav.checkoutUrl);
    }, ONLINE_SUCCESS_HOLD_MS);
    return () => window.clearTimeout(id);
  }, [onlinePayPhase, pendingPaymentNav]);

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
                  Bạn đang ở bước xác nhận cuối cùng. Hệ thống sẽ tạo giao dịch và chuyển bạn sang{" "}
                  {selectedOnlineChannel.redirectLabel} để hoàn tất thanh toán.
                </p>
              </header>

              <div className="pay-confirm__method-card">
                <div className="pay-confirm__method-visual" aria-hidden="true">
                  <span className={confirmIconClass(selectedOnlineChannel)}>
                    {selectedOnlineChannel.icon}
                  </span>
                </div>
                <div className="pay-confirm__method-copy">
                  <span className="pay-confirm__method-label">Kênh thanh toán</span>
                  <span className="pay-confirm__method-name">{selectedOnlineChannel.label}</span>
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
                  Chuyen huong den {selectedOnlineChannel.redirectLabel}
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
                  {processingCopyStep === 0 ? "Dang tao giao dich" : "Dang chuan bi chuyen huong"}
                </h2>
                <p className="pay-confirm__subtitle pay-confirm__subtitle--muted">
                  He thong dang ghi nhan don hang va khoi tao phien thanh toan{" "}
                  {selectedOnlineChannel.providerLabel}.
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
                    <span className={orbitIconClass(selectedOnlineChannel)}>
                      {selectedOnlineChannel.icon}
                    </span>
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
                    ? "Dang tao giao dich..."
                    : `Dang chuan bi chuyen huong den ${selectedOnlineChannel.providerLabel}...`}
                </p>
                <p className="pay-confirm__process-secondary">
                  {processingCopyStep === 0
                    ? "Dang kiem tra thong tin don hang va tao giao dich thanh toan..."
                    : `${selectedOnlineChannel.providerLabel} checkout URL da san sang. Trinh duyet se duoc mo trong giay lat.`}
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
                San sang chuyen sang {selectedOnlineChannel.providerLabel}
              </h2>
              <p className="pay-confirm__success-sub">Don hang da duoc tao va phien thanh toan da san sang</p>

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
                    {pendingPaymentNav.channelLabel || selectedOnlineChannel.label}
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
                Ban se duoc chuyen sang cong thanh toan {selectedOnlineChannel.providerLabel} trong giay lat...
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
            <p className="order-page__state-text">Đang tải...</p>
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
            <h2 className="order-page__state-title">Không có đơn hàng nào</h2>
            <p className="order-page__state-desc">Hãy chọn sản phẩm từ giỏ hàng để tiếp tục.</p>
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
            <section className="order-details" aria-label="Sản phẩm trong đơn">
              <header className="order-details__head">
                <span className="order-details__badge">Sản phẩm đã chọn</span>
                <span className="order-details__count">{lineItems.length} mặt hàng</span>
              </header>
              {lineItems.map((item, index) => (
                <article key={item.id} className="order-item">
                  <div className="order-item__media">
                    <div className="order-item__thumb">
                      <img src={item.image} alt={item.title || "Sản phẩm"} className="order-item-image" />
                    </div>
                  </div>
                  <div className="order-item__body">
                    <div className="order-item__header-block">
                      <h3 className="order-item__title">{formatTitle(item.title)}</h3>
                      <div className="order-item__meta">
                        <div className="order-item__price-row">
                          <span className="order-item__price-label">Đơn giá</span>
                          <span className="order-item__price">
                            <strong className="order-item__price-num">
                              {formatMoney(item.price)}
                              <span className="order-item__currency"> VND</span>
                            </strong>
                          </span>
                        </div>
                        <span className="order-item__discount-note">Giảm giá: {item.discountPercent}%</span>
                      </div>
                    </div>
                    <div className="order-item__subtotal" aria-label="Thành tiền dòng">
                      <span className="order-item__subtotal-label">Thành tiền</span>
                      <span className="order-item__subtotal-value">
                        {formatMoney(item.price * item.quantity)} <span className="order-item__currency">VND</span>
                      </span>
                    </div>
                    <div className="order-item__actions">
                      <div className="order-item__stepper" role="group" aria-label="Số lượng">
                        <button
                          type="button"
                          className="order-item__qty-btn"
                          onClick={() => handleDecreaseQuantity(index)}
                          aria-label="Giảm số lượng"
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
                          aria-label="Tăng số lượng"
                        >
                          +
                        </button>
                      </div>
                      <button type="button" className="order-item__remove" onClick={() => handleDelete(index)}>
                        <span className="order-item__remove-icon" aria-hidden="true">
                          ×
                        </span>
                        <span className="order-item__remove-label">Xóa</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <aside className="user-info user-panel" aria-label="Thông tin giao hàng">
              <h2 className="user-panel__title">Thông tin người dùng</h2>
              <p className="user-panel__lead">Điền thông tin nhận hàng chính xác để giao hàng nhanh hơn.</p>

              <div className="user-panel__field">
                <label className="user-panel__label" htmlFor="order-name">
                  Tên
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
                  Số điện thoại
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
                        disabled={provinceLoading}
                        required
                      >
                        <option value="">
                          {provinceLoading ? "Đang tải Tỉnh / Thành phố..." : "Chọn Tỉnh / Thành phố"}
                        </option>
                        {provinces.map((province) => (
                          <option key={province.code} value={province.code}>
                            {province.name}
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
                        value={wardCode}
                        onChange={(e) => {
                          setWardCode(e.target.value);
                          setAddressError("");
                          setLocationError("");
                        }}
                        className="user-info-input user-panel__input user-panel__select"
                        disabled={!provinceCode || wardLoading}
                        required
                      >
                        <option value="">
                          {!provinceCode
                            ? "Chọn Tỉnh / Thành trước"
                            : wardLoading
                              ? "Đang tải Phường / Xã..."
                              : "Chọn Phường / Xã"}
                        </option>
                        {wardOptions.map((ward) => (
                          <option key={ward.code ?? ward.name} value={ward.code ?? ward.name}>
                            {ward.name}
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
                          setLocationError("");
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
                  {!addressError && locationError ? (
                    <p className="user-panel__address-error" role="alert">
                      {locationError}
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
                    Chọn thanh toán khi nhận hàng hoặc thanh toán online qua VNPay sandbox hoặc MoMo.
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
                        <p className="payment-online-panel__eyebrow">Cong thanh toan</p>
                        <p className="payment-online-panel__title">
                          Thanh toan qua {selectedOnlineChannel.providerLabel}
                        </p>
                      </div>
                      <div className="payment-online-panel__badges" aria-hidden="true">
                        <span className="payment-online-panel__badge">
                          {selectedOnlineChannel.providerLabel}
                        </span>
                        <span className="payment-online-panel__badge payment-online-panel__badge--gold">
                          {selectedOnlineChannel.id === "momo" ? "Test" : "Sandbox"}
                        </span>
                      </div>
                    </div>
                    <p className="payment-online-panel__pick-label">Kenh duoc ho tro hien tai</p>
                    <div className="payment-online-panel__grid" role="group" aria-label="Kenh thanh toan online">
                      {ONLINE_PAY_CHANNELS.map((channel) => (
                        <button
                          key={channel.id}
                          type="button"
                          className={`payment-online-panel__tile${
                            selectedOnlineProvider === channel.id ? " payment-online-panel__tile--active" : ""
                          }`}
                          onClick={() => setSelectedOnlineProvider(channel.id)}
                          aria-pressed={selectedOnlineProvider === channel.id}
                        >
                          <span className={paymentChannelIconClass(channel)} aria-hidden="true">
                            {channel.icon}
                          </span>
                          <span className="payment-online-panel__tile-label">{channel.label}</span>
                        </button>
                      ))}
                    </div>
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
                      ? `Kiem tra phuong thuc, tong tien va mo phien thanh toan ${selectedOnlineChannel.providerLabel}.`
                      : "Kiểm tra giá và thông tin giao hàng trước khi đặt hàng."}
                  </p>
                  {isOnlinePayment ? (
                    <div className="order-summary__trust-strip" aria-hidden="true">
                      <span className="order-summary__trust-pill">
                        Redirect den {selectedOnlineChannel.providerLabel}
                      </span>
                      <span className="order-summary__trust-pill order-summary__trust-pill--emph">
                        {selectedOnlineChannel.id === "momo" ? "Test" : "Sandbox"}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="order-summary__rows">
                  <div className="order-summary__row order-summary__row--pay-method">
                    <span className="order-summary__label">Phương thức thanh toán</span>
                    <span className="order-summary__value order-summary__value--strong">
                      {isOnlinePayment
                        ? `Thanh toan online (${selectedOnlineChannel.providerLabel})`
                        : "Thanh toán khi nhận hàng (COD)"}
                    </span>
                  </div>
                  {isOnlinePayment ? (
                    <div className="order-summary__row order-summary__row--pay-channel">
                      <span className="order-summary__label">Kenh da chon</span>
                      <span className="order-summary__value order-summary__value--strong">
                        {selectedOnlineChannel.label}
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
                          Ket qua duoc doi soat qua callback
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
                        ? `San sang: co the tao giao dich va chuyen sang ${selectedOnlineChannel.providerLabel}.`
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
                    ? `Mo buoc xac nhan cuoi, sau do he thong se redirect sang ${selectedOnlineChannel.redirectLabel}.`
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
