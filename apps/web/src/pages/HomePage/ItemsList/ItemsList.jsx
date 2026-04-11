import React from "react";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";
import "./ItemsList.css";
import V from "../../../assets/V.jpg";
import K from "../../../assets/K.jpg";
import G from "../../../assets/G.png";
import T from "../../../assets/T.png";
import A from "../../../assets/A.png";
import N from "../../../assets/N.jpg";
import C from "../../../assets/C.png";
import I from "../../../assets/I.jpeg";
import Y from "../../../assets/Y.jpg";
import D from "../../../assets/D.jpg";

const items = [
  { imgSrc: V, title: "Văn học", type: "V" },
  { imgSrc: K, title: "Kinh tế - Kinh doanh", type: "K" },
  { imgSrc: G, title: "Giáo dục - Học thuật", type: "G" },
  { imgSrc: T, title: "Thiếu nhi", type: "T" },
  { imgSrc: A, title: "Kỹ năng sống", type: "A" },
  { imgSrc: N, title: "Nuôi dạy con", type: "N" },
  { imgSrc: C, title: "Chính trị - Pháp luật", type: "C" },
  { imgSrc: I, title: "Điện ảnh - Âm nhạc - Hội họa", type: "I" },
  { imgSrc: Y, title: "Y học - Sức khỏe", type: "Y" },
  { imgSrc: D, title: "Du lịch - Thể thao", type: "D" },
];

const ItemsList = () => {
  const navigate = useNavigate();

  const handleClick = (type) => {
    navigate(`/list?type=${type}`);
  };

  return (
    <div className="items-list-wrapper">
      <h3 className="items-list-title">DANH MỤC SẢN PHẨM</h3>
      <div className="container">
        {items.map((item, index) => (
          <div key={index} className="itemtype" onClick={() => handleClick(item.type)}>
            <img src={item.imgSrc} alt={item.title} />
            <p>{item.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

ItemsList.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      imgSrc: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
    })
  ),
};

export default ItemsList;
