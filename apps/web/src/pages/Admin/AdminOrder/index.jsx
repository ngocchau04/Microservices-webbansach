import { useState, useEffect } from "react";
import "./AdminOrder.css";
import { FaArrowLeft } from "react-icons/fa6";
import { getProducts } from "../../../api/catalogApi";
import { getAdminOrders, updateAdminOrderStatus } from "../../../api/checkoutApi";
import OrderStatusBadge from "../../../components/OrderStatusBadge/OrderStatusBadge";
import { getOrderStatusLabel } from "../../../utils/orderStatusLabel";

function AdminOrder() {
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [products, setProducts] = useState([]);
  const [tab, setTab] = useState("cxn");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);

  const RETURN_PIPELINE = "__return_pipeline__";

  const statusByTab = {
    cxn: "pending",
    cvc: "confirmed",
    dvc: "shipping",
    ht: "completed",
    yc: "return_requested",
    xl: RETURN_PIPELINE,
    tc: "return_rejected",
    dhx: "returned",
    dhh: "cancelled",
  };

  const money = (value) => Number(value || 0).toLocaleString("vi-VN");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await getProducts({ limit: 500 });
        const items = res?.data?.items || res?.data?.products || [];
        setProducts(items);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchProducts();
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await getAdminOrders();
        const items = Array.isArray(data) ? data : data?.items || data?.data || [];
        setOrders(Array.isArray(items) ? items : []);
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };

    fetchOrders();
  }, []);

  const viewOrder = (orderId) => {
    const found = orders.find((o) => String(o._id) === String(orderId));
    setSelectedOrderId(orderId);
    setSelectedOrder(found || null);
  };

  const handleChangeStatus = async (nextStatus) => {
    if (!selectedOrder?._id) return;

    try {
      await updateAdminOrderStatus(selectedOrder._id, { status: nextStatus });

      const nextOrders = orders.map((o) =>
        String(o._id) === String(selectedOrder._id)
          ? { ...o, orderStatus: nextStatus, status: nextStatus }
          : o
      );

      setOrders(nextOrders);
      setSelectedOrder((prev) =>
        prev
          ? {
              ...prev,
              orderStatus: nextStatus,
              status: nextStatus,
            }
          : prev
      );

      alert("Cập nhật trạng thái thành công.");
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Đã có lỗi khi cập nhật trạng thái.");
    }
  };

  const normalizeStatus = (value) => {
    const current = String(value || "").trim();
    const legacyMap = {
      "Ðang ch? v?n chuy?n": "confirmed",
      "Ðang v?n chuy?n": "shipping",
      "Hoàn t?t": "completed",
      "Ðon hoàn": "returned",
      "Ðon h?y": "cancelled",
      "Đang chờ vận chuyển": "confirmed",
      "Đang vận chuyển": "shipping",
      "Hoàn tất": "completed",
      "Đơn hoàn": "returned",
      "Đơn hủy": "cancelled",
      "Chờ xác nhận": "pending",
      "Đã xác nhận": "confirmed",
      "Đã hủy": "cancelled",
      "Hoàn trả": "returned",
      "Yêu cầu hoàn trả": "return_requested",
      "Đang xử lý hoàn trả": "return_processing",
      "Chấp nhận hoàn trả": "return_accepted",
      "Từ chối hoàn trả": "return_rejected",
      "Đã hoàn trả": "returned",
      "Cho xac nhan": "pending",
      "Da xac nhan": "confirmed",
      "Dang van chuyen": "shipping",
      "Hoan tat": "completed",
      "Don hoan": "returned",
      "Don huy": "cancelled",
    };

    const resolved = legacyMap[current] || current || "pending";
    const canon = String(resolved).trim().toLowerCase();
    const known = new Set([
      "pending",
      "confirmed",
      "shipping",
      "completed",
      "cancelled",
      "return_requested",
      "return_processing",
      "return_accepted",
      "return_rejected",
      "returned",
    ]);
    if (known.has(canon)) {
      return canon;
    }
    return resolved;
  };

  const getOrderStatus = (order) => normalizeStatus(order?.orderStatus || order?.status);
  const getPaymentMethod = (order) => order?.paymentMethod || order?.type;
  const getTotal = (order) => order?.totals?.total ?? order?.total ?? 0;
  const getDiscount = (order) => order?.totals?.discount ?? order?.discount ?? 0;
  const getItems = (order) =>
    order?.items ||
    (order?.products || []).map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      title: item.title,
      price: item.price,
      image: item.image,
    }));

  const getShipping = (order) => ({
    name: order?.shippingInfo?.name || order?.name,
    phone: order?.shippingInfo?.phone || order?.phone,
    email: order?.shippingInfo?.email || order?.email,
    address: order?.shippingInfo?.address || order?.address,
  });

  const normalizePhone = (value) => String(value || "").replace(/[^\d]/g, "");

  const selectedStatus = getOrderStatus(selectedOrder);

  const tabFilteredOrders = orders.filter((order) => {
    const s = getOrderStatus(order);
    const target = statusByTab[tab];
    if (target === RETURN_PIPELINE) {
      return s === "return_processing" || s === "return_accepted";
    }
    return s === target;
  });

  const phoneQuery = normalizePhone(phoneFilter);
  const filteredOrders = tabFilteredOrders.filter((order) => {
    if (!phoneQuery) return true;
    return normalizePhone(getShipping(order).phone).includes(phoneQuery);
  });

  const summary = {
    total: orders.length,
    pending: orders.filter((o) => getOrderStatus(o) === "pending").length,
    shipping: orders.filter((o) => getOrderStatus(o) === "shipping").length,
    returnRequested: orders.filter((o) => getOrderStatus(o) === "return_requested").length,
  };

  return (
    <>
      {selectedOrderId && selectedOrder ? (
        <div className="adorxtt">
          <div className="adorttdh">
            <h1>Thong tin don hang</h1>
            <button
              onClick={() => {
                setSelectedOrderId(null);
                setSelectedOrder(null);
              }}
            >
              <FaArrowLeft />
            </button>
          </div>
          <div className="ps">
            <p>Ma don hang: {selectedOrder._id}</p>
            <p>Ma khach hang: {selectedOrder.userId}</p>
            <p>Tong gia tri don hang: {money(getTotal(selectedOrder))}?</p>
            <p>Giam gia: {money(getDiscount(selectedOrder))}?</p>
            <p>Phuong thuc thanh toan: {getPaymentMethod(selectedOrder)}</p>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <p style={{ margin: 0 }}>Trạng thái:</p>
              <OrderStatusBadge status={selectedStatus} />
            </div>
            {selectedOrder?.returnRequestReason ? (
              <p style={{ marginTop: 10, maxWidth: 560 }}>
                <strong>Lý do hoàn trả (khách):</strong> {selectedOrder.returnRequestReason}
              </p>
            ) : null}
            {selectedStatus === "pending" && (
              <div className="cnbton">
                <button onClick={() => handleChangeStatus("confirmed")}>Xác nhận</button>
                <button onClick={() => handleChangeStatus("cancelled")}>Hủy đơn</button>
              </div>
            )}
            {selectedStatus === "confirmed" && (
              <div className="cnbton">
                <button onClick={() => handleChangeStatus("shipping")}>Bắt đầu vận chuyển</button>
              </div>
            )}
            {selectedStatus === "shipping" && (
              <div className="cnbton">
                <button onClick={() => handleChangeStatus("completed")}>Xác nhận hoàn tất</button>
              </div>
            )}
            {selectedStatus === "return_requested" && (
              <div className="cnbton">
                <button onClick={() => handleChangeStatus("return_processing")}>Đang xử lý</button>
                <button onClick={() => handleChangeStatus("return_accepted")}>Chấp nhận hoàn trả</button>
                <button onClick={() => handleChangeStatus("return_rejected")}>Từ chối</button>
              </div>
            )}
            {selectedStatus === "return_processing" && (
              <div className="cnbton">
                <button onClick={() => handleChangeStatus("returned")}>Hoàn tất hoàn trả</button>
                <button onClick={() => handleChangeStatus("return_rejected")}>Từ chối</button>
              </div>
            )}
            {selectedStatus === "return_accepted" && (
              <div className="cnbton">
                <button onClick={() => handleChangeStatus("returned")}>Hoàn tất hoàn trả</button>
              </div>
            )}
            <p>Ngay dat: {new Date(selectedOrder.createdAt).toLocaleDateString("vi-VN")}</p>
            <br />
          </div>
          <h2>Thong tin nguoi dat</h2>
          <div className="adorttnn">
            <p>Ho va ten: {getShipping(selectedOrder).name}</p>
            <p>So dien thoai: {getShipping(selectedOrder).phone}</p>
            <p>Email: {getShipping(selectedOrder).email}</p>
            <p>Dia chi: {getShipping(selectedOrder).address}</p>
          </div>
          <h2>Thong tin san pham</h2>
          <div>
            {getItems(selectedOrder).map((sp, index) => {
              const p =
                products.find((item) => String(item._id) === String(sp.productId)) || sp;

              return (
                <div className="cardgh" key={`${sp.productId}-${index}`}>
                  <img src={p.imgSrc || p.image} />
                  <div className="cardghh-text">
                    <p style={{ height: "70px" }}>{p.title}</p>
                    <p>So luong: {sp.quantity}</p>
                    <p>Gia: {money(p.price)}?</p>
                    <div className="cardghprice">
                      <div className="cargh-pr">Tong:</div>
                      <div className="cardgh-price">{money((p.price || 0) * (sp.quantity || 0))}?</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="admin-order">
          <div className="adorderbut admin-order__filters">
            <div className="admin-order__status-tabs">
              <button
                type="button"
                className={`dhbutton${tab === "cxn" ? " dhbutton--active" : ""}`}
                onClick={() => setTab("cxn")}
              >
                {getOrderStatusLabel(statusByTab.cxn)}
              </button>
              <button
                type="button"
                className={`dhbutton${tab === "cvc" ? " dhbutton--active" : ""}`}
                onClick={() => setTab("cvc")}
              >
                {getOrderStatusLabel(statusByTab.cvc)}
              </button>
              <button
                type="button"
                className={`dhbutton${tab === "dvc" ? " dhbutton--active" : ""}`}
                onClick={() => setTab("dvc")}
              >
                {getOrderStatusLabel(statusByTab.dvc)}
              </button>
              <button
                type="button"
                className={`dhbutton${tab === "ht" ? " dhbutton--active" : ""}`}
                onClick={() => setTab("ht")}
              >
                {getOrderStatusLabel(statusByTab.ht)}
              </button>
              <button
                type="button"
                className={`dhbutton${tab === "yc" ? " dhbutton--active" : ""}`}
                onClick={() => setTab("yc")}
              >
                Yêu cầu HT
              </button>
              <button
                type="button"
                className={`dhbutton${tab === "xl" ? " dhbutton--active" : ""}`}
                onClick={() => setTab("xl")}
              >
                Xử lý HT
              </button>
              <button
                type="button"
                className={`dhbutton${tab === "tc" ? " dhbutton--active" : ""}`}
                onClick={() => setTab("tc")}
              >
                Từ chối HT
              </button>
              <button
                type="button"
                className={`dhbutton${tab === "dhx" ? " dhbutton--active" : ""}`}
                onClick={() => setTab("dhx")}
              >
                {getOrderStatusLabel(statusByTab.dhx)}
              </button>
              <button
                type="button"
                className={`dhbutton${tab === "dhh" ? " dhbutton--active" : ""}`}
                onClick={() => setTab("dhh")}
              >
                {getOrderStatusLabel(statusByTab.dhh)}
              </button>
            </div>

            <div className="admin-order__filter-tools">
              <label className="admin-order__phone-filter" htmlFor="admin-order-phone-filter">
                <span>SDT khách hàng</span>
                <input
                  id="admin-order-phone-filter"
                  type="text"
                  value={phoneFilter}
                  onChange={(e) => setPhoneFilter(e.target.value)}
                  placeholder="Nhập số điện thoại..."
                />
              </label>
              <button
                type="button"
                className="admin-order__reset-btn"
                onClick={() => {
                  setPhoneFilter("");
                  setTab("cxn");
                }}
              >
                Reset bộ lọc
              </button>
            </div>
          </div>

          <section className="admin-order__summary" aria-label="Tổng quan đơn hàng">
            <article className="admin-order__summary-card">
              <span className="admin-order__summary-k">Tổng đơn</span>
              <strong className="admin-order__summary-v">{summary.total}</strong>
            </article>
            <article className="admin-order__summary-card">
              <span className="admin-order__summary-k">Chờ xác nhận</span>
              <strong className="admin-order__summary-v">{summary.pending}</strong>
            </article>
            <article className="admin-order__summary-card">
              <span className="admin-order__summary-k">Đang vận chuyển</span>
              <strong className="admin-order__summary-v">{summary.shipping}</strong>
            </article>
            <article className="admin-order__summary-card">
              <span className="admin-order__summary-k">Yêu cầu hoàn trả</span>
              <strong className="admin-order__summary-v">{summary.returnRequested}</strong>
            </article>
          </section>

          <header className="admin-order__header">
            <h1 className="admin-order__title">Danh sach don hang</h1>
          </header>
          <div className="admin-order__table-wrap">
            <table className="admin-order__table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Ma don</th>
                  <th>Ho va ten</th>
                  <th>SDT</th>
                  <th>Tong don</th>
                  <th>Trang thai</th>
                  <th>Phuong thuc thanh toan</th>
                  <th>Ngay dat</th>
                  <th>Chi tiet</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="admin-order__empty">
                      Chua co don hang trong muc nay.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, index) => {
                    const shipping = getShipping(order);
                    const orderStatus = getOrderStatus(order);
                    const payment = String(getPaymentMethod(order) || "").toLowerCase();
                    const isOnline = payment === "online";
                    return (
                      <tr key={order._id || index}>
                        <td className="stt">{index + 1}</td>
                        <td className="adormadh" title={String(order._id)}>
                          {String(order._id).slice(0, 12)}...
                        </td>
                        <td>{shipping.name}</td>
                        <td className="stt">{shipping.phone}</td>
                        <td>{money(getTotal(order))}?</td>
                        <td>
                          <OrderStatusBadge status={orderStatus} />
                        </td>
                        <td className="stt admin-order__cell-pay">
                          <span
                            className={`admin-order__pay-badge${
                              isOnline ? " admin-order__pay-badge--online" : " admin-order__pay-badge--cod"
                            }`}
                          >
                            {isOnline ? "Online" : "COD"}
                          </span>
                        </td>
                        <td>{new Date(order.createdAt).toLocaleDateString("vi-VN")}</td>
                        <td className="stt">
                          <button
                            type="button"
                            className="admin-order__detail-btn"
                            onClick={() => viewOrder(order._id)}
                          >
                            Xem
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminOrder;

