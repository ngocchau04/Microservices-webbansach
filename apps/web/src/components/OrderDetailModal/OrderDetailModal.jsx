import React, { useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./OrderDetailModal.css";
import {
  confirmOrderReceived,
  getOrderById,
  requestOrderReturn,
} from "../../api/checkoutApi";
import OrderStatusBadge from "../OrderStatusBadge/OrderStatusBadge";
import { isReturnFlowStatus } from "../../utils/orderStatusLabel";

const formatMoney = (n) =>
  new Intl.NumberFormat("vi-VN").format(Number(n) || 0);
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const calcDaysLeft = (deadlineAt) => {
  if (!deadlineAt) return 0;
  const diff = new Date(deadlineAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / DAY_IN_MS));
};

const formatDateTime = (value) => {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN");
};

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
  const navigate = useNavigate();
  const [detail, setDetail] = useState(order);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [confirmingReceipt, setConfirmingReceipt] = useState(false);
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

  const handleConfirmReceipt = async () => {
    if (!order?._id || confirmingReceipt) return;
    if (!window.confirm("Xác nhận bạn đã nhận được đơn hàng này?")) return;
    setConfirmingReceipt(true);
    setReturnMsg("");
    try {
      await confirmOrderReceived(String(order._id));
      await load();
      onOrdersInvalidate?.();
      setReturnMsg("Đã xác nhận nhận hàng thành công.");
    } catch (err) {
      const msg = err?.response?.data?.message;
      setReturnMsg(msg || "Không thể xác nhận nhận hàng. Vui lòng thử lại.");
    } finally {
      setConfirmingReceipt(false);
    }
  };

  const handleGoReview = (productId) => {
    if (!productId) return;
    const oid = String((detail || order)?._id || "");
    onClose?.();
    navigate(`/book/${productId}?reviewOrder=${encodeURIComponent(oid)}`);
  };

  if (!open || !order) {
    return null;
  }

  const o = detail || order;
  const statusRaw = o.orderStatus ?? o.status;
  const normalizedStatus = String(statusRaw || "").toLowerCase();
  const ship = getShipping(o);
  const lines = getLineItems(o);
  const { subtotal, discount, total } = getTotals(o);
  const v = o.voucherInfo;
  const discAmount = Number(discount) || 0;
  const showReturnSection = isReturnFlowStatus(statusRaw);
  const receivedAt = o.receivedAt ? new Date(o.receivedAt) : null;
  const reviewDeadlineAt = receivedAt
    ? new Date(receivedAt.getTime() + 14 * DAY_IN_MS)
    : null;
  const returnDeadlineAt = receivedAt
    ? new Date(receivedAt.getTime() + 7 * DAY_IN_MS)
    : null;
  const canConfirmReceipt = normalizedStatus === "delivered";
  const isPostDeliveryReady = normalizedStatus === "received";
  const isCompleted = normalizedStatus === "completed";
  const reviewWindowOpen =
    !!reviewDeadlineAt && Date.now() <= reviewDeadlineAt.getTime();
  const returnWindowOpen =
    !!returnDeadlineAt && Date.now() <= returnDeadlineAt.getTime();
  const reviewDaysLeft = calcDaysLeft(reviewDeadlineAt);
  const returnDaysLeft = calcDaysLeft(returnDeadlineAt);
  const canRequestReturn = isPostDeliveryReady && returnWindowOpen;

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

          {(canConfirmReceipt || isPostDeliveryReady || isCompleted || showReturnSection) && (
            <section className="order-detail-modal__card order-detail-modal__card--return">
              <header className="order-detail-modal__post-head">
                <h3 className="order-detail-modal__card-title">Hành động sau giao hàng</h3>
                <p className="order-detail-modal__post-lead">
                  Đánh giá trong vòng <strong>14 ngày</strong> và yêu cầu hoàn trả trong vòng{" "}
                  <strong>7 ngày</strong> kể từ khi xác nhận nhận hàng.
                </p>
              </header>

              {canConfirmReceipt ? (
                <div className="order-detail-modal__post-stage order-detail-modal__post-stage--receipt">
                  <div className="order-detail-modal__post-stage-chip">Bước 1 · Xác nhận nhận hàng</div>
                  <p className="order-detail-modal__post-stage-text">
                    Sau khi xác nhận đã nhận hàng, bạn có thể đánh giá sản phẩm hoặc gửi yêu cầu
                    hoàn trả.
                  </p>
                  <button
                    type="button"
                    className="order-detail-modal__btn-primary order-detail-modal__btn-primary--wide"
                    onClick={handleConfirmReceipt}
                    disabled={confirmingReceipt}
                  >
                    {confirmingReceipt ? "Đang xác nhận..." : "Xác nhận đã nhận hàng"}
                  </button>
                </div>
              ) : null}

              {isPostDeliveryReady ? (
                <>
                  <div className="order-detail-modal__post-window">
                    <span className="order-detail-modal__post-window-chip">
                      Đã xác nhận nhận hàng · {formatDateTime(o.receivedAt)}
                    </span>
                    <p>
                      Đánh giá sản phẩm:{" "}
                      {reviewWindowOpen ? `còn ${reviewDaysLeft} ngày` : "Đã hết thời gian đánh giá"}.
                    </p>
                    <p>
                      Yêu cầu hoàn trả:{" "}
                      {returnWindowOpen
                        ? `còn ${returnDaysLeft} ngày`
                        : "Đã hết thời gian yêu cầu hoàn trả"}
                      .
                    </p>
                  </div>

                  <div className="order-detail-modal__post-actions-grid">
                    <article
                      className={`order-detail-modal__action-tile${
                        reviewWindowOpen ? "" : " order-detail-modal__action-tile--disabled"
                      }`}
                    >
                      <h4>Đánh giá sản phẩm</h4>
                      <p>Chia sẻ trải nghiệm mua hàng trong vòng 14 ngày.</p>
                      <div className="order-detail-modal__review-list">
                        {lines.map((line, idx) => (
                          <div
                            key={`${line.productId}-review-${idx}`}
                            className="order-detail-modal__review-item"
                          >
                            <span>{line.title || "Sản phẩm"}</span>
                            <button
                              type="button"
                              className="order-detail-modal__btn-secondary"
                              onClick={() => handleGoReview(line.productId)}
                              disabled={!reviewWindowOpen}
                            >
                              {reviewWindowOpen ? "Đánh giá sản phẩm" : "Đã hết thời gian đánh giá"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </article>

                    <article
                      className={`order-detail-modal__action-tile${
                        canRequestReturn ? "" : " order-detail-modal__action-tile--disabled"
                      }`}
                    >
                      <h4>Yêu cầu hoàn trả</h4>
                      <p>Gửi yêu cầu hoàn trả trong 7 ngày nếu sản phẩm có vấn đề.</p>
                      <form className="order-detail-modal__return-form" onSubmit={handleSubmitReturn}>
                        <label className="order-detail-modal__label" htmlFor="order-return-reason">
                          Lý do hoàn trả
                        </label>
                        <textarea
                          id="order-return-reason"
                          className="order-detail-modal__textarea"
                          rows={3}
                          value={returnReason}
                          onChange={(e) => setReturnReason(e.target.value)}
                          placeholder="Nhập lý do hoàn trả…"
                          maxLength={2000}
                          disabled={!canRequestReturn}
                        />
                        <div className="order-detail-modal__return-actions">
                          <button
                            type="submit"
                            className="order-detail-modal__btn-primary"
                            disabled={returnSubmitting || !canRequestReturn}
                          >
                            {returnSubmitting
                              ? "Đang gửi…"
                              : canRequestReturn
                              ? "Gửi yêu cầu hoàn trả"
                              : "Đã hết thời gian yêu cầu hoàn trả"}
                          </button>
                        </div>
                      </form>
                    </article>
                  </div>
                </>
              ) : null}

              {isCompleted ? (
                <div className="order-detail-modal__post-stage order-detail-modal__post-stage--finalized">
                  <div className="order-detail-modal__post-stage-chip">Đơn hàng đã hoàn tất</div>
                  <p className="order-detail-modal__post-stage-text">
                    Bạn đã hoàn tất đánh giá cho đơn hàng này. Đơn đã được chốt và không còn hành
                    động sau giao hàng.
                  </p>
                </div>
              ) : null}

              {showReturnSection && (
                <div className="order-detail-modal__post-stage order-detail-modal__post-stage--return-flow">
                  <div className="order-detail-modal__post-stage-chip">Yêu cầu hoàn trả đã được gửi</div>
                  <div className="order-detail-modal__return-status">
                    <OrderStatusBadge status={statusRaw} />
                  </div>
                  {o.returnRequestReason ? (
                    <div className="order-detail-modal__reason-box">
                      <span className="order-detail-modal__label">Lý do hoàn trả</span>
                      <p className="order-detail-modal__reason-text">{o.returnRequestReason}</p>
                      {o.returnRequestedAt ? (
                        <p className="order-detail-modal__reason-meta">
                          Gửi lúc {new Date(o.returnRequestedAt).toLocaleString("vi-VN")}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              )}

              {returnMsg ? (
                <p
                  className={
                    returnMsg.startsWith("Đã") || returnMsg.startsWith("Đơn hàng")
                      ? "order-detail-modal__ok"
                      : "order-detail-modal__warn"
                  }
                >
                  {returnMsg}
                </p>
              ) : null}
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
