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
    imgSrc: "URL HÃ¬nh áº¢nh",
    title: "TiÃªu Äá»",
    author: "TÃ¡c Giáº£",
    translator: "NgÆ°á»i BiÃªn Dá»‹ch",
    price: "GiÃ¡",
    sku: "MÃ£ Sáº£n Pháº©m (SKU)",
    ageGroup: "NhÃ³m Tuá»•i",
    supplier: "NhÃ  Cung Cáº¥p",
    publisher: "NhÃ  Xuáº¥t Báº£n",
    language: "NgÃ´n Ngá»¯",
    weight: "Trá»ng LÆ°á»£ng",
    dimensions: "KÃ­ch ThÆ°á»›c",
    pages: "Sá»‘ Trang",
    binding: "Loáº¡i BÃ¬a",
    description: "MÃ´ Táº£",
    type: "Loáº¡i SÃ¡ch",
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
        setError("KhÃ´ng thá»ƒ táº£i danh sÃ¡ch sáº£n pháº©m.");
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
        alert("ThÃªm sáº£n pháº©m má»›i thÃ nh cÃ´ng!");
      })
      .catch((error) => {
        console.error("Lá»—i khi thÃªm sáº£n pháº©m:", error);
        alert("ThÃªm sáº£n pháº©m tháº¥t báº¡i.");
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
        alert("Cáº­p nháº­t sáº£n pháº©m thÃ nh cÃ´ng!");
      })
      .catch((error) => {
        console.error("Lá»—i khi cáº­p nháº­t sáº£n pháº©m:", error);
        alert("Cáº­p nháº­t sáº£n pháº©m tháº¥t báº¡i.");
      });
  };

  // Delete a product
  const handleDeleteProduct = (id) => {
    if (!window.confirm("Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a sáº£n pháº©m nÃ y khÃ´ng?")) return;
    deleteProduct(id)
      .then(() => {
        const updatedProducts = products.filter((product) => product._id !== id);
        setProducts(updatedProducts);
        alert("XÃ³a sáº£n pháº©m thÃ nh cÃ´ng!");
      })
      .catch((error) => {
        console.error("Lá»—i khi xÃ³a sáº£n pháº©m:", error);
        alert("XÃ³a sáº£n pháº©m tháº¥t báº¡i.");
      });
  };

  if (loading) return <p>Äang táº£i dá»¯ liá»‡u...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  const handleUploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("imageUrl", file);
    try {
      const data = await uploadImage(formData);
      setNewProduct({ ...newProduct, imgSrc: data.imageUrl || data.url || "" });
      alert("Upload áº£nh thÃ nh cÃ´ng!");
    } catch (error) {
      console.error("Lá»—i khi upload áº£nh:", error);
      alert("Upload áº£nh tháº¥t báº¡i.");
    }
  }

  return (
    <div className="admin-product-container">
      <h1>Quáº£n LÃ½ Sáº£n Pháº©m</h1>
      <div className="upload-container">
        <h2>Upload áº¢nh</h2>
        <input type="file" onChange={handleUploadImage} />
        <p> URL áº¢nh: {newProduct.imgSrc}</p>
      </div>
      {/* Add New Product */}
      <div className="admin-product-actions">
        <h2>ThÃªm Sáº£n Pháº©m Má»›i</h2>
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
        <button onClick={handleAddProduct}>ThÃªm Sáº£n Pháº©m</button>
      </div>

      {/* Product List */}
      <div className="admin-product-list">
        <h2>Danh SÃ¡ch Sáº£n Pháº©m</h2>
        <table>
          <thead>
            <tr>
              <th>TiÃªu Äá»</th>
              <th>TÃ¡c Giáº£</th>
              <th>GiÃ¡</th>
              <th>HÃ nh Äá»™ng</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product._id}>
                <td>{product.title}</td>
                <td>{product.author}</td>
                <td>{product.price.toLocaleString()} VND</td>
                <td>
                  <button onClick={() => setSelectedProduct(product)}>Sá»­a</button>
                  <button onClick={() => handleDeleteProduct(product._id)}>XÃ³a</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Selected Product */}
      {selectedProduct && (
        <div className="admin-product-edit">
          <h2>Sá»­a Sáº£n Pháº©m</h2>
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
          <button onClick={handleUpdateProduct}>Cáº­p Nháº­t</button>
        </div>
      )}
    </div>
  );
};

export default AdminProduct;

