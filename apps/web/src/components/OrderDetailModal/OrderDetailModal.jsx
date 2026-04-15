import React, { useEffect, useCallback, useState } from "react";
import "./OrderDetailModal.css";
import { getOrderById, requestOrderReturn } from "../../api/checkoutApi";
import OrderStatusBadge from "../OrderStatusBadge/OrderStatusBadge";
import { isReturnFlowStatus } from "../../utils/orderStatusLabel";

const formatMoney = (n) =>
  new Intl.NumberFormat("vi-VN").format(Number(n) || 0);

function formatPaymentMethod(m) {
  const v = String(m || "").toLowerCase();
  if (v === "cod") return "Thanh toán khi nhận hàng (COD)";
  if (v === "online") return "Thanh toán online";
  return m || "—";
}

function getShipping(order) {
  if (!order) return { name: "", phone: "", email: "", address: "" };
  return {
    name: order.shippingInfo?.name ?? order.name ?? "",
    phone: order.shippingInfo?.phone ?? order.phone ?? "",
    email: order.shippingInfo?.email ?? order.email ?? "",
    address: order.shippingInfo?.address ?? order.address ?? "",
  };
}

function getLineItems(order) {
  if (!order) return [];
  if (Array.isArray(order.items) && order.items.length) {
    return order.items;
  }
  if (Array.isArray(order.products) && order.products.length) {
    return order.products.map((p) => ({
      productId: p.productId,
      title: p.title,
      price: p.price,
      image: p.image,
      quantity: p.quantity,
    }));
  }
  return [];
}

function getTotals(order) {
  const subtotal = order?.totals?.subtotal ?? order?.subtotal ?? 0;
  const discount = order?.totals?.discount ?? order?.discount ?? 0;
  const total = order?.totals?.total ?? order?.total ?? 0;
  return { subtotal, discount, total };
}

/**
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   order: object | null;
 *   onOrdersInvalidate?: () => void;
 * }} props
 */
