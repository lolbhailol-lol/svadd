import React, { useState } from 'react';
import { defaultProducts, salespersonsList } from '../data/products';
import ProductSelector from './ProductSelector';
import { PlusCircle, Gift, Minus, Plus, CreditCard, Smartphone, Banknote, Sparkles, Layers } from 'lucide-react';

export default function BillingForm({ onAddBill, nextSrNo }) {
  const getTodayStr = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const [date, setDate] = useState(getTodayStr());
  const [selectedProduct, setSelectedProduct] = useState(defaultProducts[0].name);
  const [qty, setQty] = useState(1);
  const [rate, setRate] = useState(defaultProducts[0].rate);
  const [discount, setDiscount] = useState(0);
  const [salesperson, setSalesperson] = useState(salespersonsList[0]);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [isSampling, setIsSampling] = useState(false);

  const handleProductSelect = (prodName) => {
    setSelectedProduct(prodName);
    const prod = defaultProducts.find((p) => p.name === prodName);
    if (prod && !isSampling) {
      setRate(prod.rate);
    }
  };

  const changeQty = (delta) => {
    setQty((prev) => Math.max(1, (parseInt(prev, 10) || 1) + delta));
  };

  const numQty = parseInt(qty, 10) || 1;
  const numRate = parseFloat(rate) || 0;
  const numDis = parseFloat(discount) || 0;

  // Formula computations matching Billing Format.xlsx:
  // Dis. Amt = Rate * Qty * Dis
  const disAmt = numRate * numQty * numDis;
  // Total Amt = (Rate * Qty) - Dis. Amt
  const totalAmt = (numRate * numQty) - disAmt;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const prod = defaultProducts.find((p) => p.name === selectedProduct);
    const originalRate = prod ? prod.rate : 99;

    const newBill = {
      billing_date: date,
      product_name: selectedProduct,
      qty: numQty,
      rate: isSampling ? 0 : numRate,
      original_rate: originalRate,
      discount: isSampling ? 0 : numDis,
      salesperson: salesperson,
      payment_mode: isSampling ? 'SAMPLING' : paymentMode,
      is_sampling: isSampling
    };

    onAddBill(newBill);

    // Reset back to standard 1 qty
    setQty(1);
    setDiscount(0);
    setIsSampling(false);
    if (paymentMode === 'SAMPLING') setPaymentMode('UPI');
    if (prod) setRate(prod.rate);
  };

  const handleSampleClick = () => {
    const prod = defaultProducts.find((p) => p.name === selectedProduct);
    const originalRate = prod ? prod.rate : 99;

    const sampleBill = {
      billing_date: date,
      product_name: selectedProduct,
      qty: numQty,
      rate: 0,
      original_rate: originalRate,
      discount: 0,
      salesperson: salesperson,
      payment_mode: 'SAMPLING',
      is_sampling: true
    };

    onAddBill(sampleBill);
    setQty(1);
    setIsSampling(false);
    if (prod) setRate(prod.rate);
  };

  return (
    <div className="terminal-card">
      <div className="terminal-title-bar">
        <div className="terminal-headline">
          <h2>
            <Sparkles size={18} color="var(--emerald)" />
            Add Billing Entry
          </h2>
          <p>Vertical Excel Columns Format Terminal</p>
        </div>
        <div className="row-index-pill">
          Row #{nextSrNo}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="terminal-fields-stack">
        {/* Billing Date */}
        <div className="field-unit">
          <label className="field-label-row">
            <span>Billing Date (Col B)</span>
            <span className="desc">DD/MM/YYYY</span>
          </label>
          <input
            type="text"
            className="terminal-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* Product Catalog Quick Selector */}
        <div className="field-unit">
          <label className="field-label-row">
            <span>Product Catalog (Col C)</span>
            <span className="desc">Click to select item</span>
          </label>
          <ProductSelector
            selectedProduct={selectedProduct}
            onSelectProduct={handleProductSelect}
          />
        </div>

        {/* Qty & Rate */}
        <div className="split-2">
          <div className="field-unit">
            <label className="field-label-row">
              <span>Qty (Col D)</span>
            </label>
            <div className="stepper-box">
              <button
                type="button"
                className="stepper-btn"
                onClick={() => changeQty(-1)}
              >
                <Minus size={13} />
              </button>
              <input
                type="number"
                min="1"
                className="stepper-display"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                required
              />
              <button
                type="button"
                className="stepper-btn"
                onClick={() => changeQty(1)}
              >
                <Plus size={13} />
              </button>
            </div>
            <div className="quick-qty-pills">
              {[1, 2, 3, 5, 10].map((n) => (
                <button
                  type="button"
                  key={n}
                  className="q-pill"
                  onClick={() => setQty(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div className="field-unit">
            <label className="field-label-row">
              <span>Rate (Col E)</span>
              <span className="desc">{isSampling ? 'Free Sample' : 'MRP / Unit'}</span>
            </label>
            <input
              type="number"
              className="terminal-input"
              value={isSampling ? 0 : rate}
              disabled={isSampling}
              onChange={(e) => setRate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Discount / Offer */}
        <div className="field-unit">
          <label className="field-label-row">
            <span>Offer / Discount (Col F)</span>
            <span className="desc">{discount > 0 ? `${discount * 100}% Discount` : 'No Offer'}</span>
          </label>
          <div className="glow-discount-bar">
            {[0, 0.05, 0.10, 0.15, 0.20].map((d) => (
              <button
                type="button"
                key={d}
                disabled={isSampling}
                className={`discount-toggle-btn ${discount === d && !isSampling ? 'active' : ''}`}
                onClick={() => setDiscount(d)}
              >
                {d === 0 ? '0% Full' : `${d * 100}%`}
              </button>
            ))}
          </div>
        </div>

        {/* Live Formula Engine Terminal */}
        <div className="formula-engine-card">
          <div className="formula-line">
            <span className="formula-name">
              Dis. Amt (Col G)
              <span className="formula-badge-code">= Rate × Qty × Dis</span>
            </span>
            <span className="formula-amt" style={{ color: disAmt > 0 ? 'var(--amber)' : 'inherit' }}>
              ₹{disAmt.toFixed(2)}
            </span>
          </div>

          <div className="formula-separator"></div>

          <div className="formula-line">
            <span className="formula-name" style={{ fontWeight: 700, color: 'var(--text-main)' }}>
              Total Amt (Col H)
              <span className="formula-badge-code">= (Rate × Qty) − Dis. Amt</span>
            </span>
            <span className="formula-amt highlight-net">
              {isSampling ? '₹0.00 (FREE)' : `₹${totalAmt.toFixed(2)}`}
            </span>
          </div>
        </div>

        {/* Sales Person */}
        <div className="field-unit">
          <label className="field-label-row">
            <span>Sale Person (Col I)</span>
          </label>
          <select
            className="terminal-select"
            value={salesperson}
            onChange={(e) => setSalesperson(e.target.value)}
          >
            {salespersonsList.map((sp) => (
              <option key={sp} value={sp}>
                {sp}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Mode */}
        <div className="field-unit">
          <label className="field-label-row">
            <span>Payment Mode (Col J)</span>
          </label>
          <div className="payment-chips-row">
            <button
              type="button"
              className={`pay-mode-btn ${paymentMode === 'UPI' && !isSampling ? 'active-mode' : ''}`}
              onClick={() => { setPaymentMode('UPI'); setIsSampling(false); }}
            >
              <Smartphone size={16} />
              <span>UPI</span>
            </button>

            <button
              type="button"
              className={`pay-mode-btn ${paymentMode === 'Cash' && !isSampling ? 'active-mode' : ''}`}
              onClick={() => { setPaymentMode('Cash'); setIsSampling(false); }}
            >
              <Banknote size={16} />
              <span>Cash</span>
            </button>

            <button
              type="button"
              className={`pay-mode-btn ${paymentMode === 'Card' && !isSampling ? 'active-mode' : ''}`}
              onClick={() => { setPaymentMode('Card'); setIsSampling(false); }}
            >
              <CreditCard size={16} />
              <span>Card</span>
            </button>

            <button
              type="button"
              className={`pay-mode-btn ${isSampling ? 'active-sample' : ''}`}
              onClick={() => {
                setIsSampling(true);
                setPaymentMode('SAMPLING');
                setRate(0);
                setDiscount(0);
              }}
            >
              <Gift size={16} />
              <span>Sample</span>
            </button>
          </div>
        </div>

        {/* CTAs */}
        <div className="cta-stack">
          <button type="submit" className="btn-cta-submit">
            <PlusCircle size={18} />
            <span>{isSampling ? 'Log Free Sample to Billing Sheet' : 'Add Entry to Billing Sheet'}</span>
          </button>

          {!isSampling && (
            <button
              type="button"
              className="btn-cta-sample"
              onClick={handleSampleClick}
            >
              <Gift size={16} />
              <span>🎁 Fast Log Free Sampling (₹0 Value)</span>
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
