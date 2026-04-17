import { useEffect, useMemo, useRef, useState } from "react";
import "./AdminProduct.css";
import {
  createProduct,
  deleteProduct,
  getProducts,
  searchProducts,
  updateProduct,
} from "../../../api/catalogApi";
import { uploadImage } from "../../../api/mediaApi";

const emptyProductForm = () => ({
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

const STOCK_FILTERS = {
  ALL: "all",
  LOW: "low",
  OUT: "out",
};

const extractCatalogItems = (response) => {
  const body = response?.data;
  if (!body) {
    return [];
  }
  if (Array.isArray(body)) {
    return body;
  }
  const items =
    body.items ??
    body.products ??
    body.data?.items ??
    body.data?.products ??
    body.legacy?.products;
  return Array.isArray(items) ? items : [];
};

const mergeProductsById = (primary = [], secondary = []) => {
  const merged = [];
  const seen = new Set();

  const pushUnique = (items) => {
    items.forEach((item) => {
      const id = String(item?._id ?? item?.id ?? "");
      if (!id || seen.has(id)) {
        return;
      }
      seen.add(id);
      merged.push(item);
    });
  };

  pushUnique(primary);
  pushUnique(secondary);
  return merged;
};

const AdminProduct = () => {

  const getStockValue = (product) => {
    const raw = product?.stock;
    if (raw === undefined || raw === null || raw === "") {
      return null;
    }
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : null;
  };

  const getStockStatus = (stock) => {
    if (stock === null) {
      return { key: "unknown", label: "Chưa cập nhật" };
    }
    if (stock === 0) {
      return { key: "out", label: "Hết hàng" };
    }
    if (stock <= 5) {
      return { key: "low", label: "Sắp hết" };
    }
    return { key: "normal", label: "Còn hàng" };
  };

  const [products, setProducts] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [stockFilter, setStockFilter] = useState(STOCK_FILTERS.ALL);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const formCardRef = useRef(null);
  const titleInputRef = useRef(null);

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

  const formKeys = useMemo(() => Object.keys(emptyProductForm()), []);

  const loadProductIntoForm = (product) => {
    const next = emptyProductForm();
    for (const key of formKeys) {
      const v = product[key];
      if (v === undefined || v === null) {
        next[key] = emptyProductForm()[key];
      } else if (typeof emptyProductForm()[key] === "number") {
        const n = Number(v);
        next[key] = Number.isFinite(n) ? n : 0;
      } else {
        next[key] = v;
      }
    }
    setProductForm(next);
    setEditingId(String(product._id));
  };

  const resetFormAndEdit = () => {
    setProductForm(emptyProductForm());
    setEditingId(null);
  };

  useEffect(() => {
    Promise.allSettled([
      getProducts({ page: 1, limit: 200, includeHidden: true }),
      searchProducts({ page: 1, limit: 200, includeHidden: true }),
    ])
      .then(([productsResult, searchResult]) => {
        const fromProducts =
          productsResult.status === "fulfilled"
            ? extractCatalogItems(productsResult.value)
            : [];
        const fromSearch =
          searchResult.status === "fulfilled"
            ? extractCatalogItems(searchResult.value)
            : [];

        const merged = mergeProductsById(fromProducts, fromSearch);
        setProducts(merged);
        setLoading(false);

        if (!merged.length) {
          const productsErr =
            productsResult.status === "rejected" ? productsResult.reason : null;
          const searchErr =
            searchResult.status === "rejected" ? searchResult.reason : null;
          if (productsErr || searchErr) {
            throw productsErr || searchErr;
          }
        }
      })
      .catch((err) => {
        console.error("Error fetching products:", err);
        setError("Không thể tải danh sách sản phẩm.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!editingId) {
      return;
    }
    formCardRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    window.setTimeout(() => {
      titleInputRef.current?.focus();
    }, 220);
  }, [editingId]);

  const handleSaveProduct = () => {
    if (editingId) {
      const current = products.find((p) => String(p._id) === editingId);
      updateProduct(editingId, {
        ...productForm,
        isHidden: current?.isHidden ?? false,
      })
        .then((response) => {
          const updated = response?.data?.item || response?.data?.data;
          setProducts((prev) =>
            prev.map((p) => (String(p._id) === editingId ? updated : p))
          );
          resetFormAndEdit();
          alert("Cập nhật sản phẩm thành công!");
        })
        .catch((err) => {
          console.error("Lỗi khi cập nhật sản phẩm:", err);
          alert("Cập nhật sản phẩm thất bại.");
        });
      return;
    }

    createProduct({ ...productForm, isHidden: false })
      .then((response) => {
        const created = response?.data?.item || response?.data?.data;
        setProducts((prev) => [...prev, created]);
        resetFormAndEdit();
        alert("Thêm sản phẩm mới thành công!");
      })
      .catch((err) => {
        console.error("Lỗi khi thêm sản phẩm:", err);
        alert("Thêm sản phẩm thất bại.");
      });
  };

  const handleToggleHidden = (product) => {
    const nextHidden = !product.isHidden;
    updateProduct(product._id, { isHidden: nextHidden })
      .then((response) => {
        const updated = response?.data?.item || response?.data?.data;
        setProducts((prev) =>
          prev.map((p) => (p._id === product._id ? updated : p))
        );
      })
      .catch((err) => {
        console.error("Lỗi khi cập nhật trạng thái hiển thị:", err);
        alert("Không thể đổi trạng thái ẩn/hiện.");
      });
  };

  const handleDeleteProduct = (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa sản phẩm này không?")) return;
    deleteProduct(id)
      .then(() => {
        setProducts((prev) => prev.filter((product) => product._id !== id));
        if (String(editingId) === String(id)) {
          resetFormAndEdit();
        }
        alert("Xóa sản phẩm thành công!");
      })
      .catch((err) => {
        console.error("Lỗi khi xóa sản phẩm:", err);
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
      } else if (status === "normal") {
        summary.normal += 1;
      }
    });

    return summary;
  }, [products]);

  const listQuickStats = useMemo(() => {
    const hiddenCount = products.reduce(
      (n, p) => n + (p.isHidden ? 1 : 0),
      0
    );
    return {
      total: products.length,
      lowStock: inventorySummary.low,
      hidden: hiddenCount,
    };
  }, [products, inventorySummary.low]);

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
      setProductForm((prev) => ({
        ...prev,
        imgSrc: data.imageUrl || data.url || "",
      }));
      alert("Upload ảnh thành công!");
    } catch (err) {
      console.error("Lỗi khi upload ảnh:", err);
      alert("Upload ảnh thất bại.");
    }
  };

  const isEditMode = Boolean(editingId);

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
          <p>Tải hình trước để điền URL tự động vào biểu mẫu bên dưới.</p>
        </div>
        <label className="upload-container__field" htmlFor="admin-product-image-upload">
          <span>Chọn ảnh sản phẩm</span>
          <input id="admin-product-image-upload" type="file" onChange={handleUploadImage} />
        </label>
        <p className="upload-container__url">
          <strong>URL ảnh:</strong>{" "}
          <span>{productForm.imgSrc ? productForm.imgSrc : "Chưa có ảnh nào được tải lên."}</span>
        </p>
      </div>

      <div
        ref={formCardRef}
        className={`admin-product-actions admin-product-card${isEditMode ? " admin-product-actions--edit-mode" : " admin-product-actions--add-mode"}`}
      >
        <div
          className={`admin-product-card__head admin-product-form-card__head${
            isEditMode ? " admin-product-card__head--editing" : ""
          }`}
        >
          <div className="admin-product-form-headline">
            <span
              className={`admin-product-mode-badge${
                isEditMode ? " admin-product-mode-badge--edit" : " admin-product-mode-badge--add"
              }`}
            >
              {isEditMode ? "Đang chỉnh sửa" : "Thêm mới"}
            </span>
            <div className="admin-product-form-headline__text">
              <h2 className="admin-product-form-title">
                {isEditMode ? "Cập nhật sản phẩm" : "Thêm sản phẩm mới"}
              </h2>
              {isEditMode && productForm.title?.trim() ? (
                <p className="admin-product-form-editing-target" title={productForm.title}>
                  Đang sửa: <strong>{productForm.title}</strong>
                </p>
              ) : null}
            </div>
          </div>
          <p className="admin-product-form-headline__desc">
            {isEditMode
              ? "Bạn đang chỉnh sửa sản phẩm đã có — nhấn Lưu cập nhật để ghi đè dữ liệu, hoặc Hủy để thoát chế độ sửa."
              : "Điền đầy đủ thông tin sản phẩm để thêm vào danh mục bán hàng."}
          </p>
        </div>
        <div className="admin-product-form-grid">
          {formKeys.map((key) => {
            const label = fieldLabels[key] || key;
            return (
              <div key={key} className={`form-group${key === "description" ? " form-group--full" : ""}`}>
                <label>{label}</label>
                {key === "description" ? (
                  <textarea
                    placeholder={label}
                    value={productForm[key]}
                    onChange={(e) =>
                      setProductForm({ ...productForm, [key]: e.target.value })
                    }
                  />
                ) : (
                  <input
                    ref={key === "title" ? titleInputRef : undefined}
                    type={typeof productForm[key] === "number" ? "number" : "text"}
                    placeholder={label}
                    value={productForm[key]}
                    onChange={(e) =>
                      setProductForm({ ...productForm, [key]: e.target.value })
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="admin-product-form-actions">
          {isEditMode ? (
            <button
              type="button"
              className="admin-product-btn admin-product-btn--ghost"
              onClick={resetFormAndEdit}
            >
              Hủy chỉnh sửa
            </button>
          ) : null}
          <button
            type="button"
            className={`admin-product-btn admin-product-btn--primary${
              isEditMode ? " admin-product-btn--primary-update" : ""
            }`}
            onClick={handleSaveProduct}
          >
            {isEditMode ? "Lưu cập nhật" : "Thêm sản phẩm"}
          </button>
        </div>
      </div>

      <div className="admin-product-list admin-product-card">
        <div className="admin-product-card__head admin-product-list-card__head">
          <div className="admin-product-list-head-main">
            <div>
              <h2 className="admin-product-list-title">Danh sách sản phẩm</h2>
              <p className="admin-product-list-sub">
                Theo dõi tiêu đề, giá, tồn kho, hiển thị và thao tác nhanh trên từng dòng.
              </p>
            </div>
            <div className="admin-product-summary-chips" aria-label="Tóm tắt nhanh danh mục">
              <span className="admin-product-summary-chip admin-product-summary-chip--total">
                <span className="admin-product-summary-chip__label">Tổng</span>
                <span className="admin-product-summary-chip__value">{listQuickStats.total}</span>
              </span>
              <span className="admin-product-summary-chip admin-product-summary-chip--low">
                <span className="admin-product-summary-chip__label">Sắp hết</span>
                <span className="admin-product-summary-chip__value">{listQuickStats.lowStock}</span>
              </span>
              <span className="admin-product-summary-chip admin-product-summary-chip--hidden">
                <span className="admin-product-summary-chip__label">Đã ẩn</span>
                <span className="admin-product-summary-chip__value">{listQuickStats.hidden}</span>
              </span>
            </div>
          </div>
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

        <div className="admin-product-stock-filter admin-product-stock-filter--toolbar">
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

        <div className="admin-product-table-scroll">
          <table className="admin-product-table">
          <thead>
            <tr>
              <th scope="col">Tiêu đề</th>
              <th scope="col">Tác giả</th>
              <th scope="col" className="admin-product-table__th--numeric">
                Giá
              </th>
              <th scope="col" className="admin-product-table__th--numeric">
                Tồn kho
              </th>
              <th scope="col">Hiển thị</th>
              <th scope="col">Trạng thái kho</th>
              <th scope="col" className="admin-product-table__th--actions">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length ? (
              filteredProducts.map((product) => {
                const stock = getStockValue(product);
                const stockStatus = getStockStatus(stock);
                const hidden = Boolean(product.isHidden);
                const rowActive = editingId && String(editingId) === String(product._id);
                return (
                  <tr
                    key={product._id}
                    className={rowActive ? "admin-product-table-row--editing" : undefined}
                  >
                    <td className="admin-product-table__cell--title">{product.title}</td>
                    <td className="admin-product-table__cell--muted">{product.author}</td>
                    <td className="admin-product-table__cell--numeric">
                      {Number(product.price || 0).toLocaleString()} VND
                    </td>
                    <td className="admin-product-table__cell--numeric admin-product-table__cell--stock">
                      <span className="admin-product-stock-num">
                        {stock === null ? "—" : stock}
                      </span>
                    </td>
                    <td className="admin-product-table__cell--badge">
                      <span
                        className={`admin-product-visibility-badge${
                          hidden ? " admin-product-visibility-badge--hidden" : " admin-product-visibility-badge--visible"
                        }`}
                      >
                        {hidden ? "Đã ẩn" : "Đang hiển thị"}
                      </span>
                    </td>
                    <td className="admin-product-table__cell--badge">
                      <span className={`admin-product-stock-badge admin-product-stock-badge--${stockStatus.key}`}>
                        {stockStatus.label}
                      </span>
                    </td>
                    <td className="admin-product-table__cell--actions">
                      <div className="admin-product-row-actions">
                        <button
                          type="button"
                          className="admin-product-btn admin-product-btn--table-edit"
                          onClick={() => loadProductIntoForm(product)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className={`admin-product-btn admin-product-btn--table-hide${
                            hidden ? " admin-product-btn--table-hide-on" : ""
                          }`}
                          onClick={() => handleToggleHidden(product)}
                        >
                          {hidden ? "Hiện" : "Ẩn"}
                        </button>
                        <button
                          type="button"
                          className="admin-product-btn admin-product-btn--table-delete"
                          onClick={() => handleDeleteProduct(product._id)}
                        >
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="admin-product-table-empty">
                  Không có sản phẩm phù hợp với bộ lọc tồn kho hiện tại.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
};

export default AdminProduct;
