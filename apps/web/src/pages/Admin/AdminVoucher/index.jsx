import { useState, useEffect } from "react";
import "./AdminVoucher.css";
import { IoMdArrowDropright, IoMdArrowDropleft } from "react-icons/io";
import { createVoucher, deleteVoucher, listVouchers } from "../../../api/checkoutApi";

function AdminVoucher() {
  const [currentPage, setCurrentPage] = useState(1);
  const vouchersPerPage = 5;
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newVoucher, setNewVoucher] = useState({
    voucherCode: "",
    voucherValue: "",
    voucherType: "",
    maxDiscountValue: "",
    minOrderValue: "",
    voucherExpiration: "",
  });

  const normalizeVoucher = (voucher) => ({
    _id: voucher._id,
    voucherCode: voucher.voucherCode || voucher.code,
    voucherValue: Number(voucher.voucherValue ?? voucher.value ?? 0),
    voucherType:
      voucher.voucherType ||
      (voucher.type === "fixed" ? 1 : voucher.type === "percent" ? 2 : null),
    maxDiscountValue: Number(voucher.maxDiscountValue ?? voucher.maxDiscount ?? 0),
    minOrderValue: Number(voucher.minOrderValue ?? 0),
    voucherExpiration: voucher.voucherExpiration || voucher.expiresAt,
    usedCount: Number(voucher.usedCount || 0),
  });

  const fetchVouchers = async () => {
    try {
      const data = await listVouchers();
      const items = Array.isArray(data) ? data : data?.items || data?.data || [];
      const normalized = Array.isArray(items)
        ? items.map(normalizeVoucher).sort((a, b) => b.usedCount - a.usedCount)
        : [];
      setVouchers(normalized);
    } catch (error) {
      console.error("Error fetching vouchers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const handleAddVoucher = async () => {
    if (!newVoucher.voucherCode) {
      alert("Vui long nhap Ma voucher!");
      return;
    }
    if (!newVoucher.voucherType) {
      alert("Vui long chon Loai voucher!");
      return;
    }
    if (!newVoucher.voucherValue) {
      alert("Vui long nhap Gia tri voucher!");
      return;
    }
    if (newVoucher.voucherType === 2 && !newVoucher.maxDiscountValue) {
      alert("Vui long nhap Gia tri giam toi da cho voucher %!");
      return;
    }
    if (!newVoucher.minOrderValue) {
      alert("Vui long nhap Gia tri don hang toi thieu!");
      return;
    }
    if (!newVoucher.voucherExpiration) {
      alert("Vui long nhap Ngay het han!");
      return;
    }

    const isVoucherExist = vouchers.some(
      (voucher) => voucher.voucherCode === newVoucher.voucherCode
    );
    if (isVoucherExist) {
      alert("Ma voucher da ton tai!");
      return;
    }

    try {
      await createVoucher({
        voucherCode: newVoucher.voucherCode,
        voucherType: Number(newVoucher.voucherType),
        voucherValue: Number(newVoucher.voucherValue),
        maxDiscountValue:
          newVoucher.voucherType === 2
            ? Number(newVoucher.maxDiscountValue)
            : null,
        minOrderValue: Number(newVoucher.minOrderValue),
        voucherExpiration: newVoucher.voucherExpiration,
      });

      alert("Them voucher thanh cong!");

      setNewVoucher({
        voucherCode: "",
        voucherValue: "",
        voucherType: "",
        maxDiscountValue: "",
        minOrderValue: "",
        voucherExpiration: "",
      });

      fetchVouchers();
    } catch (error) {
      console.error("Error adding voucher:", error);
      alert("Khong the them voucher, vui long thu lai!");
    }
  };

  const handleDelete = async (voucherId) => {
    const confirmDelete = window.confirm("Ban co chac chan muon xoa voucher nay khong?");
    if (!confirmDelete) {
      return;
    }

    try {
      await deleteVoucher(voucherId);
      setVouchers(vouchers.filter((voucher) => voucher._id !== voucherId));
      alert("Xoa voucher thanh cong!");
    } catch (error) {
      console.error("Error deleting voucher:", error);
      alert("Khong the xoa voucher, vui long thu lai!");
    }
  };

  if (loading) {
    return <div className="voucher-loading">Dang tai danh sach voucher...</div>;
  }

  const indexOfLastVoucher = currentPage * vouchersPerPage;
  const indexOfFirstVoucher = indexOfLastVoucher - vouchersPerPage;
  const currentVouchers = vouchers.slice(indexOfFirstVoucher, indexOfLastVoucher);

  const handlePrevPage = () => {
    setCurrentPage((prevPage) => Math.max(prevPage - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prevPage) =>
      Math.min(prevPage + 1, Math.ceil(vouchers.length / vouchersPerPage))
    );
  };

  return (
    <>
      <div style={{ height: "20px" }} />
      <h1>Quan ly voucher</h1>
      <div style={{ height: "20px" }} />

      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Ma voucher</th>
            <th>Gia tri</th>
            <th>Giam toi da</th>
            <th>Don hang toi thieu</th>
            <th>Han su dung</th>
            <th>Da su dung</th>
            <th>Hanh dong</th>
          </tr>
        </thead>
        <tbody>
          {currentVouchers.map((voucher, index) => (
            <tr key={voucher._id}>
              <td className="stt">{indexOfFirstVoucher + index + 1}</td>
              <td>{voucher.voucherCode}</td>
              <td>
                {voucher.voucherType === 1
                  ? `${voucher.voucherValue.toLocaleString()}?`
                  : `${voucher.voucherValue}%`}
              </td>
              <td>
                {voucher.voucherType === 1
                  ? `${voucher.voucherValue.toLocaleString()}?`
                  : voucher.maxDiscountValue
                  ? `${voucher.maxDiscountValue.toLocaleString()}?`
                  : ""}
              </td>
              <td>{voucher.minOrderValue.toLocaleString()}?</td>
              <td>{new Date(voucher.voucherExpiration).toLocaleDateString("vi-VN")}</td>
              <td>{voucher.usedCount}</td>
              <td>
                <button className="delete-btn" onClick={() => handleDelete(voucher._id)}>
                  Xoa
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button className="arrow" onClick={handlePrevPage} disabled={currentPage === 1}>
          <IoMdArrowDropleft style={{ marginBottom: "-3px" }} />
        </button>
        <span> {currentPage} </span>
        <button
          className="arrow"
          onClick={handleNextPage}
          disabled={currentPage === Math.ceil(vouchers.length / vouchersPerPage)}
        >
          <IoMdArrowDropright style={{ marginBottom: "-3px" }} />
        </button>
      </div>

      <div className="add-voucher-title">
        <h1>Them voucher moi</h1>
      </div>
      <div className="add-voucher-form">
        <input
          type="text"
          placeholder="Ma voucher"
          value={newVoucher.voucherCode}
          onChange={(e) => setNewVoucher({ ...newVoucher, voucherCode: e.target.value })}
        />

        <select
          value={newVoucher.voucherType}
          onChange={(e) => setNewVoucher({ ...newVoucher, voucherType: Number(e.target.value) })}
          required
          style={{
            color: newVoucher.voucherType === "" ? "#666" : "#000",
          }}
        >
          <option value="" disabled hidden>
            Loai voucher
          </option>
          <option value={1}>Tien</option>
          <option value={2}>Phan tram</option>
        </select>

        <input
          type="number"
          placeholder="Gia tri"
          value={newVoucher.voucherValue}
          onChange={(e) => setNewVoucher({ ...newVoucher, voucherValue: e.target.value })}
        />

        <input
          type="number"
          placeholder="Giam toi da (neu la %)"
          value={newVoucher.maxDiscountValue}
          onChange={(e) => setNewVoucher({ ...newVoucher, maxDiscountValue: e.target.value })}
        />

        <input
          type="number"
          placeholder="Don hang toi thieu"
          value={newVoucher.minOrderValue}
          onChange={(e) => setNewVoucher({ ...newVoucher, minOrderValue: e.target.value })}
        />

        <input
          className="date-input"
          type="date"
          style={{ color: "#666" }}
          value={newVoucher.voucherExpiration}
          onChange={(e) => setNewVoucher({ ...newVoucher, voucherExpiration: e.target.value })}
        />

        <button className="add-btn" onClick={handleAddVoucher}>
          Them voucher
        </button>
      </div>
    </>
  );
}

export default AdminVoucher;

