import { useState, useEffect } from "react";
import './AdminUser.css';
import { IoMdArrowDropright } from "react-icons/io";
import { IoMdArrowDropleft } from "react-icons/io";
import AdminUserDetail from "./AdminUserDetail"; 
import { getUsers } from "../../../api/authApi";

/** Defensive filter: customer list must not show admin/staff accounts (API should already exclude them). */
function isCustomerRow(user) {
  const role = String(user?.role ?? "user").toLowerCase();
  return role !== "admin";
}

function AdminUser()
{
    const [accs, setAccs] = useState([]);
    const [kh, setKh] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const customersPerPage = 10;
    const fetchAccounts = async () => {
        try {
            const response = await getUsers();
            const users = response?.data?.users || response?.data?.accs || [];
            const sortedAccs = users.sort((a, b) =>
              String(a?.name || "").localeCompare(String(b?.name || ""))
            );
            setAccs(sortedAccs);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        }
    };
    useEffect(() => {
        fetchAccounts();
    }, []);
    const accos = accs.filter(isCustomerRow);
    const indexOfLastCustomer = currentPage * customersPerPage;
    const indexOfFirstCustomer = indexOfLastCustomer - customersPerPage;
    const currentCustomers = accos.slice(indexOfFirstCustomer, indexOfLastCustomer);
    // Chuyển đến trang trước
    const handlePrevPage = () => {
        setCurrentPage(prevPage => Math.max(prevPage-1, 1));
    };

    // Chuyển đến trang sau
    const handleNextPage = () => {
        setCurrentPage(prevPage => Math.min(prevPage + 1, Math.ceil(accos.length / customersPerPage)));
    };

    const onClose =()=>{
        setKh(null);
    }
    return(
        <>
        {kh ? <AdminUserDetail user={kh} onClose={onClose}/> : 
        <>
            <div style={{height:"20px"}}/>
            <h1>Danh sách khách hàng</h1>
            <div style={{height:"20px"}}/>
            <table>
            <thead>
                <tr>
                    <th>STT</th>
                    <th>Mã khách hàng</th>
                    <th>Tên</th>
                    <th>Email</th>
                    <th>Số điện thoại</th>
                    <th>Chi tiết</th>
                </tr>
            </thead>
            <tbody>
                {currentCustomers.map((customer, index) => (
                    <tr key={customer._id}>
                        <td className="stt">{indexOfFirstCustomer+index+1}</td>
                        <td>{customer._id}</td>
                        <td>{customer.name}</td>
                        <td>{customer.email}</td>
                        <td>{customer.sdt}</td>
                        <td className="ttct"><div onClick={()=>setKh(customer)}>Thông tin chi tiết</div></td>
                    </tr>
                ))}
            </tbody>
            </table>
            <div className="pagination">
                <button className="arrow" onClick={handlePrevPage} disabled={currentPage === 1}>
                <IoMdArrowDropleft style={{"marginBottom":"-3px"}}/></button>
                <span> {currentPage} </span>
                <button className="arrow" onClick={handleNextPage} disabled={currentPage === Math.ceil(
                accos.length/customersPerPage)}><IoMdArrowDropright style={{"marginBottom":"-3px"}}/></button>
            </div>
        </>
        }
        </>
    )
}

export default AdminUser
