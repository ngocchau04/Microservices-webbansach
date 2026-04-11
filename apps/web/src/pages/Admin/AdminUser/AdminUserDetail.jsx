import React, { useEffect, useState } from 'react'
import './AdminUser.css';
import { FaArrowLeft } from "react-icons/fa6";
import { getOrdersByUserId } from "../../../api/checkoutApi";
import { getProducts } from "../../../api/catalogApi";

function AdminUserDetail(props) {
    const user = props.user;
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [selectedProductId, setSelectedProductId] = useState(null);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await getProducts({ page: 1, limit: 500 });
                setProducts(response?.data?.items || response?.data?.products || []);
            } catch (error) {
                console.error("Error fetching products:", error);
            }
        };
        fetchProducts();
    }, []);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const data = await getOrdersByUserId(user._id);
                setOrders(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Error fetching orders:", error);
                alert('Internal server error');
            }
        }
        fetchOrders();
    }, []);

    const favoriteProducts = (user.favorite || []).map(fav =>
        products.find(product => product._id === fav.favProId)).filter(Boolean);
    console.log(user.favorite);

    useEffect(() => {
        console.log(orders);
    }, [orders]);

    const handleCloseFP = () => {
        setSelectedProductId(null);
    };

    return (<>
        {selectedProductId ? <div />//<ProductDetails productId={selectedProductId} onClose={handleCloseFP}/> 
            :
            <div id="user-detail-container">
                <div id="user-detail-content">
                    <div className='adusdehd'>
                        <h1>Thông tin chi tiết khách hàng</h1>
                        <button onClick={props.onClose}><FaArrowLeft /></button>
                    </div>
                    <h3 className='adush3'>Thông tin cá nhân</h3>
                    <div style={{ height: "10px" }} />
                    <div id="user-information">
                        <div>
                            <p>Họ và tên: {user.name}</p>
                            <div style={{ height: "5px" }} />
                            <p>Email: {user.email}</p>
                            <div style={{ height: "5px" }} />
                            <p>Số điện thoại: {user.sdt}</p>
                            <div style={{ height: "5px" }} />
                        </div>
                    </div>
                    <h3 className='adush3'>Đơn hàng</h3>

                    {orders.length === 0 ? <p style={{ textAlign: "center" }}>Không có đơn hàng nào</p> :
                        // <div id="orders">
                        //     <table>
                        //         <thead>
                        //             <tr>
                        //                 <th>STT</th>
                        //                 <th>Số lượng sản phẩm</th>
                        //                 <th>Tổng giá trị</th>
                        //                 <th>Trạng thái</th>
                        //                 <th>Phương thức thanh toán</th>
                        //                 <th>Ngày đặt</th>
                        //                 <th>Ngày giao</th>
                        //             </tr>
                        //         </thead>
                        //         <tbody>
                        //             {orders.map((order, index) => (
                        //                 <tr key={index}>
                        //                     <td className="stt">{index + 1}</td>
                        //                     {/* <td className="stt">{order.total}</td> */}
                        //                     <td className="stt">{order.products.reduce((sum, product) => sum + product.quantity, 0)}</td>
                        //                     <td>{order.total.toLocaleString("vi-VN")}₫</td>
                        //                     <td>{order.status}</td>
                        //                     <td>{order.type}</td>
                        //                     <td>{order.createdAt}</td>
                        //                     {/* <td>{order.createdAt}</td> */}
                        //                     <td>{new Date(new Date(order.createdAt).getTime() + 4 * 25 * 60 * 60 * 1000).toLocaleDateString("vi-VN")}</td>
                        //                 </tr>
                        //             ))}
                        //         </tbody>
                        //     </table>
                        // </div>}
                        <div id="orders">
                            <table>
                                <thead>
                                    <tr>
                                        <th>STT</th>
                                        <th>Số lượng sản phẩm</th>
                                        <th>Tổng giá trị</th>
                                        <th>Trạng thái</th>
                                        <th>Phương thức thanh toán</th>
                                        <th>Ngày đặt</th>
                                        <th>Ngày giao</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map((order, index) => {
                                        // Ngày hôm nay
                                        const today = new Date();
                                        // Ngày 3 ngày sau ngày đặt
                                        const threeDaysAfterOrder = new Date(
                                            new Date(order.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000
                                        );
                                        // Ngày 3 ngày sau hôm nay
                                        const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
                                        // Xác định ngày giao
                                        let deliveryDate;
                                        if (order.status === "completed") {
                                            deliveryDate = threeDaysAfterOrder < today ? threeDaysAfterOrder : today;
                                        } else {
                                            if (order.status === "returned" || order.status === "cancelled") {
                                                deliveryDate = "Không áp dụng";
                                            } else {
                                                deliveryDate = threeDaysFromNow;
                                            }
                                        }

                                        return (
                                            <tr key={index}>
                                                <td className="stt">{index + 1}</td>
                                                <td className="stt">
                                                    {order.products.reduce((sum, product) => sum + product.quantity, 0)}
                                                </td>
                                                <td>{order.total.toLocaleString("vi-VN")}₫</td>
                                                <td>{order.status}</td>
                                                <td>{order.type}</td>
                                                <td>{new Date(order.createdAt).toLocaleDateString("vi-VN")}</td>
                                                <td>
                                                    {deliveryDate !== "Không áp dụng"
                                                        ? new Date(deliveryDate).toLocaleDateString("vi-VN")
                                                        : deliveryDate}
                                                </td>

                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>}


                    <h3 className='adush3'>Sản phẩm yêu thích</h3>
                    {favoriteProducts.length === 0 ? <p style={{ textAlign: "center" }}>Không có sản phẩm yêu thích nào</p> :
                        <div id="favorite-products">
                            <ul>
                                {favoriteProducts.map((favorite, index) => (
                                    <div key={index} className="kardspp">
                                        <img className="kardspp-image" src={favorite.imgSrc}
                                        //onClick={()=>setSelectedProductId(favorite._id)}
                                        />
                                        <p className="kardspp-title">{favorite.title}</p>
                                        <p className="kardspp-price">{favorite.price}₫</p>
                                    </div>
                                ))}
                            </ul>
                        </div>}
                </div>
            </div>}</>
    )
}

export default AdminUserDetail




