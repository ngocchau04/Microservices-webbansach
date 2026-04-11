import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Cart.css';
import { useUser } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';

function Cart() {
    const navigate = useNavigate();
    const { user, setUser } = useUser();

    const [cartItems, setCartItems] = useState([]);
    const [checkeds, setCheckeds] = useState([]);
    const [total, setTotal] = useState(0);
    const [count, setCount] = useState(0);
    const [discount, setDiscount] = useState(0);

    useEffect(() => {
        const fetchCartItems = async () => {
            try {
                const jwt = localStorage.getItem('token');
                const response = await axios.get('/api/checkout/cart', {
                    headers: {
                        Authorization: `Bearer ${jwt}`
                    }
                });
                setCartItems(response.data.cart);
            } catch (error) {
                console.error("Lỗi khi lấy sản phẩm:", error);
            }
        };
        fetchCartItems();
    }, []);

    const handleCheck = (e) => {
        const { name, checked } = e.target;
        const item = cartItems.find(item => item.product._id === name);
        if (checked) {
            setCheckeds([...checkeds, name]);
            setTotal(total + item.product.price * item.quantity);
            setDiscount(discount + item.product.discount*item.product.price*item.quantity/100);
            setCount(count + 1);
        } else {
            setCheckeds(checkeds.filter(id => id !== name));
            setTotal(total - item.product.price * item.quantity);
            setDiscount(discount - item.product.discount*item.product.price*item.quantity/100);
            setCount(count - 1);
        }
    };

    const handleDelete = async (id) => {
        try {
            const jwt = localStorage.getItem('token');
            if (!window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?")) {
                return;
            }
            await axios.delete('/api/checkout/cart', {
                headers: {
                    Authorization: `Bearer ${jwt}`
                },
                data: {
                    productId: id
                }
            });
            setCartItems(cartItems.filter(item => item.product._id !== id));
            setUser((prevUsers) => ({
                ...prevUsers,
                cart: prevUsers.cart.filter(item => item.product !== id)
            }));
        } catch (error) {
            console.error("Lỗi khi xóa sản phẩm:", error);
        }
    };

    const handleDecreaseQuantity = async (id) => {
        try {
            const jwt = localStorage.getItem('token');
            const item = cartItems.find(item => item.product._id === id);
            if (item.quantity === 1) {
                return;
            }
            const quantity = item.quantity - 1;
            await axios.post('/api/checkout/cart', {
                productId: id,
                quantity: quantity
            }, {
                headers: {
                    Authorization: `Bearer ${jwt}`
                }
            });
            const newCartItems = [...cartItems];
            const index = newCartItems.findIndex(item => item.product._id === id);
            newCartItems[index].quantity = quantity;
            setCartItems(newCartItems);
        } catch (error) {
            console.error("Lỗi khi giảm số lượng sản phẩm:", error);
        }
    };

    const handleIncreaseQuantity = async (id) => {
        try {
            const jwt = localStorage.getItem('token');
            const item = cartItems.find(item => item.product._id === id);
            const quantity = item.quantity + 1;
            await axios.post('/api/checkout/cart', {
                productId: id,
                quantity: quantity
            }, {
                headers: {
                    Authorization: `Bearer ${jwt}`
                }
            });
            const newCartItems = [...cartItems];
            const index = newCartItems.findIndex(item => item.product._id === id);
            newCartItems[index].quantity = quantity;
            setCartItems(newCartItems);
        } catch (error) {
            console.error("Lỗi khi tăng số lượng sản phẩm:", error);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);
    }

    // router.delete("/cart", checkLogin, async (req, res) => {
    //     const { ids } = req.body;
    //     const userId = req.user.userId;
    //     try {
    //       const user = await User.findById(userId);
    //       if (!user) {
    //         return res.status(404).json({ message: "Người dùng không tồn tại." });
    //       }
    //       user.cart = user.cart.filter((item) => !ids.includes(item.product.toString()));
    //       await user.save();
    //       res.status(200).json({ message: "Sản phẩm đã được xóa khỏi giỏ hàng.", cart: user.cart });
    //     } catch (error) {
    //       console.error(error);
    //       res.status(500).json({ message: "Lỗi khi xóa sản phẩm khỏi giỏ hàng." });
    //     }
    //   });

    const handleCheckout = async () => {
        const listCheckeds = cartItems.filter(item => checkeds.includes(item.product._id));
        // delete listCheckeds.product in cart
        const jwt = localStorage.getItem('token');
        const response = await axios.delete('/api/checkout/cart/list', {
            headers: {
                Authorization: `Bearer ${jwt}`
            },
            data: {
                ids: listCheckeds.map(item => item.product._id)
            }
        });
        const newCartItems = cartItems.filter(item => !checkeds.includes(item.product._id));
        setCartItems(newCartItems);
        setUser((prevUsers) => ({
            ...prevUsers,
            cart: newCartItems.map(item => ({ product: item.product._id }))
        }));
        //
        const order = {
            products: listCheckeds.map(item => ({
                id: item.product._id,
                quantity: item.quantity
            }))
        };
        setUser((prevUsers) => ({
            ...prevUsers,
            order: order
        }));
        navigate('/order');
    };

    const handleCheckAll = () => {
        const listCheckeds = cartItems.map(item => item.product._id);
        setCheckeds(listCheckeds);
        setTotal(cartItems.reduce((total, item) => total + item.product.price * item.quantity, 0));
        setDiscount(cartItems.reduce((total, item) => total + item.product.discount*item.product.price*item.quantity/100, 0));
        setCount(cartItems.length
        );
    };

    const handleUncheckAll = () => {
        setCheckeds([]);
        setTotal(0);
        setDiscount(0);
        setCount(0);
    }


    return (
        <div className="cart-container">
            <h2>Giỏ hàng của bạn</h2>
            <div className="cart-items">
                {cartItems.map(item => (
                    <div key={item._id} className="cart-item">
                        <input
                            type="checkbox"
                            name={item.product._id}
                            checked={checkeds.includes(item.product._id)}
                            onChange={handleCheck}
                        />
                        <img src={item.product.imgSrc} alt={item.product.title} className="cart-item-image" />
                        <div className="cart-item-info">
                            <h3 className="cart-item-title">{item.product.title}</h3>
                            <p>Giá: {formatPrice(item.product.price)}</p>
                            <p>Giảm giá: {item.product.discount}%</p>
                            <h4>Số lượng: {item.quantity}</h4>
                            <p>Thành tiền: {formatPrice(item.product.price * item.quantity)}</p>
                        </div>
                        <div className="cart-item-actions">
                            <button onClick={() => handleDecreaseQuantity(item.product._id)}>-</button>
                            <button onClick={() => handleIncreaseQuantity(item.product._id)}>+</button>
                            <button onClick={() => handleDelete(item.product._id)}>Xóa</button>
                        </div>
                    </div>
                ))}
            </div>
            <div>
                <button className="buttonCheckAll" onClick={handleCheckAll}>Chọn tất cả</button>
                <button className="buttonCheckAll" onClick={handleUncheckAll}>Bỏ chọn tất cả</button>
            </div>
            <div className="cart-summary">
                <p>Số lượng sản phẩm đã chọn: {count}</p>
                <p>Giảm giá: {formatPrice(discount)}</p>
                <p>Tổng tiền: {formatPrice(total)}</p>
                <button className="checkout-button" onClick={handleCheckout} >Đặt hàng</button>
            </div>
        </div>
    );
}

export default Cart;
