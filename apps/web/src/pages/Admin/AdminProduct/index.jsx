import React, { useState, useEffect } from "react";
import "./AdminProduct.css";
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from "../../../api/catalogApi";
import { uploadImage } from "../../../api/mediaApi";

const AdminProduct = () => {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    imgSrc: "",
    title: "",
    author: "",
    translator: "",
    price: 0,
    sku: "",
    ageGroup: "",
    supplier: "",
    publisher: "",
    language: "",
    weight: "",
    dimensions: "",
    pages: 0,
    binding: "",
    description: "",
    type: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fieldLabels = {
    imgSrc: "URL Hình Ảnh",
    title: "Tiêu Đề",
    author: "Tác Giả",
    translator: "Người Biên Dịch",
    price: "Giá",
    sku: "Mã Sản Phẩm (SKU)",
    ageGroup: "Nhóm Tuổi",
    supplier: "Nhà Cung Cấp",
    publisher: "Nhà Xuất Bản",
    language: "Ngôn Ngữ",
    weight: "Trọng Lượng",
    dimensions: "Kích Thước",
    pages: "Số Trang",
    binding: "Loại Bìa",
    description: "Mô Tả",
    type: "Loại Sách",
  };

  // Fetch all products
  useEffect(() => {
    getProducts({ page: 1, limit: 200 })
      .then((response) => {
        setProducts(response.data.items || response.data.products || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching products:", error);
        setError("Không thể tải danh sách sản phẩm.");
      });
  }, []);

  // Add a new product
  const handleAddProduct = () => {
    createProduct(newProduct)
      .then((response) => {
        const created = response?.data?.item || response?.data?.data;
        setProducts([...products, created]);
        setNewProduct({
          imgSrc: "",
          title: "",
          author: "",
          translator: "",
          price: 0,
          sku: "",
          ageGroup: "",
          supplier: "",
          publisher: "",
          language: "",
          weight: "",
          dimensions: "",
          pages: 0,
          binding: "",
          description: "",
          type: "",
        });
        alert("Thêm sản phẩm mới thành công!");
      })
      .catch((error) => {
        console.error("Lỗi khi thêm sản phẩm:", error);
        alert("Thêm sản phẩm thất bại.");
      });
  };

  // Update an existing product
  const handleUpdateProduct = () => {
    if (!selectedProduct) return;
    updateProduct(selectedProduct._id, selectedProduct)
      .then((response) => {
        const updated = response?.data?.item || response?.data?.data;
        const updatedProducts = products.map((product) =>
          product._id === selectedProduct._id ? updated : product
        );
        setProducts(updatedProducts);
        setSelectedProduct(null);
        alert("Cập nhật sản phẩm thành công!");
      })
      .catch((error) => {
        console.error("Lỗi khi cập nhật sản phẩm:", error);
        alert("Cập nhật sản phẩm thất bại.");
      });
  };

  // Delete a product
  const handleDeleteProduct = (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này không?")) return;
    deleteProduct(id)
      .then(() => {
        const updatedProducts = products.filter((product) => product._id !== id);
        setProducts(updatedProducts);
        alert("Xóa sản phẩm thành công!");
      })
      .catch((error) => {
        console.error("Lỗi khi xóa sản phẩm:", error);
        alert("Xóa sản phẩm thất bại.");
      });
  };

  if (loading) return <p>Đang tải dữ liệu...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  const handleUploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("imageUrl", file);
    try {
      const data = await uploadImage(formData);
      setNewProduct({ ...newProduct, imgSrc: data.imageUrl || data.url || "" });
      alert("Upload ảnh thành công!");
    } catch (error) {
      console.error("Lỗi khi upload ảnh:", error);
      alert("Upload ảnh thất bại.");
    }
  }

  return (
    <div className="admin-product-container">
      <h1>Quản Lý Sản Phẩm</h1>
      <div className="upload-container">
        <h2>Upload Ảnh</h2>
        <input type="file" onChange={handleUploadImage} />
        <p> URL Ảnh: {newProduct.imgSrc}</p>
      </div>
      {/* Add New Product */}
      <div className="admin-product-actions">
        <h2>Thêm Sản Phẩm Mới</h2>
        {Object.keys(newProduct).map((key) => (
          <div key={key} className="form-group">
            <label>{fieldLabels[key]}</label>
            {key === "description" ? (
              <textarea
                placeholder={fieldLabels[key]}
                value={newProduct[key]}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, [key]: e.target.value })
                }
              />
            ) : (
              <input
                type={typeof newProduct[key] === "number" ? "number" : "text"}
                placeholder={fieldLabels[key]}
                value={newProduct[key]}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, [key]: e.target.value })
                }
              />
            )}
          </div>
        ))}
        <button onClick={handleAddProduct}>Thêm Sản Phẩm</button>
      </div>

      {/* Product List */}
      <div className="admin-product-list">
        <h2>Danh Sách Sản Phẩm</h2>
        <table>
          <thead>
            <tr>
              <th>Tiêu Đề</th>
              <th>Tác Giả</th>
              <th>Giá</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product._id}>
                <td>{product.title}</td>
                <td>{product.author}</td>
                <td>{product.price.toLocaleString()} VND</td>
                <td>
                  <button onClick={() => setSelectedProduct(product)}>Sửa</button>
                  <button onClick={() => handleDeleteProduct(product._id)}>Xóa</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Selected Product */}
      {selectedProduct && (
        <div className="admin-product-edit">
          <h2>Sửa Sản Phẩm</h2>
          {Object.keys(selectedProduct).map((key) => (
            <div key={key} className="form-group">
              <label>{fieldLabels[key]}</label>
              {key === "description" ? (
                <textarea
                  placeholder={fieldLabels[key]}
                  value={selectedProduct[key]}
                  onChange={(e) =>
                    setSelectedProduct({
                      ...selectedProduct,
                      [key]: e.target.value,
                    })
                  }
                />
              ) : (
                <input
                  type={typeof selectedProduct[key] === "number" ? "number" : "text"}
                  placeholder={fieldLabels[key]}
                  value={selectedProduct[key]}
                  onChange={(e) =>
                    setSelectedProduct({
                      ...selectedProduct,
                      [key]: e.target.value,
                    })
                  }
                />
              )}
            </div>
          ))}
          <button onClick={handleUpdateProduct}>Cập Nhật</button>
        </div>
      )}
    </div>
  );
};

export default AdminProduct;
