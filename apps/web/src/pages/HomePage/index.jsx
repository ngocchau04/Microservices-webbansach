import React from "react";
import ItemsList from "./ItemsList/ItemsList";
import ProductsList from "./ProductsList/ProductsList";
import TopSellingProduct from "./TopSellingProduct";
import ClassicBrand from "./ClassicBrand";
import VoucherList from "./Voucher/Voucher";
import FlashSale from "./FlashSale/FlashSale";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { Routes, Route } from "react-router-dom";
import Profile from "../Profile";
import Cart from "../Cart";
import Chat from "../../components/Chat";

const HomePage = () => {
  return (
    <div>
      <Header />
      <Routes>
        <Route
          path="/"
          element={
            <>
              <TopSellingProduct />
              <ClassicBrand />
              <FlashSale />
              <VoucherList />
              <ItemsList />
              <ProductsList />
              <Chat />
            </>
          }
        />
        <Route path="/profile" element={<Profile />} />
        <Route path="/giohang" element={<Cart />} />
      </Routes>
      <Footer />
    </div>
  );
};

export default HomePage;
