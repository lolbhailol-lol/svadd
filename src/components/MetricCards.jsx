import React from 'react';
import { IndianRupee, ShoppingBag, Tag, Gift, Package } from 'lucide-react';

export default function MetricCards({ bills }) {
  let netSales = 0;
  let upiSales = 0;
  let cashSales = 0;

  let withoutOfferUnits = 0;
  let withoutOfferAmt = 0;

  let withOfferUnits = 0;
  let withOfferAmt = 0;
  let withOfferDisAmt = 0;

  let sampleUnits = 0;
  let sampleRetailValue = 0;

  let totalDispatched = 0;

  bills.forEach((b) => {
    const qty = parseInt(b.qty || 1, 10);
    const rate = parseFloat(b.rate || 0);
    const dis = parseFloat(b.discount || 0);
    const isSample = (b.payment_mode || '').toUpperCase() === 'SAMPLING' || b.is_sampling || rate === 0;

    totalDispatched += qty;

    if (isSample) {
      sampleUnits += qty;
      const originalRate = parseFloat(b.original_rate || 99);
      sampleRetailValue += (qty * originalRate);
    } else {
      const disAmt = rate * qty * dis;
      const totalAmt = (rate * qty) - disAmt;

      netSales += totalAmt;

      const mode = (b.payment_mode || 'UPI').toUpperCase();
      if (mode.includes('CASH')) cashSales += totalAmt;
      else upiSales += totalAmt;

      if (dis > 0) {
        withOfferUnits += qty;
        withOfferAmt += totalAmt;
        withOfferDisAmt += disAmt;
      } else {
        withoutOfferUnits += qty;
        withoutOfferAmt += totalAmt;
      }
    }
  });

  const formatCurr = (num) => '₹' + Math.round(num).toLocaleString('en-IN');

  return (
    <div className="kpi-row">
      {/* 1. Net Stall Sales Revenue */}
      <div className="kpi-tile card-net">
        <div className="kpi-accent-bar"></div>
        <div className="kpi-top">
          <span className="kpi-tag-label">Net Sales Revenue</span>
          <div className="kpi-icon-box">
            <IndianRupee size={16} />
          </div>
        </div>
        <div className="kpi-digit">{formatCurr(netSales)}</div>
        <div className="kpi-footer-metric">
          <span>UPI: <strong>{formatCurr(upiSales)}</strong></span>
          <span>·</span>
          <span>Cash: <strong>{formatCurr(cashSales)}</strong></span>
        </div>
      </div>

      {/* 2. Without Offer (Full Price MRP) */}
      <div className="kpi-tile card-mrp">
        <div className="kpi-accent-bar"></div>
        <div className="kpi-top">
          <span className="kpi-tag-label">Without Offer (MRP)</span>
          <div className="kpi-icon-box">
            <ShoppingBag size={16} />
          </div>
        </div>
        <div className="kpi-digit">
          {withoutOfferUnits} <small style={{ fontSize: '15px', color: 'var(--text-sub)' }}>pkts</small>
        </div>
        <div className="kpi-footer-metric">
          <span>Full Price: <strong>{formatCurr(withoutOfferAmt)}</strong></span>
        </div>
      </div>

      {/* 3. With Offer (Discounted Sales) */}
      <div className="kpi-tile card-offer">
        <div className="kpi-accent-bar"></div>
        <div className="kpi-top">
          <span className="kpi-tag-label">With Offer (Promos)</span>
          <div className="kpi-icon-box">
            <Tag size={16} />
          </div>
        </div>
        <div className="kpi-digit">
          {withOfferUnits} <small style={{ fontSize: '15px', color: 'var(--text-sub)' }}>pkts</small>
        </div>
        <div className="kpi-footer-metric">
          <span>Sales: <strong>{formatCurr(withOfferAmt)}</strong></span>
          <span>·</span>
          <span>Dis: {formatCurr(withOfferDisAmt)}</span>
        </div>
      </div>

      {/* 4. Free Sampling (Marketing Value) */}
      <div className="kpi-tile card-sample">
        <div className="kpi-accent-bar"></div>
        <div className="kpi-top">
          <span className="kpi-tag-label">Free Sampling (Tasting)</span>
          <div className="kpi-icon-box">
            <Gift size={16} />
          </div>
        </div>
        <div className="kpi-digit">
          {sampleUnits} <small style={{ fontSize: '15px', color: 'var(--text-sub)' }}>pkts</small>
        </div>
        <div className="kpi-footer-metric">
          <span>Retail Value: <strong>{formatCurr(sampleRetailValue)}</strong></span>
        </div>
      </div>

      {/* 5. Total Products Dispatched */}
      <div className="kpi-tile card-units">
        <div className="kpi-accent-bar"></div>
        <div className="kpi-top">
          <span className="kpi-tag-label">Total Dispatched</span>
          <div className="kpi-icon-box">
            <Package size={16} />
          </div>
        </div>
        <div className="kpi-digit">
          {totalDispatched} <small style={{ fontSize: '15px', color: 'var(--text-sub)' }}>units</small>
        </div>
        <div className="kpi-footer-metric">
          <span>Across <strong>{bills.length} billing rows</strong></span>
        </div>
      </div>
    </div>
  );
}
