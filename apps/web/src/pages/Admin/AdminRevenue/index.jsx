import React, { useEffect, useMemo, useState } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import {
  getDashboardSummary,
  getRevenue,
  getTopProducts,
  getOrderStatusStats,
} from '../../../api/reportingApi';
import { getOrderStatusLabel } from '../../../utils/orderStatusLabel';
import './AdminRevenue.css';

const chartBaseOptions = {
  chart: {
    type: 'column',
    backgroundColor: 'transparent',
    plotBackgroundColor: 'rgba(250, 248, 246, 0.85)',
    plotBorderWidth: 1,
    plotBorderColor: 'rgba(196, 0, 0, 0.08)',
    style: {
      fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    },
    spacing: [20, 18, 16, 18],
  },
  title: {
    text: 'Doanh thu theo thang',
    align: 'left',
    margin: 16,
    style: {
      fontSize: '1.35rem',
      fontWeight: '800',
      color: '#0d0d0d',
      letterSpacing: '-0.03em',
    },
  },
  subtitle: {
    text: 'Bieu do tong hop doanh thu theo nam (VND)',
    align: 'left',
    style: {
      fontSize: '0.82rem',
      color: '#5c5c5c',
      fontWeight: '600',
    },
  },
  xAxis: {
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    lineColor: 'rgba(0,0,0,0.08)',
    tickColor: 'rgba(0,0,0,0.08)',
    gridLineWidth: 0,
    labels: { style: { color: '#444', fontSize: '11px', fontWeight: '600' } },
  },
  yAxis: {
    min: 0,
    title: {
      text: 'Doanh thu (VND)',
      style: { color: '#555', fontWeight: '600', fontSize: '11px' },
    },
    gridLineColor: 'rgba(0,0,0,0.06)',
    labels: {
      style: { color: '#555', fontSize: '11px' },
      formatter: function () {
        return Highcharts.numberFormat(this.value, 0, '.', ',');
      },
    },
  },
  legend: {
    align: 'center',
    verticalAlign: 'bottom',
    margin: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    itemStyle: { fontWeight: '700', fontSize: '12px', color: '#222' },
    itemHoverStyle: { color: '#c40000' },
    symbolRadius: 5,
  },
  tooltip: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(196,0,0,0.22)',
    borderRadius: 10,
    style: { fontSize: '12px', fontWeight: '600' },
  },
  plotOptions: {
    column: {
      borderWidth: 0,
      borderRadius: 6,
      groupPadding: 0.12,
      pointPadding: 0.02,
      dataLabels: { enabled: false },
    },
  },
  colors: ['#c40000', '#e85d52', '#2d8a5e', '#c9951c', '#5b7fc7', '#8b5cf6'],
  credits: { enabled: false },
  series: [],
};

function AdminRevenue() {
  const [productsSold, setProductsSold] = useState([]);
  const [productsRevenue, setProductsRevenue] = useState([]);
  const [revenueSeries, setRevenueSeries] = useState([]);
  const [orderStatus, setOrderStatus] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [averageIncome, setAverageIncome] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  const [options, setOptions] = useState(chartBaseOptions);

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

  const statusMaxCount = useMemo(() => {
    if (!orderStatus.length) {
      return 1;
    }
    return Math.max(1, ...orderStatus.map((i) => Number(i.count) || 0));
  }, [orderStatus]);

  return (
    <div className="admin-revenue">
      <section className="admin-revenue__panel" aria-labelledby="admin-revenue-chart-label">
        <div className="admin-revenue__panel-ribbon">
          <span className="admin-revenue__ribbon-dot" aria-hidden />
          <span className="admin-revenue__ribbon-text">Bao cao tai chinh</span>
        </div>
        <div className="admin-revenue__chart-shell" id="admin-revenue-chart-label">
          <HighchartsReact highcharts={Highcharts} options={options} />
        </div>
        <div className="admin-revenue__metrics" role="group" aria-label="Chi so tong hop">
          <div className="admin-revenue__metric admin-revenue__metric--total">
            <span className="admin-revenue__metric-label">Tong doanh thu</span>
            <span className="admin-revenue__metric-value">{totalIncome.toLocaleString('vi-VN')} <small>VND</small></span>
          </div>
          <div className="admin-revenue__metric admin-revenue__metric--avg">
            <span className="admin-revenue__metric-label">Doanh thu trung binh moi thang</span>
            <span className="admin-revenue__metric-value">{averageIncome.toLocaleString('vi-VN')} <small>VND</small></span>
          </div>
          <div className="admin-revenue__metric admin-revenue__metric--users">
            <span className="admin-revenue__metric-label">So luong khach hang</span>
            <span className="admin-revenue__metric-value accent">{Math.max(totalUsers - 1, 0)}</span>
          </div>
        </div>
      </section>

      <div className="admin-revenue__mid">
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

      <div className="admin-revenue__mid">
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

      <section className="admin-revenue__status-block" aria-labelledby="admin-revenue-status-heading">
        <div className="admin-revenue__status-head">
          <h2 id="admin-revenue-status-heading" className="admin-revenue__status-title">
            Thong ke trang thai don hang
          </h2>
          <p className="admin-revenue__status-desc">So luong don theo tung trang thai trong he thong</p>
        </div>
        <div className="admin-revenue__status-list">
          {orderStatus.map((item, idx) => {
            const n = Number(item.count) || 0;
            const pct = Math.min(100, Math.round((n / statusMaxCount) * 100));
            return (
              <div
                key={item.status}
                className={`admin-revenue__status-row admin-revenue__status-row--tone-${idx % 5}`}
              >
                <div className="admin-revenue__status-row-top">
                  <span className="admin-revenue__status-name">{getOrderStatusLabel(item.status)}</span>
                  <span className="admin-revenue__status-pill">
                    {item.count} <span className="admin-revenue__status-unit">don</span>
                  </span>
                </div>
                <div className="admin-revenue__status-track" aria-hidden="true">
                  <div className="admin-revenue__status-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default AdminRevenue;
