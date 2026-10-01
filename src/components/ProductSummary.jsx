import React from 'react';
import { defaultProducts } from '../data/products';
import { Layers } from 'lucide-react';

export default function ProductSummary({ bills }) {
  const productStats = {};

  defaultProducts.forEach((p) => {
    productStats[p.name] = {
      product: p,
      regularUnits: 0,
      offerUnits: 0,
      sampleUnits: 0,
      totalUnits: 0,
      totalRevenue: 0
    };
  });

  bills.forEach((b) => {
    const pName = b.product_name;
    if (!productStats[pName]) {
      productStats[pName] = {
        product: { name: pName, rate: b.rate || 99, icon: '📦' },
        regularUnits: 0,
        offerUnits: 0,
        sampleUnits: 0,
        totalUnits: 0,
        totalRevenue: 0
      };
    }

    const qty = parseInt(b.qty || 1, 10);
    const rate = parseFloat(b.rate || 0);
    const dis = parseFloat(b.discount || 0);
    const isSample = (b.payment_mode || '').toUpperCase() === 'SAMPLING' || b.is_sampling || rate === 0;

    productStats[pName].totalUnits += qty;

    if (isSample) {
      productStats[pName].sampleUnits += qty;
    } else {
      const disAmt = rate * qty * dis;
      const totalAmt = (rate * qty) - disAmt;
      productStats[pName].totalRevenue += totalAmt;

      if (dis > 0) productStats[pName].offerUnits += qty;
      else productStats[pName].regularUnits += qty;
    }
  });

  const active = Object.values(productStats).filter((s) => s.totalUnits > 0);
  if (active.length === 0) return null;

  return (
    <div className="inventory-dispatch-card">
      <div className="inv-top-bar">
        <h3>
          <Layers size={17} color="var(--emerald)" />
          Stall Product Movement Dispatched Today
        </h3>
        <span style={{ fontSize: '12px', color: 'var(--text-sub)' }}>
          {active.length} active items on stall today
        </span>
      </div>

      <div className="inv-grid">
        {active.map((s) => (
          <div key={s.product.name} className="inv-tile">
            <div className="inv-tile-header">
              <span className="inv-tile-title">
                {s.product.icon || '✨'} {s.product.name.split('(')[0]}
              </span>
              <span className="inv-tile-revenue">
                ₹{Math.round(s.totalRevenue)}
              </span>
            </div>

            <div className="inv-tile-stats">
              <span>Total: <strong>{s.totalUnits} pkts</strong></span>
              <span>·</span>
              <span>Sold: <strong>{s.regularUnits + s.offerUnits}</strong></span>
              {s.sampleUnits > 0 && (
                <>
                  <span>·</span>
                  <span style={{ color: 'var(--purple)' }}>
                    Sample: <strong>{s.sampleUnits}</strong>
                  </span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