export default function OrderDetailModal({ open, onClose, order, onOrdersInvalidate }) {
  const [detail, setDetail] = useState(order);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnMsg, setReturnMsg] = useState("");

  const load = useCallback(async () => {
    if (!order?._id) {
      setDetail(order);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await getOrderById(String(order._id));
      const next = res?.order ?? res?.item ?? res;
      setDetail(next || order);
    } catch (e) {
      console.error(e);
      setError("Không tải được chi tiết đơn hàng.");
      setDetail(order);
    } finally {
      setLoading(false);
    }
  }, [order]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setDetail(order);
    setReturnReason("");
    setReturnMsg("");
    load();
  }, [open, order, load]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (!order?._id) return;
    const trimmed = returnReason.trim();
    if (!trimmed) {
      setReturnMsg("Vui lòng nhập lý do hoàn trả.");
      return;
    }
    setReturnSubmitting(true);
    setReturnMsg("");
    try {
      await requestOrderReturn(String(order._id), { reason: trimmed });
      setReturnMsg("Đã gửi yêu cầu hoàn trả. Cửa hàng sẽ xử lý sớm.");
      setReturnReason("");
      await load();
      onOrdersInvalidate?.();
    } catch (err) {
      const msg = err?.response?.data?.message;
      setReturnMsg(msg || "Không gửi được yêu cầu. Thử lại sau.");
    } finally {
      setReturnSubmitting(false);
    }
  };

  if (!open || !order) {
    return null;
  }

  const o = detail || order;
  const statusRaw = o.orderStatus ?? o.status;
  const ship = getShipping(o);
  const lines = getLineItems(o);
  const { subtotal, discount, total } = getTotals(o);
  const v = o.voucherInfo;
  const discAmount = Number(discount) || 0;
  const showReturnSection = isReturnFlowStatus(statusRaw);
  const canRequestReturn = String(statusRaw || "").toLowerCase() === "completed";

  return (
    <div
      className="order-detail-modal-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="order-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-detail-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="order-detail-modal__head">
          <div>
            <h2 id="order-detail-modal-title" className="order-detail-modal__title">
              Chi tiết đơn hàng
            </h2>
            <p className="order-detail-modal__id" title={String(o._id)}>
              Mã đơn: <strong>{String(o._id)}</strong>
            </p>
          </div>
          <button
            type="button"
            className="order-detail-modal__close"
            onClick={onClose}
            aria-label="Đóng"
          >
            ×
          </button>
        </header>

        <div className="order-detail-modal__body">
          {loading ? (
            <p className="order-detail-modal__loading">Đang tải…</p>
          ) : null}
          {error ? <p className="order-detail-modal__err">{error}</p> : null}

          <section className="order-detail-modal__card">
            <h3 className="order-detail-modal__card-title">Thông tin đơn hàng</h3>
            <div className="order-detail-modal__grid">
              <div className="order-detail-modal__field order-detail-modal__field--status">
                <span className="order-detail-modal__label">Trạng thái đơn</span>
                <OrderStatusBadge status={statusRaw} />
              </div>
              <div className="order-detail-modal__field">
                <span className="order-detail-modal__label">Ngày đặt</span>
                <span className="order-detail-modal__value">
                  {o.createdAt
                    ? new Date(o.createdAt).toLocaleString("vi-VN")
                    : "—"}
                </span>
              </div>
              <div className="order-detail-modal__field">
                <span className="order-detail-modal__label">Phương thức thanh toán</span>
                <span className="order-detail-modal__value">
                  {formatPaymentMethod(o.paymentMethod ?? o.type)}
                </span>
              </div>
            </div>
          </section>

          <section className="order-detail-modal__card">
            <h3 className="order-detail-modal__card-title">Thông tin giao hàng</h3>
            <div className="order-detail-modal__ship-lines">
              <p>
                <span className="order-detail-modal__mini-label">Người nhận</span>
                {ship.name || "—"}
              </p>
              <p>
                <span className="order-detail-modal__mini-label">Điện thoại</span>
                {ship.phone || "—"}
              </p>
              <p>
                <span className="order-detail-modal__mini-label">Email</span>
                {ship.email || "—"}
              </p>
              <p className="order-detail-modal__addr-block">
                <span className="order-detail-modal__mini-label">Địa chỉ</span>
                {ship.address || "—"}
              </p>
            </div>
          </section>

          <section className="order-detail-modal__card">
            <h3 className="order-detail-modal__card-title">Sản phẩm trong đơn</h3>
            <ul className="order-detail-modal__line-list">
              {lines.map((line, idx) => {
                const q = Number(line.quantity) || 0;
                const price = Number(line.price) || 0;
                const lineTotal = price * q;
                return (
                  <li key={`${line.productId}-${idx}`} className="order-detail-modal__line">
                    {line.image ? (
                      <img
                        src={line.image}
                        alt=""
                        className="order-detail-modal__thumb"
                      />
                    ) : (
                      <div className="order-detail-modal__thumb order-detail-modal__thumb--ph" />
                    )}
                    <div className="order-detail-modal__line-body">
                      <div className="order-detail-modal__line-title">
                        {line.title || "Sản phẩm"}
                      </div>
                      <div className="order-detail-modal__line-meta">
                        Số lượng: {q} · Đơn giá {formatMoney(price)} VND
                      </div>
                    </div>
                    <div className="order-detail-modal__line-sum">
                      {formatMoney(lineTotal)} VND
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {(showReturnSection || canRequestReturn) && (
            <section className="order-detail-modal__card order-detail-modal__card--return">
              <h3 className="order-detail-modal__card-title">Trạng thái hoàn trả</h3>
              {showReturnSection && (
                <>
                  <div className="order-detail-modal__return-status">
                    <OrderStatusBadge status={statusRaw} />
                  </div>
                  {o.returnRequestReason ? (
                    <div className="order-detail-modal__reason-box">
                      <span className="order-detail-modal__label">Lý do bạn đã gửi</span>
                      <p className="order-detail-modal__reason-text">
                        {o.returnRequestReason}
                      </p>
                      {o.returnRequestedAt ? (
                        <p className="order-detail-modal__reason-meta">
                          Gửi lúc{" "}
                          {new Date(o.returnRequestedAt).toLocaleString("vi-VN")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}
              {canRequestReturn && (
                <form className="order-detail-modal__return-form" onSubmit={handleSubmitReturn}>
                  <label className="order-detail-modal__label" htmlFor="order-return-reason">
                    Yêu cầu hoàn trả
                  </label>
                  <p className="order-detail-modal__hint">
                    Chỉ áp dụng khi đơn đã <strong>hoàn tất</strong>. Vui lòng mô tả ngắn gọn lý
                    do (sản phẩm lỗi, không đúng mô tả…).
                  </p>
                  <textarea
                    id="order-return-reason"
                    className="order-detail-modal__textarea"
                    rows={3}
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="Nhập lý do hoàn trả…"
                    maxLength={2000}
                  />
                  <div className="order-detail-modal__return-actions">
                    <button
                      type="submit"
                      className="order-detail-modal__btn-primary"
                      disabled={returnSubmitting}
                    >
                      {returnSubmitting ? "Đang gửi…" : "Gửi yêu cầu hoàn trả"}
                    </button>
                  </div>
                  {returnMsg ? (
                    <p
                      className={
                        returnMsg.startsWith("Đã gửi")
                          ? "order-detail-modal__ok"
                          : "order-detail-modal__warn"
                      }
                    >
                      {returnMsg}
                    </p>
                  ) : null}
                </form>
              )}
            </section>
          )}

          <section className="order-detail-modal__card order-detail-modal__card--totals">
            <h3 className="order-detail-modal__card-title">Tóm tắt thanh toán</h3>
            <footer className="order-detail-modal__foot">
              <div className="order-detail-modal__sum-row">
                <span>Tạm tính</span>
                <span>{formatMoney(subtotal)} VND</span>
              </div>
              {discAmount > 0 ? (
                <div className="order-detail-modal__sum-row order-detail-modal__sum-row--discount">
                  <span>
                    Giảm giá{v?.code ? ` · ${v.code}` : ""}
                  </span>
                  <span>−{formatMoney(discAmount)} VND</span>
                </div>
              ) : null}
              <div className="order-detail-modal__sum-row order-detail-modal__sum-row--total">
                <span>Tổng cộng</span>
                <span>{formatMoney(total)} VND</span>
              </div>
            </footer>
          </section>
        </div>
      </div>
    </div>
  );
}
