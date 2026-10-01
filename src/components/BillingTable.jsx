import React, { useState } from 'react';
import { Search, Trash2, FileSpreadsheet } from 'lucide-react';

export default function BillingTable({ bills, onDeleteBill }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  let regularCount = 0;
  let offerCount = 0;
  let sampleCount = 0;

  bills.forEach((b) => {
    const isSample = (b.payment_mode || '').toUpperCase() === 'SAMPLING' || b.is_sampling || parseFloat(b.rate) === 0;
    const dis = parseFloat(b.discount || 0);

    if (isSample) sampleCount++;
    else if (dis > 0) offerCount++;
    else regularCount++;
  });

  const filteredBills = bills.filter((b) => {
    const isSample = (b.payment_mode || '').toUpperCase() === 'SAMPLING' || b.is_sampling || parseFloat(b.rate) === 0;
    const dis = parseFloat(b.discount || 0);

    if (filter === 'regular' && (isSample || dis > 0)) return false;
    if (filter === 'offer' && (isSample || dis <= 0)) return false;
    if (filter === 'sample' && !isSample) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchProd = (b.product_name || '').toLowerCase().includes(q);
      const matchPerson = (b.salesperson || '').toLowerCase().includes(q);
      const matchMode = (b.payment_mode || '').toLowerCase().includes(q);
      const matchDate = (b.billing_date || '').toLowerCase().includes(q);
      return matchProd || matchPerson || matchMode || matchDate;
    }

    return true;
  });

  let sumQty = 0;
  let sumDisAmt = 0;
  let sumTotalAmt = 0;

  filteredBills.forEach((b) => {
    const qty = parseInt(b.qty || 1, 10);
    const rate = parseFloat(b.rate || 0);
    const dis = parseFloat(b.discount || 0);
    const disAmt = rate * qty * dis;
    const totalAmt = (rate * qty) - disAmt;

    sumQty += qty;
    sumDisAmt += disAmt;
    sumTotalAmt += totalAmt;
  });

  const getModeClass = (mode) => {
    const m = (mode || '').toUpperCase();
    if (m === 'SAMPLING') return 'payment-badge-tag sample';
    if (m.includes('CASH')) return 'payment-badge-tag cash';
    if (m.includes('CARD')) return 'payment-badge-tag card';
    return 'payment-badge-tag upi';
  };

  return (
    <div className="spreadsheet-card">
      <div className="spreadsheet-header-bar">
        <div className="spreadsheet-meta">
          <h2>
            <FileSpreadsheet size={19} color="var(--emerald)" />
            Billing Sheet (Billing Format.xlsx)
          </h2>
          <p>Spreadsheet view matching exact Excel columns ({bills.length} total rows)</p>
        </div>

        <div className="spreadsheet-controls">
          {/* Segmented Filter Pills */}
          <div className="filter-tabs-cluster">
            <button
              className={`tab-btn-pill ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              <span>All</span>
              <span className="tab-num-badge">{bills.length}</span>
            </button>

            <button
              className={`tab-btn-pill ${filter === 'regular' ? 'active' : ''}`}
              onClick={() => setFilter('regular')}
            >
              <span>Without Offer</span>
              <span className="tab-num-badge">{regularCount}</span>
            </button>

            <button
              className={`tab-btn-pill ${filter === 'offer' ? 'active' : ''}`}
              onClick={() => setFilter('offer')}
            >
              <span>With Offer</span>
              <span className="tab-num-badge">{offerCount}</span>
            </button>

            <button
              className={`tab-btn-pill ${filter === 'sample' ? 'active' : ''}`}
              onClick={() => setFilter('sample')}
            >
              <span>🎁 Sampling</span>
              <span className="tab-num-badge">{sampleCount}</span>
            </button>
          </div>

          {/* Quick Search */}
          <div className="table-search-box">
            <Search className="search-icon-svg" size={14} />
            <input
              type="text"
              className="table-search-input"
              placeholder="Search product / person..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="table-scroll-wrap">
        <table className="fintech-table">
          <thead>
            <tr>
              <th style={{ width: '48px', textAlign: 'center' }}>
                <span className="col-alpha">A</span>Sr.
              </th>
              <th style={{ width: '95px' }}>
                <span className="col-alpha">B</span>Date
              </th>
              <th>
                <span className="col-alpha">C</span>Product Name
              </th>
              <th style={{ width: '60px', textAlign: 'right' }}>
                <span className="col-alpha">D</span>Qty
              </th>
              <th style={{ width: '75px', textAlign: 'right' }}>
                <span className="col-alpha">E</span>Rate
              </th>
              <th style={{ width: '65px', textAlign: 'center' }}>
                <span className="col-alpha">F</span>Dis.
              </th>
              <th style={{ width: '85px', textAlign: 'right' }}>
                <span className="col-alpha">G</span>Dis. Amt
              </th>
              <th style={{ width: '105px', textAlign: 'right' }}>
                <span className="col-alpha">H</span>Total Amt
              </th>
              <th style={{ width: '150px' }}>
                <span className="col-alpha">I</span>Sale Person
              </th>
              <th style={{ width: '110px', textAlign: 'center' }}>
                <span className="col-alpha">J</span>Payment Mode
              </th>
              <th style={{ width: '38px', textAlign: 'center' }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredBills.length === 0 ? (
              <tr>
                <td colSpan="11" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                  No billing entries in this view
                </td>
              </tr>
            ) : (
              filteredBills.map((b, idx) => {
                const qty = parseInt(b.qty || 1, 10);
                const rate = parseFloat(b.rate || 0);
                const dis = parseFloat(b.discount || 0);
                const isSample = (b.payment_mode || '').toUpperCase() === 'SAMPLING' || b.is_sampling || rate === 0;
                const isOffer = dis > 0 && !isSample;

                const disAmt = rate * qty * dis;
                const totalAmt = (rate * qty) - disAmt;

                let rowClass = '';
                if (isSample) rowClass = 'tr-sample';
                else if (isOffer) rowClass = 'tr-offer';

                return (
                  <tr key={b.id || idx} className={rowClass}>
                    <td className="td-center td-mono" style={{ color: 'var(--text-muted)' }}>
                      {idx + 1}
                    </td>
                    <td>{b.billing_date}</td>
                    <td style={{ fontWeight: 600 }}>
                      {b.product_name}
                      {isSample && (
                        <span style={{ marginLeft: '8px', color: 'var(--purple)', fontSize: '11px', fontWeight: 700 }}>
                          (🎁 Sample)
                        </span>
                      )}
                    </td>
                    <td className="td-right td-mono" style={{ fontWeight: 700 }}>
                      {qty}
                    </td>
                    <td className="td-right td-mono">
                      {isSample ? '₹0' : `₹${rate}`}
                    </td>
                    <td className="td-center">
                      {dis > 0 ? (
                        <span style={{ color: 'var(--amber)', fontWeight: 700, fontSize: '11px' }}>
                          {(dis * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0%</span>
                      )}
                    </td>
                    <td className="td-right td-mono" style={{ color: disAmt > 0 ? 'var(--amber)' : 'inherit' }}>
                      ₹{disAmt.toFixed(2)}
                    </td>
                    <td className="td-net-total">
                      ₹{totalAmt.toFixed(2)}
                    </td>
                    <td>{b.salesperson?.split(' - ')[0] || b.salesperson}</td>
                    <td className="td-center">
                      <span className={getModeClass(b.payment_mode)}>
                        {b.payment_mode || 'UPI'}
                      </span>
                    </td>
                    <td className="td-center">
                      <button
                        className="btn-trash-row"
                        title="Delete entry"
                        onClick={() => onDeleteBill(b.id || idx)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Sticky Total Row matching Excel Row 156 format */}
          {filteredBills.length > 0 && (
            <tfoot>
              <tr>
                <td className="td-center">∑</td>
                <td></td>
                <td style={{ fontWeight: 800, letterSpacing: '0.03em' }}>
                  Total Formula (=SUM)
                </td>
                <td className="td-right">{sumQty}</td>
                <td></td>
                <td></td>
                <td className="td-right">₹{sumDisAmt.toFixed(2)}</td>
                <td className="td-right">₹{sumTotalAmt.toFixed(2)}</td>
                <td colSpan="3" style={{ fontSize: '11px', opacity: 0.85, fontWeight: 600 }}>
                  Live Stall EOD Summary
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
