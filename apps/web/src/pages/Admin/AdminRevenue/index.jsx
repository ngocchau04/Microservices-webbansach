import React, { useEffect, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import {
  getDashboardSummary,
  getRevenue,
  getTopProducts,
  getOrderStatusStats,
} from '../../../api/reportingApi';
import './AdminRevenue.css';

function AdminRevenue() {
  const [productsSold, setProductsSold] = useState([]);
  const [productsRevenue, setProductsRevenue] = useState([]);
  const [revenueSeries, setRevenueSeries] = useState([]);
  const [orderStatus, setOrderStatus] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [averageIncome, setAverageIncome] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  const [options, setOptions] = useState({
    chart: { type: 'column' },
    title: { text: 'Doanh thu theo thang' },
    xAxis: {
      categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    },
    yAxis: {
      min: 0,
      title: { text: 'Doanh thu (VND)' },
    },
    series: [],
  });

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [summaryRes, revenueRes, topSoldRes, topRevenueRes, orderStatusRes] = await Promise.all([
          getDashboardSummary(),
          getRevenue('month'),
          getTopProducts({ sortBy: 'quantity', limit: 5 }),
          getTopProducts({ sortBy: 'revenue', limit: 5 }),
          getOrderStatusStats(),
        ]);

        const summaryData = summaryRes?.data || {};
        const revenueData = revenueRes?.data || {};
        const points = Array.isArray(revenueData.points) ? revenueData.points : [];

        setRevenueSeries(Array.isArray(revenueData.legacySeries) ? revenueData.legacySeries : []);
        setTotalIncome(Number(summaryData.totalRevenue) || 0);
        setTotalUsers(Number(summaryData.totalUsers) || 0);
        setProductsSold(Array.isArray(topSoldRes?.data?.items) ? topSoldRes.data.items : []);
        setProductsRevenue(Array.isArray(topRevenueRes?.data?.items) ? topRevenueRes.data.items : []);
        setOrderStatus(Array.isArray(orderStatusRes?.data?.items) ? orderStatusRes.data.items : []);

        const activeBuckets = points.filter((item) => Number(item.revenue) > 0).length;
        setAverageIncome(activeBuckets > 0 ? Math.floor((Number(summaryData.totalRevenue) || 0) / activeBuckets) : 0);
      } catch (error) {
        console.error('Error loading reporting dashboard:', error);
      }
    };

    loadDashboard();
  }, []);

  useEffect(() => {
    const series = revenueSeries.map((item) => ({
      name: item.year,
      data: item.revenue,
    }));

    setOptions((prev) => ({ ...prev, series }));
  }, [revenueSeries]);

  return (
    <>
      <HighchartsReact highcharts={Highcharts} options={options} />
      <div>
        <p>Tong doanh thu: {totalIncome.toLocaleString('vi-VN')} VND</p>
        <p>Doanh thu trung binh moi thang: {averageIncome.toLocaleString('vi-VN')} VND</p>
        <p>So luong khach hang: {Math.max(totalUsers - 1, 0)}</p>
        <br />
      </div>

      <div>
        <h2>Top 5 san pham ban chay nhat</h2>
        <br />
        <div style={{ display: 'flex' }}>
          {productsSold.map((product, index) => (
            <div key={`${product.productId || product.title}-${index}`} className="cardspp">
              <img className="cardspp-image" src={product.image} />
              <p className="cardspp-title">{product.title}</p>
              <p className="cardspp-price">Gia: {Number(product.unitPrice || 0).toLocaleString('vi-VN')} VND</p>
              <p className="cardspp-price" style={{ display: 'flex' }}>
                <div>Da ban: </div>
                <div style={{ color: 'red' }}>{product.soldQuantity}</div>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <br />
        <h2>Top 5 san pham co doanh thu cao nhat</h2>
        <br />
        <div style={{ display: 'flex' }}>
          {productsRevenue.map((product, index) => (
            <div key={`${product.productId || product.title}-${index}`} className="cardspp">
              <img className="cardspp-image" src={product.image} />
              <p className="cardspp-title">{product.title}</p>
              <p className="cardspp-price">Gia: {Number(product.unitPrice || 0).toLocaleString('vi-VN')} VND</p>
              <p className="cardspp-price">
                Doanh thu:
                <div style={{ color: 'red' }}>{Number(product.revenue || 0).toLocaleString('vi-VN')} VND</div>
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <br />
        <h2>Thong ke trang thai don hang</h2>
        <br />
        {orderStatus.map((item) => (
          <p key={item.status}>
            {item.status}: {item.count} don
          </p>
        ))}
      </div>
    </>
  );
}

export default AdminRevenue;
