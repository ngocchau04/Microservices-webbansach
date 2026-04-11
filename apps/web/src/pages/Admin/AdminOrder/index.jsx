import { useState, useEffect } from "react";
import "./AdminOrder.css";
import { FaArrowLeft } from "react-icons/fa6";
import { getProducts } from "../../../api/catalogApi";
import { getAdminOrders, updateAdminOrderStatus } from "../../../api/checkoutApi";

function AdminOrder() {
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [products, setProducts] = useState([]);
  const [tab, setTab] = useState("cxn");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orders, setOrders] = useState([]);

  const statusByTab = {
    cxn: "pending",
    cvc: "confirmed",
    dvc: "shipping",
    ht: "completed",
    dh: "returned",
    dhh: "cancelled",
  };
  const statusLabel = {
    pending: "Cho xac nhan",
    confirmed: "Da xac nhan",
    shipping: "Dang van chuyen",
    completed: "Hoan tat",
    returned: "Don hoan",
    cancelled: "Don huy",
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

      alert("Cap nhat trang thai thanh cong");
    } catch (error) {
      console.error("Error updating order status:", error);
      alert("Da co loi xay ra khi cap nhat trang thai.");
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
    };

    return legacyMap[current] || current || "pending";
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

  const selectedStatus = getOrderStatus(selectedOrder);

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
            <div style={{ display: "flex" }}>
              <p>Trang thai:</p>
              <div style={{ fontWeight: "bold", marginLeft: "5px" }}>
                {statusLabel[selectedStatus] || selectedStatus}
              </div>
            </div>
            {selectedStatus === "pending" && (
              <div className="cnbton">
                <button onClick={() => handleChangeStatus("confirmed")}>Xac nhan</button>
                <button onClick={() => handleChangeStatus("cancelled")}>Huy don</button>
              </div>
            )}
            {selectedStatus === "confirmed" && (
              <div className="cnbton">
                <button onClick={() => handleChangeStatus("shipping")}>Cap nhat</button>
              </div>
            )}
            {selectedStatus === "shipping" && (
              <div className="cnbton">
                <button onClick={() => handleChangeStatus("completed")}>Cap nhat</button>
                <button onClick={() => handleChangeStatus("returned")}>Don hoan</button>
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
        <>
          <div className="adorderbut">
            <button className="dhbutton" onClick={() => setTab("cxn")}>Cho xac nhan</button>
            <button className="dhbutton" onClick={() => setTab("cvc")}>Da xac nhan</button>
            <button className="dhbutton" onClick={() => setTab("dvc")}>Dang van chuyen</button>
            <button className="dhbutton" onClick={() => setTab("ht")}>Hoan tat</button>
            <button className="dhbutton" onClick={() => setTab("dh")}>Don hoan</button>
            <button className="dhbutton" onClick={() => setTab("dhh")}>Don huy</button>
          </div>
          <h1 style={{ textAlign: "center" }}>Danh sach don hang</h1>
          <table>
            <thead>
              <tr>
                <th>STT</th>
                <th>Ma don</th>
                <th>Ho va ten</th>
                <th>SDT</th>
                <th>Tong don</th>
                <th>Phuong thuc thanh toan</th>
                <th>Ngay dat</th>
              </tr>
            </thead>
            <tbody>
              {orders
                .filter((order) => getOrderStatus(order) === statusByTab[tab])
                .map((order, index) => {
                  const shipping = getShipping(order);
                  return (
                    <tr key={order._id || index}>
                      <td className="stt">{index + 1}</td>
                      <td className="adormadh" onClick={() => viewOrder(order._id)}>
                        {order._id}
                      </td>
                      <td>{shipping.name}</td>
                      <td className="stt">{shipping.phone}</td>
                      <td>{money(getTotal(order))}?</td>
                      <td className="stt" style={{ width: "120px" }}>{getPaymentMethod(order)}</td>
                      <td>{new Date(order.createdAt).toLocaleDateString("vi-VN")}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}

export default AdminOrder;

