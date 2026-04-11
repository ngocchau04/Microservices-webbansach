import React, { useEffect, useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import voucherImage from "../../assets/voucher.png";
import "./VoucherPage.css";
import { listVouchers } from "../../api/checkoutApi";

const VoucherPage = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        const data = await listVouchers();
        const items = Array.isArray(data) ? data : data?.items || data?.data || [];
        setVouchers(Array.isArray(items) ? items : []);
      } catch (error) {
        console.error("Error fetching vouchers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVouchers();
  }, []);

  const handleCopy = (voucherCode) => {
    navigator.clipboard
      .writeText(voucherCode)
      .then(() => {
        alert("Voucher code copied!");
      })
      .catch((error) => {
        console.error("Error copying:", error);
      });
  };

  if (loading) {
    return <div className="voucher-loading">Dang tai danh sach voucher...</div>;
  }

  return (
    <div>
      <Header />
      <div className="voucher-list">
        <h2>Danh sach Voucher</h2>
        <div id="voucher-list-div">
          {vouchers.map((voucher) => {
            const code = voucher.voucherCode || voucher.code;
            const voucherType =
              voucher.voucherType ||
              (voucher.type === "fixed" ? 1 : voucher.type === "percent" ? 2 : null);
            const voucherValue = Number(voucher.voucherValue ?? voucher.value ?? 0);
            const maxDiscount = Number(voucher.maxDiscountValue ?? voucher.maxDiscount ?? 0);
            const minOrderValue = Number(voucher.minOrderValue ?? 0);
            const usedCount = Number(voucher.usedCount ?? 0);
            const expiration = voucher.voucherExpiration || voucher.expiresAt;

            return (
              <div className="voucher" key={code}>
                <img src={voucherImage} alt="Voucher" />
                <p>
                  <b
                    onClick={() => handleCopy(code)}
                    style={{ cursor: "pointer", color: "#CD0000" }}
                  >
                    {code}
                  </b>
                </p>
                <p>
                  <b>
                    Giam: {voucherType === 1
                      ? `${voucherValue.toLocaleString("vi-VN")}?`
                      : `${voucherValue}%, toi da ${maxDiscount.toLocaleString("vi-VN")}?`}
                  </b>
                </p>
                <p>Don toi thieu: {minOrderValue.toLocaleString("vi-VN")}?</p>
                <p>
                  HSD: {new Intl.DateTimeFormat("vi-VN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  }).format(new Date(expiration))}
                </p>
                <p>Da su dung: {usedCount}</p>
              </div>
            );
          })}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default VoucherPage;

