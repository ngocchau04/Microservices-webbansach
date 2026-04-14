import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./styles.css";
import { getTopAuthors } from "../../../api/catalogApi";

const ClassicBrand = () => {
  const [classicBrand, setClassicBrand] = useState([]);
  const navigate = useNavigate(); // Hook để điều hướng

  useEffect(() => {
    const fetchClassicBrand = async () => {
      try {
        const response = await getTopAuthors();
        const items = response?.data?.items || response?.data || [];
        setClassicBrand(Array.isArray(items) ? items : []);
      } catch (error) {
        console.error("Error fetching classic brand:", error);
      }
    };
    fetchClassicBrand();
  }, []);

  const formatBook = (book) => {
    if (book.length > 50) {
      return book.slice(0, 50) + "...";
    }
    return book;
  };

  const showBooks = (books) => {
    return books.map((book, index) => (
      <p key={index}>{index + 1}: {formatBook(book)}</p>
    ));
  };

  // Hàm xử lý khi nhấp vào một phần tử
  const handleClick = (author) => {
    navigate(`/list?author=${encodeURIComponent(author)}`);
  };

  return (
    <div className="classic-brand">
      <h3>CÁC TÁC GIẢ NỔI BẬT</h3>
      <div className="clabra-container">
        {classicBrand.map((brand, index) => (
          <div
            className="clabra-item"
            key={index}
            onClick={() => handleClick(brand._id)} // Gắn sự kiện onClick
          >
            <h2>{brand._id}</h2>
            <div>{showBooks(brand.books)}</div>
          </div>
        ))}
      </div>
      <div className="clabra-more">
        <Link to="/authors" className="viewAll">
          Xem tất cả
        </Link>
      </div>
    </div>
  );
};

export default ClassicBrand;
