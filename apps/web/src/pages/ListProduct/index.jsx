import MenuFilter from "./MenuFilter";
import ViewData from "./ViewData";
import React, { useState, useEffect } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useLocation } from "react-router-dom";
import "./styles.css";
import { searchProducts } from "../../api/catalogApi";

function ListProduct() {
  const [books, setBooks] = useState([]);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [author, setAuthor] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(999999999);
  const [isSortByPrice, setIsSortByPrice] = useState(0);
  const [isSortByRating, setIsSortByRating] = useState(0);
  const [isSortByDiscount, setIsSortByDiscount] = useState(0);

  const location = useLocation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const title = searchParams.get("title");
    const type = searchParams.get("type");
    const author = searchParams.get("author");
    const isSortByPrice = searchParams.get("isSortByPrice");
    const isSortByRating = searchParams.get("isSortByRating");
    const isSortByDiscount = searchParams.get("isSortByDiscount");
    setIsSortByPrice(isSortByPrice === "true" ? 1 : 0);
    setIsSortByRating(isSortByRating === "true" ? 1 : 0);
    setIsSortByDiscount(isSortByDiscount === "true" ? 1 : 0);
    setTitle(title || "");
    setType(type || "");
    setAuthor(author || "");
  }, [location.search]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await searchProducts({
            page,
            limit,
            title,
            type,
            author,
            minPrice,
            maxPrice,
            isSortByPrice,
            isSortByRating,
            isSortByDiscount,
          });

        setBooks(data.items || data.products || []);
        setTotal(data.total || 0);
      } catch (error) {
        console.error("Error:", error);
      }
    };
    fetchData();
  }, [
    title,
    type,
    author,
    minPrice,
    maxPrice,
    isSortByPrice,
    isSortByRating,
    isSortByDiscount,
    page,
    limit,
  ]);

  return (
    <div>
      <Header />
      <div className="list_productlayout">
        <div className="list_product">
              <MenuFilter
                title={title}
                type={type}
                author={author}
                isSortByPrice={isSortByPrice}
                isSortByRating={isSortByRating}
                isSortByDiscount={isSortByDiscount}
                setMinPrice={setMinPrice}
                setMaxPrice={setMaxPrice}
                setTitle={setTitle}
                setType={setType}
                setAuthor={setAuthor}
                setIsSortByPrice={setIsSortByPrice}
                setIsSortByRating={setIsSortByRating}
                setIsSortByDiscount={setIsSortByDiscount}
                setPage={setPage}
              />
              <ViewData
                books={books}
                total={total}
                page={page}
                setLimit={setLimit}
                setPage={setPage}
              />
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default ListProduct;
