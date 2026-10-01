/**
 * SVVAD PRO - Stall Sales, Offer & Sampling Tracker
 * Clean, simple, fast stall interface
 */

(function () {
  'use strict';

  // Products Catalog (Focused on Svvad Pro Puffs & Snacks)
  const defaultProducts = [
    { id: "p1", name: "Svvad Pro Pea Protein Puffs (Cream & Onion 80g)", rate: 99 },
    { id: "p2", name: "Svvad Pro Pea Protein Puffs (Smoky Barbeque 80g)", rate: 99 },
    { id: "p3", name: "Svvad Pro High Protein Roasted Pea Pops (Tangy Tomato 100g)", rate: 120 },
    { id: "p4", name: "Svvad Pro High Protein Roasted Pea Pops (Cheese & Herbs 100g)", rate: 120 },
    { id: "p5", name: "Svvad Pro Pulse Protein Khakhra (Methi Crisps 150g)", rate: 140 },
    { id: "p6", name: "Svvad Pro Pulse Protein Khakhra (Jeera Masala 150g)", rate: 140 },
    { id: "p7", name: "Svvad Pro Roasted Makhana (Peri Peri Protein 70g)", rate: 130 },
    { id: "p8", name: "Svvad Pro Clean Pulse Protein Bar (Dark Chocolate 50g)", rate: 90 },
    { id: "p9", name: "Svvad Pro Plant Protein Granola (Almond Cranberry 250g)", rate: 299 },
    { id: "p10", name: "Svvad Pro Pea Protein Shake Premix (Alphonso Mango 200g)", rate: 349 },
    { id: "p11", name: "Svvad Pro Wellness Gift Hamper (Assorted Pack)", rate: 899 }
  ];

  // Application State
  const state = {
    products: defaultProducts,
    bills: [],

    // Active Form State
    selectedProductId: defaultProducts[0].id,
    currentQty: 1,
    currentSaleType: 'normal', // 'normal', 'offer', 'sample'
    currentDiscountPercent: 0.10,
    tableFilter: 'all'
  };

  // Helper: Today's date DD/MM/YYYY
  function getTodayDateStr() {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function showToast(msg, isSample = false) {
    const box = document.getElementById('toastBox');
    if (!box) return;
    const t = document.createElement('div');
    t.className = `toast ${isSample ? 'sample' : ''}`;
    t.textContent = msg;
    box.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  // Audio Cue
  function playBeep(isSample = false) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = isSample ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(isSample ? 480 : 640, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) { }
  }

  // Load Data
  async function loadData() {
    try {
      const resp = await fetch('/api/data');
      if (resp.ok) {
        const data = await resp.json();
        if (data.bills && data.bills.length > 0) {
          state.bills = data.bills;
        } else {
          loadFromLocal();
        }
      } else {
        loadFromLocal();
      }
    } catch (e) {
      loadFromLocal();
    }
    initUI();
    renderAll();
  }

  function loadFromLocal() {
    const local = localStorage.getItem('svvad_stall_bills');
    if (local) {
      try { state.bills = JSON.parse(local); } catch (e) { }
    } else {
      // Seed initial sample day data
      state.bills = [
        { id: "B1", billing_date: getTodayDateStr(), product_name: "Svvad Pro Pea Protein Puffs (Cream & Onion 80g)", qty: 2, rate: 99, discount: 0, salesperson: "Joe - MARKETING SVVAD PRO", payment_mode: "UPI" },
        { id: "B2", billing_date: getTodayDateStr(), product_name: "Svvad Pro Pea Protein Puffs (Smoky Barbeque 80g)", qty: 3, rate: 0, original_rate: 99, discount: 0, salesperson: "Joe - MARKETING SVVAD PRO", payment_mode: "SAMPLING", is_sampling: true },
        { id: "B3", billing_date: getTodayDateStr(), product_name: "Svvad Pro High Protein Roasted Pea Pops (Tangy Tomato 100g)", qty: 2, rate: 120, discount: 0.10, salesperson: "Rahul - Stall Lead", payment_mode: "Cash" },
        { id: "B4", billing_date: getTodayDateStr(), product_name: "Svvad Pro Pulse Protein Khakhra (Methi Crisps 150g)", qty: 1, rate: 140, discount: 0, salesperson: "Priya - Associate", payment_mode: "UPI" },
        { id: "B5", billing_date: getTodayDateStr(), product_name: "Svvad Pro High Protein Roasted Pea Pops (Cheese & Herbs 100g)", qty: 4, rate: 0, original_rate: 120, discount: 0, salesperson: "Amit - Promos", payment_mode: "SAMPLING", is_sampling: true }
      ];
      persistData();
    }
  }

  function persistData() {
    localStorage.setItem('svvad_stall_bills', JSON.stringify(state.bills));
    // Also save to server
    try {
      fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bills: state.bills })
      });
    } catch (e) { }
  }

  function initUI() {
    // Populate Product Dropdown
    const prodSelect = document.getElementById('entryProduct');
    prodSelect.innerHTML = state.products.map(p => `
      <option value="${p.id}">${p.name} - ₹${p.rate}</option>
    `).join('');

    prodSelect.onchange = (e) => {
      state.selectedProductId = e.target.value;
      updateLiveCalculations();
    };

    // Custom Discount input
    const custDis = document.getElementById('customDiscountInput');
    if (custDis) {
      custDis.oninput = (e) => {
        const val = parseFloat(e.target.value);
        if (val > 0 && val < 100) {
          state.currentDiscountPercent = val / 100;
          document.querySelectorAll('.btn-pill').forEach(b => b.classList.remove('active'));
          updateLiveCalculations();
        }
      };
    }

    const qtyInput = document.getElementById('entryQty');
    if (qtyInput) {
      qtyInput.oninput = (e) => {
        state.currentQty = Math.max(1, parseInt(e.target.value) || 1);
        updateLiveCalculations();
      };
    }

    // Set today date
    document.getElementById('currentDateDisplay').textContent = getTodayDateStr();

    // Hook EOD button
    document.getElementById('btnDownloadEOD').onclick = exportEODExcel;
  }

  // Live Calculations in the form
  function updateLiveCalculations() {
    const prod = state.products.find(p => p.id === state.selectedProductId) || state.products[0];
    const qty = state.currentQty;
    const rateInput = document.getElementById('entryRate');
    const paySelect = document.getElementById('entryPaymentMode');
    const submitBtn = document.getElementById('btnSubmitEntry');

    let effectiveRate = prod.rate;
    let discountFraction = 0;

    if (state.currentSaleType === 'normal') {
      effectiveRate = prod.rate;
      discountFraction = 0;
      rateInput.value = effectiveRate;
      submitBtn.className = 'btn-record-sale';
      submitBtn.innerHTML = `✓ Record Sale (Full Price) · Enter`;
    } else if (state.currentSaleType === 'offer') {
      effectiveRate = prod.rate;
      discountFraction = state.currentDiscountPercent;
      rateInput.value = effectiveRate;
      submitBtn.className = 'btn-record-sale';
      submitBtn.innerHTML = `🎉 Record Sale (With Offer: ${Math.round(discountFraction * 100)}% Off) · Enter`;
    } else if (state.currentSaleType === 'sample') {
      effectiveRate = 0;
      discountFraction = 0;
      rateInput.value = 0;
      paySelect.value = 'SAMPLING';
      submitBtn.className = 'btn-record-sale sampling';
      submitBtn.innerHTML = `🎁 Log Free Sampling (${qty} units)`;
    }

    const gross = effectiveRate * qty;
    const disAmt = gross * discountFraction;
    const net = Math.max(0, gross - disAmt);

    document.getElementById('calcGross').textContent = `₹${Math.round(gross)}`;
    document.getElementById('calcDiscount').textContent = `-₹${Math.round(disAmt)}`;
    document.getElementById('calcNet').textContent = `₹${Math.round(net)}`;
  }

  // Metrics update
  function updateMetrics() {
    let netSales = 0;
    let cashSales = 0;
    let upiSales = 0;

    let fullPriceUnits = 0;
    let fullPriceAmt = 0;

    let offerUnits = 0;
    let offerAmt = 0;
    let offerDisAmt = 0;

    let sampleUnits = 0;
    let sampleCostVal = 0;

    let totalProductsDispatched = 0;

    state.bills.forEach(b => {
      const q = parseInt(b.qty || 1);
      const r = parseFloat(b.rate || 0);
      const d = parseFloat(b.discount || 0);
      const isSamp = (b.payment_mode || '').toUpperCase() === 'SAMPLING' || b.is_sampling || r === 0;

      totalProductsDispatched += q;

      if (isSamp) {
        sampleUnits += q;
        const origR = parseFloat(b.original_rate || 99);
        sampleCostVal += (q * origR);
      } else {
        const gross = r * q;
        const disA = gross * d;
        const net = gross - disA;

        netSales += net;
        const mode = (b.payment_mode || '').toUpperCase();
        if (mode.includes('CASH')) cashSales += net;
        else upiSales += net;

        if (d > 0) {
          // Sold With Offer
          offerUnits += q;
          offerAmt += net;
          offerDisAmt += disA;
        } else {
          // Sold Without Offer (Full Price)
          fullPriceUnits += q;
          fullPriceAmt += net;
        }
      }
    });

    // 1. Total Net Sales
    document.getElementById('valNetSales').textContent = `₹${Math.round(netSales).toLocaleString('en-IN')}`;
    document.getElementById('subNetSales').textContent = `Cash: ₹${Math.round(cashSales).toLocaleString('en-IN')} · UPI: ₹${Math.round(upiSales).toLocaleString('en-IN')}`;

    // 2. Sold Without Offer
    document.getElementById('valFullPriceUnits').innerHTML = `${fullPriceUnits} <small>units</small>`;
    document.getElementById('subFullPriceAmt').textContent = `₹${Math.round(fullPriceAmt).toLocaleString('en-IN')} revenue`;

    // 3. Sold With Offer
    document.getElementById('valOfferUnits').innerHTML = `${offerUnits} <small>units</small>`;
    document.getElementById('subOfferAmt').textContent = `₹${Math.round(offerAmt).toLocaleString('en-IN')} (Saved ₹${Math.round(offerDisAmt)} in offers)`;

    // 4. Free Sampling
    document.getElementById('valFreeSamples').innerHTML = `${sampleUnits} <small>units</small>`;
    document.getElementById('subSampleVal').textContent = `Retail Value: ₹${Math.round(sampleCostVal).toLocaleString('en-IN')}`;

    // 5. Total Products
    document.getElementById('valTotalProducts').innerHTML = `${totalProductsDispatched} <small>pkts</small>`;
    document.getElementById('subTotalBills').textContent = `${state.bills.length} total entries`;
  }

  // Render Table (Exact Excel format)
  function renderTable() {
    const tbody = document.getElementById('tableBody');
    const tfoot = document.getElementById('tableFoot');

    let rows = state.bills;
    if (state.tableFilter === 'no_offer') {
      rows = rows.filter(b => !b.is_sampling && (b.payment_mode || '').toUpperCase() !== 'SAMPLING' && parseFloat(b.discount || 0) === 0 && parseFloat(b.rate || 0) > 0);
    } else if (state.tableFilter === 'offer') {
      rows = rows.filter(b => !b.is_sampling && (b.payment_mode || '').toUpperCase() !== 'SAMPLING' && parseFloat(b.discount || 0) > 0);
    } else if (state.tableFilter === 'sampling') {
      rows = rows.filter(b => b.is_sampling || (b.payment_mode || '').toUpperCase() === 'SAMPLING' || parseFloat(b.rate || 0) === 0);
    }

    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 30px; color: #94A3B8;">No records found for selected filter.</td></tr>`;
      tfoot.innerHTML = '';
      return;
    }

    let totQty = 0;
    let totDisAmt = 0;
    let totNetAmt = 0;

    tbody.innerHTML = rows.map((b, i) => {
      const q = parseInt(b.qty || 1);
      const r = parseFloat(b.rate || 0);
      const d = parseFloat(b.discount || 0);
      const disAmt = r * q * d;
      const totalAmt = (r * q) - disAmt;

      totQty += q;
      totDisAmt += disAmt;
      totNetAmt += totalAmt;

      const isSample = (b.payment_mode || '').toUpperCase() === 'SAMPLING' || b.is_sampling || r === 0;
      const isOffer = d > 0;

      let rowClass = '';
      if (isSample) rowClass = 'row-sample';
      else if (isOffer) rowClass = 'row-offer';

      const mode = (b.payment_mode || 'UPI').toUpperCase();
      let modeBadge = 'upi';
      if (mode.includes('CASH')) modeBadge = 'cash';
      if (mode.includes('CARD')) modeBadge = 'card';
      if (isSample) modeBadge = 'sampling';

      return `
        <tr class="${rowClass}">
          <td style="text-align: center; font-weight: 600;">${i + 1}</td>
          <td>${b.billing_date || getTodayDateStr()}</td>
          <td>
            <strong>${b.product_name}</strong>
            ${isSample ? `<span style="font-size: 10px; background: #EDE9FE; color: #7C3AED; padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: 700;">FREE SAMPLE</span>` : ''}
            ${isOffer ? `<span style="font-size: 10px; background: #FEF3C7; color: #B45309; padding: 2px 6px; border-radius: 4px; margin-left: 6px; font-weight: 700;">${Math.round(d * 100)}% OFF</span>` : ''}
          </td>
          <td style="text-align: right; font-weight: 700;">${q}</td>
          <td style="text-align: right;">${r.toFixed(2)}</td>
          <td style="text-align: right;">${d > 0 ? (d * 100).toFixed(0) + '%' : '0%'}</td>
          <td style="text-align: right;">${disAmt.toFixed(2)}</td>
          <td style="text-align: right; font-weight: 800; color: ${isSample ? '#7C3AED' : '#1B4332'};">${totalAmt.toFixed(2)}</td>
          <td>${b.salesperson || 'Joe'}</td>
          <td style="text-align: center;">
            <span class="badge-mode ${modeBadge}">${isSample ? 'SAMPLING' : b.payment_mode}</span>
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn-del" title="Delete" onclick="window.svvad.deleteEntry('${b.id || i}')">×</button>
          </td>
        </tr>
      `;
    }).join('');

    // Summary Row matching Row 156 of Template
    tfoot.innerHTML = `
      <tr>
        <td colspan="3" style="text-align: right; font-weight: 800;">Total (Formula Row)</td>
        <td style="text-align: right; font-weight: 800;">${totQty}</td>
        <td style="text-align: right;">-</td>
        <td style="text-align: right;">-</td>
        <td style="text-align: right; font-weight: 800;">₹${totDisAmt.toFixed(2)}</td>
        <td style="text-align: right; font-weight: 800; font-size: 15px;">₹${totNetAmt.toFixed(2)}</td>
        <td colspan="3" style="font-size: 12px; color: #15803D;">
          ${rows.length} entries · Net Collected: ₹${Math.round(totNetAmt)}
        </td>
      </tr>
    `;
  }

  function renderAll() {
    updateLiveCalculations();
    updateMetrics();
    renderTable();
  }

  // --- Export EOD Excel (Exact 1:1 format) ---
  async function exportEODExcel() {
    showToast('⏳ Downloading official EOD Excel sheet...');

    // Server-side openpyxl export
    try {
      const resp = await fetch('/api/export-excel');
      if (resp.ok) {
        const blob = await resp.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const d = new Date().toISOString().split('T')[0].replace(/-/g, '_');
        a.download = `Svvad_Stall_Daily_Billing_${d}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('✅ Downloaded official Excel file!');
        return;
      }
    } catch (e) { }

    // Client-side SheetJS fallback
    if (typeof XLSX !== 'undefined') {
      const wb = XLSX.utils.book_new();
      const rows = [];
      rows.push(['Svvad - STALL DAILY BILLING SHEET', '', '', '', '', '', '', '', '', '']);
      rows.push(['Sr. No.', 'Billing Date', 'Product Name', 'Qty', 'Rate', 'Dis.', 'Dis. Amt', 'Total Amt', 'Sale Person Name', 'Payment Mode']);

      state.bills.forEach((b, idx) => {
        const rNum = idx + 3;
        const q = parseInt(b.qty || 1);
        const r = parseFloat(b.rate || 0);
        const d = parseFloat(b.discount || 0);
        rows.push([
          idx + 1,
          b.billing_date || getTodayDateStr(),
          b.product_name,
          q,
          r,
          d,
          { f: `E${rNum}*D${rNum}*F${rNum}` },
          { f: `(E${rNum}*D${rNum})-G${rNum}` },
          b.salesperson || 'Joe - MARKETING SVVAD PRO',
          b.payment_mode || 'UPI'
        ]);
      });

      const lastR = state.bills.length + 2;
      rows.push([
        '', '', 'Total',
        { f: `SUM(D3:D${lastR})` },
        { f: `SUM(E3:E${lastR})` },
        { f: `SUM(F3:F${lastR})` },
        { f: `SUM(G3:G${lastR})` },
        { f: `SUM(H3:H${lastR})` },
        '', ''
      ]);

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];
      XLSX.utils.book_append_sheet(wb, ws, 'Biling Sheet');

      const d = new Date().toISOString().split('T')[0].replace(/-/g, '_');
      XLSX.writeFile(wb, `Svvad_Stall_Daily_Billing_${d}.xlsx`);
      showToast('✅ Downloaded Excel file!');
    }
  }

  // --- Exposed Action Handlers ---
  window.svvad = {
    setType: (type) => {
      state.currentSaleType = type;
      document.querySelectorAll('.btn-toggle').forEach(b => b.classList.remove('active'));

      const configBox = document.getElementById('offerConfigBox');
      const payWrap = document.getElementById('paymentModeWrap');
      const paySelect = document.getElementById('entryPaymentMode');

      if (type === 'normal') {
        document.getElementById('btnTypeNormal').classList.add('active');
        configBox.style.display = 'none';
        payWrap.style.display = 'block';
        if (paySelect.value === 'SAMPLING') paySelect.value = 'UPI';
      } else if (type === 'offer') {
        document.getElementById('btnTypeOffer').classList.add('active');
        configBox.style.display = 'block';
        payWrap.style.display = 'block';
        if (paySelect.value === 'SAMPLING') paySelect.value = 'UPI';
      } else if (type === 'sample') {
        document.getElementById('btnTypeSample').classList.add('active');
        configBox.style.display = 'none';
        paySelect.value = 'SAMPLING';
      }
      updateLiveCalculations();
    },

    setDiscount: (dis) => {
      state.currentDiscountPercent = dis;
      document.querySelectorAll('.btn-pill').forEach(b => b.classList.remove('active'));
      const found = Array.from(document.querySelectorAll('.btn-pill')).find(b => b.textContent.includes(`${Math.round(dis * 100)}%`));
      if (found) found.classList.add('active');
      updateLiveCalculations();
    },

    changeQty: (delta) => {
      state.currentQty = Math.max(1, state.currentQty + delta);
      document.getElementById('entryQty').value = state.currentQty;
      updateLiveCalculations();
    },

    setQty: (val) => {
      state.currentQty = val;
      document.getElementById('entryQty').value = val;
      updateLiveCalculations();
    },

    recordEntry: () => {
      const prod = state.products.find(p => p.id === state.selectedProductId) || state.products[0];
      const qty = state.currentQty;
      const sp = document.getElementById('entrySalesperson').value;
      const payMode = document.getElementById('entryPaymentMode').value;
      const isSample = state.currentSaleType === 'sample' || payMode === 'SAMPLING';

      let rate = prod.rate;
      let discount = 0;

      if (state.currentSaleType === 'normal') {
        rate = prod.rate;
        discount = 0;
      } else if (state.currentSaleType === 'offer') {
        rate = prod.rate;
        discount = state.currentDiscountPercent;
      } else if (state.currentSaleType === 'sample') {
        rate = 0;
        discount = 0;
      }

      const newBill = {
        id: `B${Date.now()}`,
        billing_date: getTodayDateStr(),
        product_name: prod.name,
        qty: qty,
        rate: rate,
        original_rate: prod.rate,
        discount: discount,
        salesperson: sp,
        payment_mode: isSample ? 'SAMPLING' : payMode,
        is_sampling: isSample
      };

      state.bills.unshift(newBill);
      persistData();
      playBeep(isSample);

      if (isSample) {
        showToast(`🎁 Logged Free Sample: ${qty}x ${prod.name}`, true);
      } else if (discount > 0) {
        showToast(`🎉 Sold ${qty}x with ${Math.round(discount * 100)}% Offer!`);
      } else {
        showToast(`✓ Sold ${qty}x ${prod.name} at Full Price`);
      }

      // Reset qty back to 1
      state.currentQty = 1;
      document.getElementById('entryQty').value = 1;
      renderAll();
    },

    recordQuickSample: () => {
      const prod = state.products.find(p => p.id === state.selectedProductId) || state.products[0];
      const sp = document.getElementById('entrySalesperson').value;

      const newBill = {
        id: `B${Date.now()}`,
        billing_date: getTodayDateStr(),
        product_name: prod.name,
        qty: 1,
        rate: 0,
        original_rate: prod.rate,
        discount: 0,
        salesperson: sp,
        payment_mode: 'SAMPLING',
        is_sampling: true
      };

      state.bills.unshift(newBill);
      persistData();
      playBeep(true);
      showToast(`🎁 1x Free Tasting Sample recorded for ${prod.name}`, true);
      renderAll();
    },

    deleteEntry: (id) => {
      state.bills = state.bills.filter((b, idx) => b.id !== id && String(idx) !== String(id));
      persistData();
      renderAll();
      showToast('Entry removed');
    },

    filterTable: () => {
      state.tableFilter = document.getElementById('filterType').value;
      renderTable();
    },

    clearToday: () => {
      if (confirm('Start a fresh day? This will clear today’s entries.')) {
        state.bills = [];
        persistData();
        renderAll();
        showToast('Fresh day started');
      }
    }
  };

  // Keyboard shortcut: Enter to submit
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.target.matches('select, textarea')) {
      e.preventDefault();
      window.svvad.recordEntry();
    }
  });

  document.addEventListener('DOMContentLoaded', loadData);
})();
