import { useEffect, useState } from "react";
import { getAdminFeedback, updateAdminFeedbackStatus } from "../../../api/supportApi";
import "./AdminSupport.css";

const STATUS_OPTIONS = ["open", "in_progress", "resolved", "closed"];

function AdminSupport() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchFeedback = async () => {
    try {
      const response = await getAdminFeedback();
      const list = response?.data?.items || [];
      setItems(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error("Error fetching support feedback:", error);
      alert("Khong the tai danh sach feedback.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const handleChangeStatus = async (feedbackId, nextStatus) => {
    setUpdatingId(feedbackId);
    try {
      await updateAdminFeedbackStatus(feedbackId, { status: nextStatus });
      setItems((prev) =>
        prev.map((item) =>
          String(item._id) === String(feedbackId) ? { ...item, status: nextStatus } : item
        )
      );
    } catch (error) {
      console.error("Error updating support status:", error);
      alert("Cap nhat trang thai that bai.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return <p>Dang tai danh sach feedback...</p>;
  }

  return (
    <div className="admin-support-container">
      <h1>Quan ly feedback</h1>
      <table>
        <thead>
          <tr>
            <th>STT</th>
            <th>Ma ticket</th>
            <th>User</th>
            <th>Subject</th>
            <th>Category</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item._id}>
              <td className="stt">{index + 1}</td>
              <td>{item._id}</td>
              <td>{item.userEmail}</td>
              <td>{item.subject}</td>
              <td>{item.category}</td>
              <td>{item.priority}</td>
              <td>
                <select
                  value={item.status}
                  disabled={updatingId === item._id}
                  onChange={(e) => handleChangeStatus(item._id, e.target.value)}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </td>
              <td>{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 ? <p>Khong co feedback nao.</p> : null}
    </div>
  );
}

export default AdminSupport;
