import React, { useState, useEffect } from "react";
import "./styles.css";
import { formatPrice } from "../../utils/index.js";
import { Link } from "react-router-dom";
import ReactStars from "react-rating-stars-component";
import { FaHeart, FaCartPlus } from "react-icons/fa";
import { useUser } from "../../context/UserContext";
import { removeCartItemByProduct, upsertCartItem } from "../../api/checkoutApi";
import { removeFavorite, toggleFavorite } from "../../api/authApi";

const CardItem = ({ book }) => {
  const { user, setUser } = useUser();

  const [isFavourite, setIsFavourite] = useState(false);
  const [isCart, setIsCart] = useState(false);

  useEffect(() => {
    if (user && user.favorite && user.cart) {
      setIsFavourite(user.favorite.some((item) => item.product === book._id));
      setIsCart(user.cart.some((item) => item.product === book._id));
    }
  }, [user, book._id]);

  const defaultItem = {
    id: 0,
    imgSrc: "https://cafebiz.cafebizcdn.vn/2019/3/12/photo-1-1552354590822522314238.jpg",
    title: "Title",
    description: "Description",
    price: 100000,
    discount: 10,
    sold: 20,
    rating: 4,
  };

  const { _id, imgSrc, title, description, price, discount, soldCount, rating } = {
    ...defaultItem,
    ...book,
  };

  const priceAfterDiscount = (price) => {
    return formatPrice(price);
  };

  const formatTitle = (title) => {
    return title.length > 30 ? `${title.slice(0, 30)}...` : title;
  };

  const handleAddFavourite = async () => {
    try {
      const jwt = localStorage.getItem("token");
      if (!jwt) {
        alert("Vui lòng đăng nhập để thêm sản phẩm vào danh sách yêu thích.");
        return;
      }
      const response = await toggleFavorite({ productId: _id });

      setUser((prevUser) => ({
        ...prevUser,
        favorite: [...prevUser.favorite, { product: _id }],
      }));

      setIsFavourite(true);
      console.log(response.data);
      alert("Thêm sản phẩm vào danh sách yêu thích thành công!");
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveFavourite = async () => {
    try {
      const jwt = localStorage.getItem("token");
      if (!jwt) {
        alert("Vui lòng đăng nhập để xóa sản phẩm khỏi danh sách yêu thích.");
        return;
      }
      // add popup confirm
      if (!window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này khỏi danh sách yêu thích?")) {
        return;
      }
      const response = await removeFavorite({ productId: _id });

      setUser((prevUser) => ({
        ...prevUser,
        favorite: prevUser.favorite.filter((item) => item.product !== _id),
      }));

      setIsFavourite(false);
      console.log(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddToCart = async () => {
    try {
      const jwt = localStorage.getItem("token");
      if (!jwt) {
        alert("Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.");
        return;
      }
      const response = await upsertCartItem({ productId: _id, quantity: 1 });
      setUser((prevUser) => ({
        ...prevUser,
        cart: [...(prevUser?.cart || []), { product: _id, quantity: 1 }],
      }));

      setIsCart(true);
      console.log(response.data);
      alert("Thêm sản phẩm vào giỏ hàng thành công!");
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveCart = async () => {
    try {
      const jwt = localStorage.getItem("token");
      if (!jwt) {
        alert("Vui lòng đăng nhập để xóa sản phẩm khỏi giỏ hàng.");
        return;
      }
      if (!window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?")) {
        return;
      }
      const response = await removeCartItemByProduct(_id);

      setUser((prevUser) => ({
        ...prevUser,
        cart: prevUser.cart.filter((item) => item.product !== _id),
      }));

      setIsCart(false);
      console.log(response.data);
      alert("Xóa sản phẩm khỏi giỏ hàng thành công!");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="cardItem">
      <div className="book-card">
        <div className="book-image">
          <Link to={`/book/${_id}`}>
            <img src={imgSrc} alt={title} />
          </Link>
        </div>
        <h2 className="book-title-item">
          <Link to={`/book/${_id}`}>{formatTitle(title)}</Link>
        </h2>
        <div className="book-rating">
          <ReactStars
            count={5}
            size={20}
            activeColor="#ffd700"
            value={rating}
            isHalf={true}
            edit={false}
          />
        </div>
        <div className="book-price">
          <p className="book-discount">
            {discount > 0 ? `-${discount}%` : ""}
          </p>
          <p>{priceAfterDiscount(price)}₫</p>
        </div>
        <p>Đã bán: {soldCount}</p>
        <div className="book-icon">
          <div
            className={isFavourite ? "book-favourite red_hide" : "book-favourite"}
            onClick={isFavourite ? handleRemoveFavourite : handleAddFavourite}
          >
            <FaHeart />
          </div>
          <div
            className={isCart ? "book-cart red_hide" : "book-cart"}
            onClick={isCart ? handleRemoveCart : handleAddToCart}
          >
            <FaCartPlus />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardItem;
