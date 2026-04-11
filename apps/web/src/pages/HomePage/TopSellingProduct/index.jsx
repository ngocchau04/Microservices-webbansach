import React from "react";
import CardItem from "../../../components/CardItem";
import { FaFire } from "react-icons/fa";
import Slide from "../../../components/Slide";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import "./styles.css";
import { getTopSellingProducts } from "../../../api/catalogApi";

const TopSellingProduct = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const response = await getTopSellingProducts();
        const items = response?.data?.items || response?.data || [];
        setBooks(Array.isArray(items) ? items : []);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching books:", error);
      }
    };
    fetchBooks();
  }, []);

  return (
    <div className="top-selling-product">
      <div className="title-componet">
        <h3>
          <FaFire /> SẢN PHẨM BÁN CHẠY
        </h3>
        <Link to="/list" className="viewAll">
          Xem tất cả
        </Link>
      </div>
      {loading ? (
        <div className="flashsale-loading">
          Đang tải danh sách sản phẩm bán chạy...
        </div>
      ) : (
        <Slide numToShow={6}>
          {books.map((book, index) => (
            <CardItem key={book._id} book={book} />
          ))}
        </Slide>
      )}
    </div>
  );
};

export default TopSellingProduct;
