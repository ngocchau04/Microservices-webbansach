import React, { useEffect, useState } from "react";
import "./Voucher.css";
import { Link } from "react-router-dom";
import voucherImage from "../../../assets/voucher.png";
import { listVouchers } from "../../../api/checkoutApi";

const Voucher = ({
  voucherCode,
  voucherValue,
  maxDiscountValue,
  minOrderValue,
  voucherType,
  voucherExpiration,
  usedCount,
}) => {
  const handleCopy = () => {
    navigator.clipboard
      .writeText(voucherCode)
      .then(() => {
        alert("Voucher code copied!");
      })
      .catch((error) => {
        console.error("Error copying:", error);
      });
  };

  return (
    <div className="voucher">
      <img src={voucherImage} alt="Voucher" />
      <p>
        <b onClick={handleCopy} style={{ cursor: "pointer", color: "#CD0000" }}>
          {voucherCode}
        </b>
      </p>
      <p>
        <b>
          Giam{" "}
          {voucherType === 1
            ? `${voucherValue.toLocaleString("vi-VN")}?`
            : `${voucherValue}%, toi da ${maxDiscountValue.toLocaleString("vi-VN")}?`}
        </b>
      </p>
      <p>Don toi thieu: {minOrderValue.toLocaleString("vi-VN")}?</p>
      <p>
        HSD:{" "}
        {new Intl.DateTimeFormat("vi-VN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(voucherExpiration))}
      </p>
      <p>Da su dung: {usedCount}</p>
    </div>
  );
};

const VoucherList = () => {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVouchers = async () => {
      try {
        const data = await listVouchers();
        const items = Array.isArray(data) ? data : data?.items || data?.data || [];

        const normalized = (Array.isArray(items) ? items : [])
          .map((voucher) => ({
            voucherCode: voucher.voucherCode || voucher.code,
            voucherValue: Number(voucher.voucherValue ?? voucher.value ?? 0),
            maxDiscountValue: Number(voucher.maxDiscountValue ?? voucher.maxDiscount ?? 0),
            minOrderValue: Number(voucher.minOrderValue ?? 0),
            voucherType:
              voucher.voucherType ||
              (voucher.type === "fixed" ? 1 : voucher.type === "percent" ? 2 : null),
            voucherExpiration: voucher.voucherExpiration || voucher.expiresAt,
            usedCount: Number(voucher.usedCount || 0),
          }))
          .sort((a, b) => b.usedCount - a.usedCount)
          .slice(0, 5);

        setVouchers(normalized);
      } catch (error) {
        console.error("Error fetching vouchers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVouchers();
  }, []);

  if (loading) {
    return <div className="voucher-loading">Dang tai danh sach voucher...</div>;
  }

  return (
    <div className="voucher-list">
      <div className="title-componet">
        <h3>VOUCHER</h3>
        <Link to="/voucher" className="viewAll">
          Xem tat ca
        </Link>
      </div>
      <div id="voucher-list-div">
        {vouchers.map((voucher) => (
          <Voucher
            key={voucher.voucherCode}
            voucherCode={voucher.voucherCode}
            voucherValue={voucher.voucherValue}
            maxDiscountValue={voucher.maxDiscountValue}
            minOrderValue={voucher.minOrderValue}
            voucherType={voucher.voucherType}
            voucherExpiration={voucher.voucherExpiration}
            usedCount={voucher.usedCount}
          />
        ))}
      </div>
    </div>
  );
};

export default VoucherList;

