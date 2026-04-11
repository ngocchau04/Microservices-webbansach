import React, { useEffect, useState } from "react";
import CardItem from "../../../components/CardItem";
import { IoIosFlash } from "react-icons/io";
import Slide from "../../../components/Slide";
import { Link } from "react-router-dom";
import "./FlashSale.css";
import { getFlashSaleProducts } from "../../../api/catalogApi";

const FlashSale = () => {
    const [books, setBooks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBooks = async () => {
            try {
                const response = await getFlashSaleProducts();
                const items = response?.data?.items || response?.data || [];
                setBooks(Array.isArray(items) ? items : []);
                setLoading(false);
            } catch (error) {
                console.error("Error fetching books:", error);
            }
        };
        fetchBooks();
    }, []);

    if (loading) {
        return <div className="flashsale-loading">Đang tải danh sách sản phẩm Sale...</div>;
    }

    return (
        <div className="flash-sale">
            <div className="title-componet">
                <h3>
                    S A L E <IoIosFlash />
                </h3>
                <Link to="/list?isSortByDiscount=true" className="viewAll">
                    Xem tất cả
                </Link>
            </div>

            <Slide numToShow={6}>
                {books.map((book) => (
                    <CardItem key={book._id} book={book} />
                ))}
            </Slide>
        </div>
    );
};

export default FlashSale;
