import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./ProductsList.css";
import CardItem from "../../../components/CardItem";
import { getTopProducts } from "../../../api/catalogApi";

const ProductsList = () => {
  const [books, setBooks] = useState([]);

  useEffect(() => {
    getTopProducts()
      .then((response) => {
        const items = response?.data?.items || response?.data || [];
        setBooks(Array.isArray(items) ? items : []);
      })
      .catch((error) => console.error("Error fetching products:", error));
  }, []);

  return (
    <div className="top-selling-product">
      <div className="title-componet">
        <h3>DANH SÁCH SẢN PHẨM</h3>
        <Link to="/list" className="viewAll">
          Xem tất cả
        </Link>
      </div>
      <div className="products-container">
        {books.map((book) => (
          <CardItem book={book} key={book._id} />
        ))}
      </div>
    </div>
  );
};

export default ProductsList;
