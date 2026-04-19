import React, { useState, useEffect } from "react";
import "./styles.css";
import { formatPrice } from "../../utils/index.js";
import { Link } from "react-router-dom";
import ReactStars from "react-rating-stars-component";
import { FaHeart, FaCartPlus } from "react-icons/fa";
import { useUser } from "../../context/UserContext";
import { getCart, upsertCartItem } from "../../api/checkoutApi";
import { removeFavorite, toggleFavorite } from "../../api/authApi";
import ProductCardImage from "../ProductCardImage";

const CardItem = ({ book }) => {
  const { user, setUser } = useUser();

  const [isFavourite, setIsFavourite] = useState(false);
  const [isCart, setIsCart] = useState(false);

  useEffect(() => {
    if (user && user.favorite && user.cart) {
      setIsFavourite(user.favorite.some((item) => item.product === book._id));
      setIsCart(
        user.cart.some((item) => String(item.product) === String(book._id))
      );
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

  const { _id, imgSrc, title, price, discount, soldCount, rating } = {
    ...defaultItem,
    ...book,
  };

  const priceAfterDiscount = (value) => formatPrice(value);

  const formatTitle = (value) => {
    return value.length > 30 ? `${value.slice(0, 30)}...` : value;
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

      if (
        !window.confirm(
          "Bạn có chắc chắn muốn xóa sản phẩm này khỏi danh sách yêu thích?"
        )
      ) {
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

      let serverQty = 0;
      try {
        const cartPayload = await getCart();
        const rawItems = cartPayload?.cart?.items || cartPayload?.items || [];
        const line = Array.isArray(rawItems)
          ? rawItems.find((it) => {
              const pid = it.productId ?? it.product?._id;
              return String(pid) === String(_id);
            })
          : null;
        const q = Number(line?.quantity);
        serverQty = Number.isFinite(q) && q > 0 ? q : 0;
      } catch {
        const existingCart = Array.isArray(user?.cart) ? user.cart : [];
        const fallback = existingCart.find(
          (item) => String(item.product) === String(_id)
        );
        const fq = Number(fallback?.quantity);
        serverQty = Number.isFinite(fq) && fq > 0 ? fq : 0;
      }

      const nextQty = serverQty + 1;
      await upsertCartItem({ productId: _id, quantity: nextQty });
      setUser((prevUser) => {
        const cart = [...(prevUser?.cart || [])];
        const idx = cart.findIndex(
          (item) => String(item.product) === String(_id)
        );
        const entry = { product: _id, quantity: nextQty };
        if (idx >= 0) {
          cart[idx] = { ...cart[idx], ...entry };
        } else {
          cart.push(entry);
        }
        return { ...prevUser, cart };
      });

      setIsCart(true);
      alert("Thêm sản phẩm vào giỏ hàng thành công!");
    } catch (error) {
      console.error(error);
      const msg =
        error?.response?.data?.message || "Không thể cập nhật giỏ hàng.";
      alert(msg);
    }
  };

  return (
    <div className="cardItem">
      <div className="book-card">
        <div className="book-image">
          <Link to={`/book/${_id}`}>
            <ProductCardImage src={imgSrc} alt={title} />
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
          <p className="book-discount">{discount > 0 ? `-${discount}%` : ""}</p>
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
            onClick={handleAddToCart}
          >
            <FaCartPlus />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardItem;
