import React, { useEffect, useMemo, useState } from "react";
import "./AdminProduct.css";
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from "../../../api/catalogApi";
import { uploadImage } from "../../../api/mediaApi";

const AdminProduct = () => {
  const STOCK_FILTERS = {
    ALL: "all",
    LOW: "low",
    OUT: "out",
  };

  const getStockValue = (product) => {
    const value = Number(product?.stock);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  };

  const getStockStatus = (stock) => {
    if (stock <= 0) {
      return { key: "out", label: "Hết hàng" };
    }
    if (stock < 5) {
      return { key: "low", label: "Sắp hết" };
    }
    return { key: "normal", label: "Ổn định" };
  };

  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockFilter, setStockFilter] = useState(STOCK_FILTERS.ALL);
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
    stock: 20,
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
    stock: "Tồn Kho",
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
          stock: 20,
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

  const inventorySummary = useMemo(() => {
    const summary = {
      out: 0,
      low: 0,
      normal: 0,
    };

    products.forEach((product) => {
      const stock = getStockValue(product);
      const status = getStockStatus(stock).key;
      if (status === "out") {
        summary.out += 1;
      } else if (status === "low") {
        summary.low += 1;
      } else {
        summary.normal += 1;
      }
    });

    return summary;
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (stockFilter === STOCK_FILTERS.ALL) {
      return products;
    }
    return products.filter((product) => {
      const status = getStockStatus(getStockValue(product)).key;
      return stockFilter === STOCK_FILTERS.LOW
        ? status === "low"
        : status === "out";
    });
  }, [products, stockFilter]);

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
      <header className="admin-product-header">
        <p className="admin-product-header__eyebrow">Bookie Admin</p>
        <h1>Quản Lý Sản Phẩm</h1>
        <p className="admin-product-header__desc">
          Quản lý thư viện sản phẩm với biểu mẫu chuẩn hóa, tải ảnh nhanh và cập nhật dữ liệu theo
          cùng một luồng thao tác.
        </p>
      </header>

      <div className="upload-container admin-product-card">
        <div className="admin-product-card__head">
          <h2>Upload Ảnh</h2>
          <p>Tải hình trước để điền URL tự động vào biểu mẫu thêm sản phẩm.</p>
        </div>
        <label className="upload-container__field" htmlFor="admin-product-image-upload">
          <span>Chọn ảnh sản phẩm</span>
          <input id="admin-product-image-upload" type="file" onChange={handleUploadImage} />
        </label>
        <p className="upload-container__url">
          <strong>URL ảnh:</strong>{" "}
          <span>{newProduct.imgSrc ? newProduct.imgSrc : "Chưa có ảnh nào được tải lên."}</span>
        </p>
      </div>

      {/* Add New Product */}
      <div className="admin-product-actions admin-product-card">
        <div className="admin-product-card__head">
          <h2>Thêm Sản Phẩm Mới</h2>
          <p>Điền đầy đủ thông tin sản phẩm để thêm vào danh mục bán hàng.</p>
        </div>
        <div className="admin-product-form-grid">
          {Object.keys(newProduct).map((key) => {
            const label = fieldLabels[key] || key;
            return (
              <div key={key} className={`form-group${key === "description" ? " form-group--full" : ""}`}>
                <label>{label}</label>
                {key === "description" ? (
                  <textarea
                    placeholder={label}
                    value={newProduct[key]}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, [key]: e.target.value })
                    }
                  />
                ) : (
                  <input
                    type={typeof newProduct[key] === "number" ? "number" : "text"}
                    placeholder={label}
                    value={newProduct[key]}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, [key]: e.target.value })
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
        <button className="admin-product-btn admin-product-btn--primary" onClick={handleAddProduct}>
          Thêm Sản Phẩm
        </button>
      </div>

      {/* Product List */}
      <div className="admin-product-list admin-product-card">
        <div className="admin-product-card__head">
          <h2>Danh Sách Sản Phẩm</h2>
          <p>Theo dõi nhanh tiêu đề, tác giả, giá và tồn kho để xử lý kịp thời sản phẩm sắp hết.</p>
        </div>

        <div className="admin-product-inventory-summary" role="status" aria-live="polite">
          <article className="admin-product-inventory-card admin-product-inventory-card--out">
            <p>Hết hàng</p>
            <strong>{inventorySummary.out}</strong>
          </article>
          <article className="admin-product-inventory-card admin-product-inventory-card--low">
            <p>Sắp hết hàng</p>
            <strong>{inventorySummary.low}</strong>
          </article>
        </div>

        <div className="admin-product-stock-filter">
          <button
            type="button"
            className={`admin-product-stock-filter__btn${
              stockFilter === STOCK_FILTERS.ALL ? " is-active" : ""
            }`}
            onClick={() => setStockFilter(STOCK_FILTERS.ALL)}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`admin-product-stock-filter__btn${
              stockFilter === STOCK_FILTERS.LOW ? " is-active" : ""
            }`}
            onClick={() => setStockFilter(STOCK_FILTERS.LOW)}
          >
            Sắp hết
          </button>
          <button
            type="button"
            className={`admin-product-stock-filter__btn${
              stockFilter === STOCK_FILTERS.OUT ? " is-active" : ""
            }`}
            onClick={() => setStockFilter(STOCK_FILTERS.OUT)}
          >
            Hết hàng
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>Tiêu Đề</th>
              <th>Tác Giả</th>
              <th>Giá</th>
              <th>Tồn Kho</th>
              <th>Trạng thái kho</th>
              <th>Hành Động</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length ? (
              filteredProducts.map((product) => {
                const stock = getStockValue(product);
                const stockStatus = getStockStatus(stock);
                return (
                  <tr key={product._id}>
                    <td>{product.title}</td>
                    <td>{product.author}</td>
                    <td>{Number(product.price || 0).toLocaleString()} VND</td>
                    <td>{stock}</td>
                    <td>
                      <span className={`admin-product-stock-badge admin-product-stock-badge--${stockStatus.key}`}>
                        {stockStatus.label}
                      </span>
                    </td>
                    <td>
                      <button
                        className="admin-product-btn admin-product-btn--table-edit"
                        onClick={() => setSelectedProduct(product)}
                      >
                        Sửa
                      </button>
                      <button
                        className="admin-product-btn admin-product-btn--table-delete"
                        onClick={() => handleDeleteProduct(product._id)}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="admin-product-table-empty">
                  Không có sản phẩm phù hợp với bộ lọc tồn kho hiện tại.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Selected Product */}
      {selectedProduct && (
        <div className="admin-product-edit admin-product-card">
          <div className="admin-product-card__head">
            <h2>Sửa Sản Phẩm</h2>
            <p>Cập nhật thông tin chi tiết cho sản phẩm đang được chọn trong bảng.</p>
          </div>
          <div className="admin-product-form-grid">
            {Object.keys(selectedProduct).map((key) => {
              const label = fieldLabels[key] || key;
              return (
                <div key={key} className={`form-group${key === "description" ? " form-group--full" : ""}`}>
                  <label>{label}</label>
                  {key === "description" ? (
                    <textarea
                      placeholder={label}
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
                      placeholder={label}
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
              );
            })}
          </div>
          <button className="admin-product-btn admin-product-btn--primary" onClick={handleUpdateProduct}>
            Cập Nhật
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminProduct;
