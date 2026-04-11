import React from "react";
import CardItem from "../../../components/CardItem";
import "./styles.css";

{/* <ViewData data={books} total ={total} setLimit ={setLimit} setPage = {setPage}/> */}
function ViewData(data ) {
  const { books, total, setLimit, setPage, page } = data;
  return (
    <div className="viewdata">
      {
        total > 0 && <div className="viewtotal">Tìm thấy {total} sản phẩm</div>
      }
      {
        total === 0 && <div className="viewtotal">Không tìm thấy sản phẩm nào</div>
      }

      <div className="datacontainer">
        {books.map((book, index) => (
          <CardItem key={book._id} book={book} />
        ))}
      </div>
      <div className="pagination">
        <button
          onClick={() => {
            setPage(page - 1);
          }}
          disabled={page === 1}
        >
          -
        </button>
        <span>Trang {page} / {Math.ceil(total / 10)}</span>
        <button
          onClick={() => {
            setPage(page + 1);
          }}
          disabled={books.length < 10}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default ViewData;
