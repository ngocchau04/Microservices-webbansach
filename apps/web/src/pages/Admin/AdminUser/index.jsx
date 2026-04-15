import { useState, useEffect, useMemo } from "react";
import "./AdminUser.css";
import { IoMdArrowDropright, IoMdArrowDropleft } from "react-icons/io";
import { FaSearch, FaUndoAlt, FaRegEdit, FaTrashAlt, FaLock, FaLockOpen, FaEye } from "react-icons/fa";
import AdminUserDetail from "./AdminUserDetail";
import {
  getUsers,
  updateUserStatus,
  updateUserByAdmin,
  deleteUserByAdmin,
} from "../../../api/authApi";

function isCustomerRow(user) {
  const role = String(user?.role ?? "user").toLowerCase();
  return role !== "admin";
}

function normalizePhone(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function isLockedUser(user) {
  const status = String(user?.status || "").toLowerCase();
  if (status) return status === "inactive" || status === "locked" || status === "disabled";
  return user?.isActive === false;
}

function statusLabel(user) {
  return isLockedUser(user) ? "Đã khóa" : "Hoạt động";
}

function AdminUser() {
  const [accs, setAccs] = useState([]);
  const [kh, setKh] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [nameDraft, setNameDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [filters, setFilters] = useState({ name: "", phone: "" });
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const customersPerPage = 10;

  const fetchAccounts = async () => {
    try {
      const response = await getUsers();
      const users = response?.data?.users || response?.data?.accs || [];
      const sortedAccs = users
        .filter(isCustomerRow)
        .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
      setAccs(sortedAccs);
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const filteredCustomers = useMemo(() => {
    const nameQuery = String(filters.name || "").trim().toLowerCase();
    const phoneQuery = normalizePhone(filters.phone);
    return accs.filter((customer) => {
      const nameOk = !nameQuery || String(customer?.name || "").toLowerCase().includes(nameQuery);
      const phoneOk = !phoneQuery || normalizePhone(customer?.sdt).includes(phoneQuery);
      return nameOk && phoneOk;
    });
  }, [accs, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / customersPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const indexOfLastCustomer = safePage * customersPerPage;
  const indexOfFirstCustomer = indexOfLastCustomer - customersPerPage;
  const currentCustomers = filteredCustomers.slice(indexOfFirstCustomer, indexOfLastCustomer);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handlePrevPage = () => {
    setCurrentPage((prevPage) => Math.max(prevPage - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prevPage) => Math.min(prevPage + 1, totalPages));
  };

  const applySearch = () => {
    setFilters({
      name: nameDraft.trim(),
      phone: phoneDraft.trim(),
    });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setNameDraft("");
    setPhoneDraft("");
    setFilters({ name: "", phone: "" });
    setCurrentPage(1);
  };

  const onCloseDetail = () => {
    setKh(null);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setEditName(user?.name || "");
    setEditEmail(user?.email || "");
    setEditPhone(user?.sdt || "");
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (submitting) return;
    setEditModalOpen(false);
    setEditingUser(null);
  };

  const handleSaveEdit = async () => {
    if (!editingUser?._id) return;
    const trimmedName = editName.trim();
    const trimmedEmail = editEmail.trim();
    const trimmedPhone = editPhone.trim();
    if (!trimmedName || !trimmedEmail) {
      alert("Vui lòng nhập đầy đủ tên và email.");
      return;
    }
    if (!window.confirm("Xác nhận cập nhật thông tin khách hàng?")) return;
    try {
      setSubmitting(true);
      const res = await updateUserByAdmin(editingUser._id, {
        name: trimmedName,
        email: trimmedEmail,
        sdt: trimmedPhone,
      });
      const updated = res?.data?.user || res?.data || null;
      if (!updated?._id) {
        throw new Error("Updated user payload is empty");
      }
      setAccs((prev) =>
        prev.map((item) => (String(item._id) === String(updated._id) ? { ...item, ...updated } : item))
      );
      if (kh && String(kh._id) === String(updated._id)) {
        setKh((prev) => ({ ...(prev || {}), ...updated }));
      }
      setEditModalOpen(false);
      setEditingUser(null);
      alert("Đã cập nhật thông tin khách hàng.");
    } catch (error) {
      console.error("Error updating user:", error);
      const msg = error?.response?.data?.message || "Không thể cập nhật khách hàng.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLock = async (user) => {
    const locked = isLockedUser(user);
    const nextActive = locked;
    const actionLabel = locked ? "mở khóa" : "khóa";
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionLabel} tài khoản này?`)) return;
    try {
      const res = await updateUserStatus(user._id, { isActive: nextActive });
      const updated = res?.data?.user || res?.data || null;
      if (!updated?._id) {
        throw new Error("Updated status payload is empty");
      }
      setAccs((prev) =>
        prev.map((item) => (String(item._id) === String(updated._id) ? { ...item, ...updated } : item))
      );
      if (kh && String(kh._id) === String(updated._id)) {
        setKh((prev) => ({ ...(prev || {}), ...updated }));
      }
    } catch (error) {
      console.error("Error toggling user lock:", error);
      const msg = error?.response?.data?.message || "Không thể cập nhật trạng thái tài khoản.";
      alert(msg);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Xác nhận xóa tài khoản khách hàng "${user?.name || user?._id}"?`)) return;
    try {
      await deleteUserByAdmin(user._id);
      setAccs((prev) => prev.filter((item) => String(item._id) !== String(user._id)));
      if (kh && String(kh._id) === String(user._id)) {
        setKh(null);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      const msg = error?.response?.data?.message || "Không thể xóa tài khoản khách hàng.";
      alert(msg);
    }
  };

  return (
    <>
      {kh ? (
        <AdminUserDetail user={kh} onClose={onCloseDetail} />
      ) : (
        <div className="admin-user">
          <header className="admin-user__head">
            <h1>Danh sách khách hàng</h1>
          </header>

          <section className="admin-user__toolbar">
            <div className="admin-user__search-grid">
              <label className="admin-user__search-item" htmlFor="admin-user-name-search">
                <span>Tên khách hàng</span>
                <input
                  id="admin-user-name-search"
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="Nhập tên cần tìm..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applySearch();
                  }}
                />
              </label>
              <label className="admin-user__search-item" htmlFor="admin-user-phone-search">
                <span>Số điện thoại</span>
                <input
                  id="admin-user-phone-search"
                  type="text"
                  value={phoneDraft}
                  onChange={(e) => setPhoneDraft(e.target.value)}
                  placeholder="Nhập số điện thoại..."
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applySearch();
                  }}
                />
              </label>
            </div>
            <div className="admin-user__toolbar-actions">
              <button type="button" className="admin-user__action-btn admin-user__action-btn--search" onClick={applySearch}>
                <FaSearch />
                <span>Tìm kiếm</span>
              </button>
              <button type="button" className="admin-user__action-btn admin-user__action-btn--reset" onClick={clearFilters}>
                <FaUndoAlt />
                <span>Xóa lọc</span>
              </button>
            </div>
          </section>

          <div className="admin-user__table-wrap">
            <table className="admin-user__table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã khách hàng</th>
                  <th>Tên</th>
                  <th>Email</th>
                  <th>Số điện thoại</th>
                  <th>Trạng thái</th>
                  <th>Quản lý</th>
                </tr>
              </thead>
              <tbody>
                {currentCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="admin-user__empty">
                      Không tìm thấy khách hàng theo bộ lọc hiện tại.
                    </td>
                  </tr>
                ) : (
                  currentCustomers.map((customer, index) => {
                    const locked = isLockedUser(customer);
                    return (
                      <tr key={customer._id}>
                        <td className="stt">{indexOfFirstCustomer + index + 1}</td>
                        <td className="admin-user__id" title={String(customer._id)}>
                          {String(customer._id).slice(0, 12)}...
                        </td>
                        <td>{customer.name}</td>
                        <td>{customer.email}</td>
                        <td>{customer.sdt || "—"}</td>
                        <td>
                          <span
                            className={`admin-user__status${
                              locked ? " admin-user__status--locked" : " admin-user__status--active"
                            }`}
                          >
                            {statusLabel(customer)}
                          </span>
                        </td>
                        <td>
                          <div className="admin-user__row-actions">
                            <button type="button" className="admin-user__mini-btn" onClick={() => setKh(customer)}>
                              <FaEye />
                              <span>Chi tiết</span>
                            </button>
                            <button type="button" className="admin-user__mini-btn admin-user__mini-btn--edit" onClick={() => openEditModal(customer)}>
                              <FaRegEdit />
                              <span>Sửa</span>
                            </button>
                            <button
                              type="button"
                              className={`admin-user__mini-btn ${
                                locked ? "admin-user__mini-btn--unlock" : "admin-user__mini-btn--lock"
                              }`}
                              onClick={() => handleToggleLock(customer)}
                            >
                              {locked ? <FaLockOpen /> : <FaLock />}
                              <span>{locked ? "Mở khóa" : "Khóa"}</span>
                            </button>
                            <button type="button" className="admin-user__mini-btn admin-user__mini-btn--delete" onClick={() => handleDeleteUser(customer)}>
                              <FaTrashAlt />
                              <span>Xóa</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <button className="arrow" onClick={handlePrevPage} disabled={safePage === 1}>
              <IoMdArrowDropleft style={{ marginBottom: "-3px" }} />
            </button>
            <span>
              {" "}
              {safePage}/{totalPages}{" "}
            </span>
            <button className="arrow" onClick={handleNextPage} disabled={safePage === totalPages}>
              <IoMdArrowDropright style={{ marginBottom: "-3px" }} />
            </button>
          </div>
        </div>
      )}

      {editModalOpen && editingUser ? (
        <div className="admin-user-modal-overlay" role="presentation" onClick={closeEditModal}>
          <div className="admin-user-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
            <header className="admin-user-modal__head">
              <h3>Chỉnh sửa khách hàng</h3>
              <button type="button" className="admin-user-modal__close" onClick={closeEditModal} disabled={submitting}>
                ×
              </button>
            </header>
            <div className="admin-user-modal__body">
              <label>
                <span>Họ và tên</span>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </label>
              <label>
                <span>Email</span>
                <input type="text" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </label>
              <label>
                <span>Số điện thoại</span>
                <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </label>
            </div>
            <footer className="admin-user-modal__foot">
              <button type="button" className="admin-user-modal__btn admin-user-modal__btn--cancel" onClick={closeEditModal} disabled={submitting}>
                Hủy
              </button>
              <button type="button" className="admin-user-modal__btn admin-user-modal__btn--save" onClick={handleSaveEdit} disabled={submitting}>
                {submitting ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default AdminUser;
