import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Minus, Plus, Search, Trash2, Package, CirclePlus, ListChecks, Lock, LockOpen, Smartphone, Banknote, CreditCard, X } from 'lucide-react';
import { eventNames, offerDiscountPercent, productsForEvent } from './data/products';

function productLabel(name) {
  return String(name || '').replace(/^Svvad Pro\s+/i, '');
}

function lineTotal(entry) {
  return Number(entry.rate || 0) * Number(entry.quantity || 0) * (1 - Number(entry.discount || 0) / 100);
}

function tileName(name) {
  return String(name || '').replace(/^High Protein /, '').replace(/^Protein /, '');
}

function shortName(name) {
  const short = tileName(name);
  const dash = short.indexOf(' - ');
  return dash >= 0 ? short.slice(dash + 3) : short;
}

const CATEGORY_COLORS = ['#b45309', '#a16207', '#dc2626', '#ea580c', '#ca8a04', '#78350f', '#15803d', '#7c3aed', '#0e7490'];

function offerBadge(offer) {
  if (!offer) return '';
  if (offer.kind === 'bogo') return '1+1';
  if (offer.kind === 'combo') return `${offer.qty} for ₹${offer.price}`;
  const percent = String(offer.label || '').match(/\d+%/);
  return percent ? `-${percent[0]}` : offer.label;
}

function cartonText(qty, perBox) {
  if (!perBox || qty < perBox) return `${qty} pkt`;
  const loose = qty % perBox;
  return `${Math.floor(qty / perBox)} ctn${loose ? ` + ${loose} pkt` : ''}`;
}

function buildBillLines(bill, products) {
  const picked = products.filter((product) => Number(bill[product.id] || 0) > 0);
  const lines = [];
  const puffs = picked.filter((product) => product.offer?.kind === 'combo');
  if (puffs.length) {
    const offer = puffs[0].offer;
    const totalPuffs = puffs.reduce((sum, product) => sum + Number(bill[product.id]), 0);
    let comboLeft = Math.floor(totalPuffs / offer.qty) * offer.qty;
    puffs.forEach((product) => {
      const qty = Number(bill[product.id]);
      const inCombo = Math.min(qty, comboLeft);
      comboLeft -= inCombo;
      if (inCombo) lines.push({ product, quantity: inCombo, discount: offerDiscountPercent(product, offer.qty), offerLabel: offer.label, type: 'with' });
      if (qty > inCombo) lines.push({ product, quantity: qty - inCombo, discount: 0, offerLabel: '', type: 'without' });
    });
  }
  picked.filter((product) => product.offer?.kind !== 'combo').forEach((product) => {
    const qty = Number(bill[product.id]);
    const discount = offerDiscountPercent(product, qty);
    lines.push(discount > 0
      ? { product, quantity: qty, discount, offerLabel: product.offer.label, type: 'with' }
      : { product, quantity: qty, discount: 0, offerLabel: '', type: 'without' });
  });
  return lines;
}

function todayIso() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

const STORAGE_KEY = 'svvad_pro_event_stock_v1';
const ENTRIES_KEY = 'svvad_pro_event_entries_v1';
const PERSON_KEY = 'svvad_pro_sale_person_v1';
const PENDING_KEY = 'svvad_pro_pending_ops_v1';

function loadPendingOps() {
  try {
    const ops = JSON.parse(localStorage.getItem(PENDING_KEY));
    return Array.isArray(ops) ? ops : [];
  } catch {
    return [];
  }
}

function savePendingOps(ops) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(ops));
  } catch {
    // Storage full or blocked; the in-memory queue still retries.
  }
}

function loadStock() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(ENTRIES_KEY)) || {};
  } catch {
    return {};
  }
}

function loadPeople() {
  try {
    return JSON.parse(localStorage.getItem(PERSON_KEY)) || {};
  } catch {
    return {};
  }
}

export default function App() {
  const [eventName, setEventName] = useState(eventNames[0]);
  const [stockByEvent, setStockByEvent] = useState(loadStock);
  const [entriesByEvent, setEntriesByEvent] = useState(loadEntries);
  const [search, setSearch] = useState('');
  const [stockLocked, setStockLocked] = useState(true);
  const [notice, setNotice] = useState('');
  const savedTimer = useRef(null);
  const saveLock = useRef(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productQuery, setProductQuery] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [entryType, setEntryType] = useState('without');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [bill, setBill] = useState({});
  const [dayMode, setDayMode] = useState('today');
  const [activeView, setActiveView] = useState('stock');
  const [saleCategory, setSaleCategory] = useState('All');
  const [showSetup, setShowSetup] = useState(false);
  const [peopleByEvent, setPeopleByEvent] = useState(loadPeople);
  const [exporting, setExporting] = useState(false);
  const [booted, setBooted] = useState(false);
  const revisionRef = useRef(0);
  const opsQueueRef = useRef(loadPendingOps());
  const syncingRef = useRef(false);
  const flushTimerRef = useRef(null);
  const failStreakRef = useRef(0);
  const [unsynced, setUnsynced] = useState(() => loadPendingOps().length);

  const eventProducts = useMemo(() => productsForEvent(eventName), [eventName]);
  const eventStock = stockByEvent[eventName] || {};
  const entries = Array.isArray(entriesByEvent[eventName]) ? entriesByEvent[eventName] : [];
  const salePerson = peopleByEvent[eventName] || '';

  const applySharedState = (data) => {
    const stock = data.stockByEvent && typeof data.stockByEvent === 'object' ? data.stockByEvent : {};
    const sharedEntries = data.entriesByEvent && typeof data.entriesByEvent === 'object'
      ? Object.fromEntries(Object.entries(data.entriesByEvent).map(([event, lines]) => [event, Array.isArray(lines) ? lines : []]))
      : {};
    const people = data.peopleByEvent && typeof data.peopleByEvent === 'object' ? data.peopleByEvent : {};
    revisionRef.current = Number(data.revision) || 0;
    setStockByEvent(stock);
    setEntriesByEvent(sharedEntries);
    setPeopleByEvent(people);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stock));
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(sharedEntries));
    localStorage.setItem(PERSON_KEY, JSON.stringify(people));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/stall-state');
        if (opsQueueRef.current.length) {
          flushOps();
        } else if (response.ok) {
          const data = await response.json();
          if (!cancelled && Number(data.revision) > 0 && !opsQueueRef.current.length) applySharedState(data);
        }
      } catch {
        // This browser still shows the last saved stall if the shared link is offline.
      } finally {
        if (!cancelled) setBooted(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!booted) return undefined;
    const pull = async () => {
      if (syncingRef.current || opsQueueRef.current.length) return;
      try {
        const response = await fetch('/api/stall-state');
        if (!response.ok) return;
        const data = await response.json();
        if (syncingRef.current || opsQueueRef.current.length) return;
        if (Number(data.revision) > revisionRef.current) applySharedState(data);
      } catch {
        // Keep the current screen until the next sync.
      }
    };
    const timer = window.setInterval(pull, 3000);
    return () => window.clearInterval(timer);
  }, [booted]);

  const flushOps = async () => {
    if (syncingRef.current || !opsQueueRef.current.length) return;
    syncingRef.current = true;
    const sending = opsQueueRef.current.splice(0);
    let saved = false;
    try {
      const response = await fetch('/api/stall-ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ops: sending })
      });
      if (!response.ok) {
        let message = '';
        try {
          message = (await response.json()).error || '';
        } catch {
          // Not JSON; keep the default message.
        }
        throw new Error(message);
      }
      const data = await response.json();
      saved = true;
      savePendingOps(opsQueueRef.current);
      setUnsynced(opsQueueRef.current.length);
      if (failStreakRef.current) {
        failStreakRef.current = 0;
        setNotice('All sales synced');
        window.clearTimeout(savedTimer.current);
        savedTimer.current = window.setTimeout(() => setNotice(''), 2200);
      }
      if (opsQueueRef.current.length) {
        revisionRef.current = Math.max(revisionRef.current, Number(data.revision) || 0);
      } else {
        applySharedState(data);
      }
    } catch (error) {
      opsQueueRef.current.unshift(...sending);
      setUnsynced(opsQueueRef.current.length);
      failStreakRef.current += 1;
      if (failStreakRef.current === 1) {
        const serverMessage = error instanceof TypeError ? '' : error?.message;
        setNotice(serverMessage || 'No internet. Sales are saved on this phone and will sync.');
        window.clearTimeout(savedTimer.current);
        savedTimer.current = window.setTimeout(() => setNotice(''), 4000);
      }
      window.clearTimeout(flushTimerRef.current);
      flushTimerRef.current = window.setTimeout(flushOps, Math.min(20000, 3000 * failStreakRef.current));
    } finally {
      syncingRef.current = false;
      if (saved && opsQueueRef.current.length) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = window.setTimeout(flushOps, 250);
      }
    }
  };

  useEffect(() => {
    if (activeView !== 'stock') setStockLocked(true);
  }, [activeView, eventName]);

  useEffect(() => {
    setShowSetup(activeView === 'entry' && !salePerson.trim());
  }, [activeView]);

  const queueOps = (ops) => {
    opsQueueRef.current.push(...ops);
    savePendingOps(opsQueueRef.current);
    setUnsynced(opsQueueRef.current.length);
    window.clearTimeout(flushTimerRef.current);
    flushTimerRef.current = window.setTimeout(flushOps, 250);
  };

  const updateSalePerson = (value) => {
    const updated = { ...peopleByEvent, [eventName]: value };
    setPeopleByEvent(updated);
    localStorage.setItem(PERSON_KEY, JSON.stringify(updated));
    queueOps([{ op: 'person', event: eventName, value }]);
  };
  const products = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? eventProducts.filter((product) => product.name.toLowerCase().includes(query))
      : eventProducts;
  }, [search, eventProducts]);

  const totalStock = eventProducts.reduce(
    (total, product) => total + Number(eventStock[product.id] || 0),
    0
  );
  const cartonsInStock = eventProducts.reduce(
    (total, product) => total + (product.perBox ? Math.floor(Number(eventStock[product.id] || 0) / product.perBox) : 0),
    0
  );
  const loosePackets = eventProducts.reduce(
    (total, product) => total + (product.perBox ? Number(eventStock[product.id] || 0) % product.perBox : Number(eventStock[product.id] || 0)),
    0
  );
  const unitsEntered = entries
    .filter((entry) => entry.type !== 'sample')
    .reduce((total, entry) => total + Number(entry.quantity || 0), 0);

  const updateStock = (productId, value) => {
    const quantity = Math.max(0, Math.floor(Number(value) || 0));
    const delta = quantity - Number(eventStock[productId] || 0);
    if (!delta) return;
    const updated = {
      ...stockByEvent,
      [eventName]: { ...eventStock, [productId]: quantity }
    };
    setStockByEvent(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    queueOps([{ op: 'stockDelta', event: eventName, productId, delta }]);
  };

  const chosenProduct = eventProducts.find((product) => product.name === selectedProduct);
  const productChoices = useMemo(() => {
    const query = productQuery.trim().toLowerCase();
    if (!query) return eventProducts;
    return eventProducts.filter((product) => product.name.toLowerCase().includes(query) || product.category.toLowerCase().includes(query));
  }, [productQuery, eventProducts]);
  const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
  const offerAvailable = Boolean(chosenProduct?.offer) && chosenProduct.offer.kind !== 'combo';
  const effectiveType = entryType === 'with' && !offerAvailable ? 'without' : entryType;
  const activeDiscount = effectiveType === 'with' ? offerDiscountPercent(chosenProduct, safeQuantity) : 0;
  const selectedStock = chosenProduct ? Number(eventStock[chosenProduct.id] || 0) : 0;
  const hasEnoughStock = Boolean(chosenProduct) && selectedStock >= safeQuantity;
  const entryTotal = chosenProduct
    ? effectiveType === 'sample'
      ? 0
      : chosenProduct.rate * safeQuantity * (1 - activeDiscount / 100)
    : 0;

  const billLines = useMemo(() => buildBillLines(bill, eventProducts), [bill, eventProducts]);
  const billTotal = billLines.reduce((sum, line) => sum + line.product.rate * line.quantity * (1 - line.discount / 100), 0);
  const billPacks = billLines.reduce((sum, line) => sum + line.quantity, 0);
  const billFullPrice = billLines.reduce((sum, line) => sum + line.product.rate * line.quantity, 0);
  const billSaved = Math.round(billFullPrice - billTotal);
  const saleCategories = [...new Set(eventProducts.map((product) => product.category))];
  const comboOffer = eventProducts.find((product) => product.offer?.kind === 'combo')?.offer;
  const billPuffs = eventProducts
    .filter((product) => product.offer?.kind === 'combo')
    .reduce((sum, product) => sum + Number(bill[product.id] || 0), 0);
  const puffsNeeded = comboOffer && billPuffs % comboOffer.qty ? comboOffer.qty - (billPuffs % comboOffer.qty) : 0;

  const flash = (message, ms = 1800) => {
    setNotice(message);
    window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setNotice(''), ms);
  };

  const recordLines = (lines, mode = paymentMode) => {
    const now = new Date();
    const stamp = `${now.getTime()}-${Math.random().toString(36).slice(2, 7)}`;
    const newEntries = lines.map((line, index) => ({
      id: `${stamp}-${index}`,
      date: now.toLocaleDateString('en-GB'),
      isoDate: todayIso(),
      productId: line.product.id,
      productName: line.product.name,
      quantity: line.quantity,
      rate: line.type === 'sample' ? 0 : line.product.rate,
      discount: line.discount,
      offerLabel: line.offerLabel || '',
      type: line.type,
      paymentMode: line.type === 'sample' ? 'SAMPLING' : mode,
      salesperson: salePerson.trim(),
      stockDeducted: true
    }));
    const nextStock = { ...eventStock };
    lines.forEach((line) => {
      nextStock[line.product.id] = Number(nextStock[line.product.id] || 0) - line.quantity;
    });
    const updatedEntries = { ...entriesByEvent, [eventName]: [...newEntries.reverse(), ...entries] };
    const updatedStock = { ...stockByEvent, [eventName]: nextStock };
    setEntriesByEvent(updatedEntries);
    setStockByEvent(updatedStock);
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(updatedEntries));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStock));
    queueOps([{ op: 'addEntries', event: eventName, entries: newEntries, deductStock: true }]);
    return newEntries.map((entry) => entry.id);
  };

  const addToBill = (product, delta) => {
    const current = Number(bill[product.id] || 0);
    const next = Math.max(0, current + delta);
    const stockQty = Number(eventStock[product.id] || 0);
    if (delta > 0 && next > stockQty) {
      flash(stockQty === 0
        ? `${tileName(product.name)} has no stock. Add it in the Stock tab first.`
        : `Only ${stockQty} ${tileName(product.name)} in stock.`, 2600);
      return;
    }
    setBill({ ...bill, [product.id]: next });
  };

  const payBill = (mode) => {
    if (!billLines.length || saveLock.current) return;
    saveLock.current = true;
    recordLines(billLines, mode);
    setBill({});
    window.setTimeout(() => { saveLock.current = false; }, 300);
  };

  const saveEntry = (event) => {
    event.preventDefault();
    if (!chosenProduct || saveLock.current) return;
    if (!hasEnoughStock) {
      flash(`Only ${selectedStock} packet${selectedStock === 1 ? '' : 's'} available. Add stock first.`, 3000);
      return;
    }
    saveLock.current = true;
    recordLines([{
      product: chosenProduct,
      quantity: safeQuantity,
      discount: activeDiscount,
      offerLabel: effectiveType === 'with' ? chosenProduct.offer.label : '',
      type: effectiveType
    }]);
    setSelectedProduct('');
    setProductQuery('');
    setQuantity(1);
    flash('Sale saved and stock reduced');
    window.setTimeout(() => { saveLock.current = false; }, 300);
  };

  const deleteSale = (sale) => {
    if (!window.confirm(`Delete this ${money(sale.total)} sale? Its packets go back to stock.`)) return;
    const ids = new Set(sale.lines.map((entry) => entry.id));
    const updatedEntries = { ...entriesByEvent, [eventName]: entries.filter((item) => !ids.has(item.id)) };
    const nextStock = { ...eventStock };
    sale.lines.forEach((entry) => {
      if (entry.stockDeducted) nextStock[entry.productId] = Number(nextStock[entry.productId] || 0) + Number(entry.quantity || 0);
    });
    const updatedStock = { ...stockByEvent, [eventName]: nextStock };
    setEntriesByEvent(updatedEntries);
    setStockByEvent(updatedStock);
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(updatedEntries));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStock));
    queueOps([{ op: 'removeEntries', event: eventName, ids: [...ids], restoreStock: true }]);
    flash('Sale deleted and stock returned');
  };

  const today = todayIso();
  const outToday = entries.reduce((totals, entry) => {
    if (entry.isoDate !== today) return totals;
    const row = totals[entry.productId] || { sold: 0, samples: 0, deducted: 0 };
    const qty = Number(entry.quantity || 0);
    if (entry.type === 'sample') row.samples += qty;
    else row.sold += qty;
    if (entry.stockDeducted) row.deducted += qty;
    totals[entry.productId] = row;
    return totals;
  }, {});
  const dayEntries = dayMode === 'today' ? entries.filter((entry) => entry.isoDate === today) : entries;
  const sales = Object.values(dayEntries.reduce((groups, entry) => {
    const parts = String(entry.id).split('-');
    const key = parts.length >= 3 ? parts.slice(0, 2).join('-') : String(entry.id);
    const stamp = Number(parts[0]) || 0;
    const group = groups[key] || { key, stamp, mode: entry.paymentMode, date: entry.date, lines: [], total: 0, packets: 0 };
    group.lines.push(entry);
    group.total += entry.type === 'sample' ? 0 : lineTotal(entry);
    group.packets += Number(entry.quantity || 0);
    groups[key] = group;
    return groups;
  }, {})).sort((a, b) => b.stamp - a.stamp);
  const saleLines = dayEntries.filter((entry) => entry.type !== 'sample');
  const daySummary = {
    total: saleLines.reduce((sum, entry) => sum + lineTotal(entry), 0),
    packets: saleLines.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0),
    samples: dayEntries.filter((entry) => entry.type === 'sample').reduce((sum, entry) => sum + Number(entry.quantity || 0), 0),
    byPayment: ['UPI', 'Cash', 'Card'].map((mode) => [mode, saleLines.filter((entry) => entry.paymentMode === mode).reduce((sum, entry) => sum + lineTotal(entry), 0)])
  };
  const byProduct = Object.values(dayEntries.reduce((groups, entry) => {
    const key = entry.productName;
    const group = groups[key] || { name: key, packets: 0, amount: 0 };
    group.packets += Number(entry.quantity || 0);
    group.amount += entry.type === 'sample' ? 0 : lineTotal(entry);
    groups[key] = group;
    return groups;
  }, {})).sort((a, b) => b.amount - a.amount || b.packets - a.packets);
  function money(value) {
    const amount = Math.round((Number(value) || 0) * 100) / 100;
    return amount % 1 === 0 ? `₹${amount}` : `₹${amount.toFixed(2)}`;
  }

  const exportExcel = async () => {
    if (exporting) return;
    const person = salePerson.trim();
    if (!dayEntries.length) {
      flash(dayMode === 'today' ? 'No sales today yet. Nothing to download.' : 'No sales yet. Nothing to download.', 3200);
      return;
    }
    const missingName = dayEntries.some((entry) => !(entry.salesperson || person));
    if (missingName) {
      flash('Enter Sale Person Name first. That name is printed in the Excel sheet.', 3200);
      return;
    }
    const ordered = [...dayEntries].reverse();
    const payload = ordered.map((entry) => ({
      billing_date: entry.isoDate || entry.date,
      product_name: entry.productName,
      qty: entry.quantity,
      rate: entry.type === 'sample' ? 0 : entry.rate,
      discount: (entry.type === 'sample' ? 0 : Number(entry.discount) || 0) / 100,
      salesperson: entry.salesperson || person,
      payment_mode: entry.paymentMode
    }));
    setExporting(true);
    try {
      const response = await fetch('/api/export-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_name: eventName, entries: payload })
      });
      if (!response.ok) {
        let message = 'Could not create the billing Excel file.';
        try {
          const error = await response.json();
          if (error.error) message = error.error;
        } catch {
          // Keep the fallback message.
        }
        setNotice(message);
        return;
      }
      const blob = await response.blob();
      const headerName = response.headers.get('X-Export-Filename');
      const filename = headerName || `Svvad_Stall_Daily_Billing_${eventName.replace(/[^a-z0-9]+/gi, '_')}.xlsx`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      setNotice(`${dayMode === 'today' ? "Today's" : 'All days'} billing Excel downloaded (${ordered.length} rows).`);
    } catch {
      setNotice('Excel download failed. Check the internet and try again.');
    } finally {
      setExporting(false);
      window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setNotice(''), 3600);
    }
  };

  return (
    <div className={`app-shell ${activeView === 'entry' && billPacks > 0 ? 'has-bill' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <span>SVVAD PRO{unsynced > 0 && <em className="sync-pending">{unsynced} not synced</em>}</span>
          <h1>Stall counter</h1>
        </div>
        <button className="excel-button" onClick={exportExcel} disabled={exporting}>
          <Download size={18} />
          {exporting ? 'Preparing…' : 'Download Excel'}
        </button>
      </header>

      <main className="page">
        {activeView !== 'stock' && !showSetup ? (
        <button type="button" className="context-mini" onClick={() => setShowSetup(true)}>
          <span><b>{eventName.replace(/^SVVAD PRO /, '')}</b> · {salePerson.trim() || 'No sale person'}</span>
          <em>Change</em>
        </button>
        ) : (
        <section className="context-bar">
          {activeView !== 'stock' && (
            <button type="button" className="context-done" onClick={() => setShowSetup(false)}>Done</button>
          )}
          <label className="field">
            <span>Event</span>
            <select value={eventName} onChange={(event) => {
              const nextEvent = event.target.value;
              setEventName(nextEvent);
              setBill({});
              const nextStock = stockByEvent[nextEvent] || {};
              if (!Object.values(nextStock).some((value) => Number(value) > 0)) setActiveView('stock');
            }}>
              {eventNames.map((name) => <option key={name}>{name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Sale person</span>
            <input
              value={salePerson}
              onChange={(event) => updateSalePerson(event.target.value)}
              placeholder="Name for the Excel sheet"
              autoComplete="name"
            />
          </label>
        </section>
        )}

        {activeView === 'stock' && (
          <section className="panel panel-stock">
            <div className="metrics">
              <div className="metric metric-green"><strong>{cartonsInStock}</strong><span>Cartons{loosePackets ? ` + ${loosePackets} loose` : ''}</span></div>
              <div className="metric metric-blue"><strong>{totalStock}</strong><span>Packets in stock</span></div>
              <div className="metric metric-amber"><strong>{unitsEntered}</strong><span>Packets sold</span></div>
            </div>
            <div className="panel-head">
              <div className="stock-title">
                <h2>Stock</h2>
                <button
                  type="button"
                  className={`lock-button ${stockLocked ? '' : 'open'}`}
                  onClick={() => {
                    if (!stockLocked) { setStockLocked(true); return; }
                    if (window.confirm('Unlock stock editing? Changes apply to every phone.')) setStockLocked(false);
                  }}
                >
                  {stockLocked ? <Lock size={16} /> : <LockOpen size={16} />}
                  {stockLocked ? 'Unlock to edit' : 'Lock stock'}
                </button>
              </div>
              <label className="search-box">
                <Search size={18} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search product"
                />
              </label>
            </div>
            <div className="product-list">
              {products.length === 0 && <p className="empty-message">No product matches that search.</p>}
              {products.map((product) => {
                const stockQty = Number(eventStock[product.id] || 0);
                const perBox = Number(product.perBox) || 0;
                const cartons = perBox ? Math.floor(stockQty / perBox) : 0;
                const loose = perBox ? stockQty % perBox : stockQty;
                const out = outToday[product.id] || { sold: 0, samples: 0, deducted: 0 };
                const opening = stockQty + out.deducted;
                return (
                  <article className={`product-row ${stockLocked ? 'locked' : ''}`} key={product.id}>
                    <div className="product-info">
                      <div className="stock-name">
                        <h3>{tileName(product.name)}</h3>
                        <span className="product-price">{money(product.rate)}</span>
                        {product.offer ? <span className="offer-chip">{product.offer.label}</span> : null}
                      </div>
                      {opening > 0 ? (
                        <div className="day-flow">
                          <div className="flow-sold"><span>Sold</span><b>{out.sold}</b><small>{cartonText(out.sold, perBox)}</small></div>
                          <div className={`flow-left ${stockQty === 0 ? 'flow-out' : ''}`}><span>Left</span><b>{stockQty}</b><small>{cartonText(stockQty, perBox)}</small></div>
                          {out.samples > 0 && <div className="flow-sample"><span>Samples</span><b>{out.samples}</b><small>free</small></div>}
                        </div>
                      ) : (
                        <div className="day-flow"><div className="flow-out"><span>Stock</span><b>0</b><small>none yet</small></div></div>
                      )}
                    </div>
                    {!stockLocked && <div className="stock-steppers">
                      {perBox > 0 && (
                        <div className="stock-stepper">
                          <span>Cartons <em>{perBox}/ctn</em></span>
                          <div className="quantity-control" aria-label={`${product.name} cartons`}>
                            <button aria-label={`Remove one carton ${product.name}`} onClick={() => updateStock(product.id, stockQty - perBox)} disabled={cartons === 0}>
                              <Minus size={20} />
                            </button>
                            <input
                              inputMode="numeric"
                              aria-label={`Cartons for ${product.name}`}
                              value={cartons}
                              onChange={(event) => updateStock(product.id, Math.max(0, Math.floor(Number(event.target.value) || 0)) * perBox + loose)}
                            />
                            <button className="add-button" aria-label={`Add one carton ${product.name}`} onClick={() => updateStock(product.id, stockQty + perBox)}>
                              <Plus size={20} />
                            </button>
                          </div>
                        </div>
                      )}
                      <div className="stock-stepper">
                        <span>{perBox > 0 ? 'Total packets' : 'Packets'}</span>
                        <div className="quantity-control" aria-label={`${product.name} quantity`}>
                          <button aria-label={`Remove one ${product.name}`} onClick={() => updateStock(product.id, stockQty - 1)} disabled={stockQty === 0}>
                            <Minus size={20} />
                          </button>
                          <input
                            inputMode="numeric"
                            aria-label={`Total packets for ${product.name}`}
                            value={stockQty}
                            onChange={(event) => updateStock(product.id, event.target.value)}
                          />
                          <button className="add-button" aria-label={`Add one ${product.name}`} onClick={() => updateStock(product.id, stockQty + 1)}>
                            <Plus size={20} />
                          </button>
                        </div>
                      </div>
                    </div>}
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {activeView === 'entry' && (
          <section className="panel quick-sale">
            <div className="quick-cats" role="tablist" aria-label="Product groups">
              {['All', ...saleCategories].map((category) => {
                const picked = category === 'All'
                  ? billPacks
                  : eventProducts.filter((product) => product.category === category).reduce((sum, product) => sum + Number(bill[product.id] || 0), 0);
                return (
                  <button
                    type="button"
                    key={category}
                    role="tab"
                    aria-selected={saleCategory === category}
                    className={saleCategory === category ? 'active' : ''}
                    onClick={() => setSaleCategory(category)}
                  >
                    {category}{picked ? <b>{picked}</b> : null}
                  </button>
                );
              })}
            </div>
            {saleCategories.filter((category) => saleCategory === 'All' || saleCategory === category).map((category) => (
            <div className="quick-group" key={category} style={{ '--accent': CATEGORY_COLORS[saleCategories.indexOf(category) % CATEGORY_COLORS.length] }}>
            <h3 className="quick-group-title">{category}</h3>
            <div className="quick-grid">
              {eventProducts.filter((product) => product.category === category).map((product) => {
                const count = Number(bill[product.id] || 0);
                const left = Number(eventStock[product.id] || 0) - count;
                const offerPrice = product.offer?.kind === 'price' ? product.offer.price : null;
                return (
                  <div className={`quick-tile ${count ? 'picked' : ''} ${left <= 0 && !count ? 'empty' : ''}`} key={product.id}>
                    <button type="button" className="quick-add" onClick={() => addToBill(product, 1)} aria-label={`Add ${product.name} to bill`}>
                      <strong>{shortName(product.name)}</strong>
                      <span className="quick-price">
                        <b>{money(offerPrice || product.rate)}</b>
                        {offerBadge(product.offer) ? <em>{offerBadge(product.offer)}</em> : null}
                      </span>
                      {left <= 10 && (
                        <small className={left <= 0 ? 'out' : 'low'}>{left > 0 ? `Only ${left}` : count ? 'No more' : 'Out'}</small>
                      )}
                    </button>
                    {count > 0 && (
                      <>
                        <b className="quick-badge">{count}</b>
                        <button type="button" className="quick-minus" onClick={() => addToBill(product, -1)} aria-label={`Remove one ${product.name} from bill`}><Minus size={16} /></button>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            </div>
            ))}
          </section>
        )}

        {activeView === 'entry' && (
          <details className="panel panel-entry more-entry">
            <summary>Free sample or sale without offer</summary>
            <form className="entry-form" onSubmit={saveEntry}>

              <div className="field">
                <span>Product</span>
                <div className="product-picker">
                  <input
                    value={productQuery}
                    onChange={(event) => {
                      const value = event.target.value;
                      setProductQuery(value);
                      const query = value.trim().toLowerCase();
                      const match = eventProducts.find((product) => product.name.toLowerCase() === query);
                      setSelectedProduct(match ? match.name : '');
                    }}
                    placeholder="Search cookies, muesli, nachos..."
                    aria-label="Search product"
                  />
                  <div className="product-choices" role="listbox" aria-label="Products">
                    {productChoices.length === 0 ? (
                      <p className="picker-more">No product with that name.</p>
                    ) : productChoices.map((product) => (
                      <button
                        type="button"
                        key={product.id}
                        role="option"
                        aria-selected={selectedProduct === product.name}
                        className={selectedProduct === product.name ? 'active' : ''}
                        onClick={() => {
                          setSelectedProduct(product.name);
                          setProductQuery(productLabel(product.name));
                        }}
                      >
                        <strong>{productLabel(product.name)}</strong>
                        <em>{money(product.rate)}</em>
                      </button>
                    ))}
                  </div>
                </div>
                {chosenProduct && (
                  <small className={hasEnoughStock ? 'hint' : 'hint warn'}>
                    {selectedStock} in stock
                    {chosenProduct.offer?.kind === 'combo' ? ' · tap puffs in Quick bill for 3 for ₹100' : ''}
                  </small>
                )}
              </div>

              <div className="entry-types" role="group" aria-label="Entry type">
                <button type="button" aria-pressed={effectiveType === 'without'} className={`type-normal ${effectiveType === 'without' ? 'active' : ''}`} onClick={() => setEntryType('without')}>Normal sale</button>
                <button type="button" aria-pressed={effectiveType === 'with'} className={`type-offer ${effectiveType === 'with' ? 'active' : ''}`} onClick={() => setEntryType('with')} disabled={!offerAvailable}>
                  {offerAvailable ? chosenProduct.offer.label : 'Offer'}
                </button>
                <button type="button" aria-pressed={effectiveType === 'sample'} className={`type-sample ${effectiveType === 'sample' ? 'active' : ''}`} onClick={() => setEntryType('sample')}>Free sample</button>
              </div>

              <div className="entry-fields">
                <label className="field">
                  <span>Quantity</span>
                  <input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} />
                </label>
                {effectiveType !== 'sample' && (
                  <label className="field">
                    <span>Payment</span>
                    <select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}>
                      <option>UPI</option><option>Cash</option><option>Card</option>
                    </select>
                  </label>
                )}
              </div>

              <div className="entry-save-row">
                <div className="entry-amount">
                  <span>Total</span>
                  <strong>{money(entryTotal)}</strong>
                </div>
                <button className="save-button" disabled={!chosenProduct || !hasEnoughStock}>
                  {!chosenProduct ? 'Choose a product' : !hasEnoughStock ? 'Add stock first' : 'Save sale'}
                </button>
              </div>
            </form>
          </details>
        )}

        {activeView === 'saved' && (
          <section className="saved-screen">
            <div className="day-head">
              <h2>Day sale</h2>
              <div className="day-switch" role="group" aria-label="Days">
                <button type="button" className={dayMode === 'today' ? 'active' : ''} onClick={() => setDayMode('today')}>Today</button>
                <button type="button" className={dayMode === 'all' ? 'active' : ''} onClick={() => setDayMode('all')}>All days</button>
              </div>
            </div>

            <div className="day-hero">
              <small>{dayMode === 'today' ? "Today's sale" : 'Total sale'}</small>
              <strong>{money(daySummary.total)}</strong>
              <span>{sales.length} sale{sales.length === 1 ? '' : 's'} · {daySummary.packets} packets{daySummary.samples ? ` · ${daySummary.samples} free` : ''}</span>
              {daySummary.total > 0 && (
                <div className="pay-split-bar">
                  {daySummary.byPayment.filter(([, amount]) => amount > 0).map(([mode, amount]) => (
                    <i key={mode} className={`pay-${mode.toLowerCase()}`} style={{ flex: amount }} />
                  ))}
                </div>
              )}
            </div>

            <div className="pay-split">
              {daySummary.byPayment.map(([mode, amount]) => {
                const Icon = mode === 'UPI' ? Smartphone : mode === 'Cash' ? Banknote : CreditCard;
                return (
                  <div className={`pay-chip pay-${mode.toLowerCase()}`} key={mode}>
                    <Icon size={16} />
                    <span>{mode}</span>
                    <b>{money(amount)}</b>
                  </div>
                );
              })}
            </div>

            {byProduct.length > 0 && (
              <div className="day-card">
                <h3>Top products</h3>
                {byProduct.map((row) => (
                  <div className="by-product-row" key={row.name}>
                    <span>{tileName(row.name)}</span>
                    <small>{row.packets} pkt</small>
                    <b>{money(Math.round(row.amount))}</b>
                  </div>
                ))}
              </div>
            )}

            <div className="day-card">
              <h3>Sales</h3>
              {sales.length === 0 ? (
                <p className="empty-box">No sales yet. They show here after you tap UPI, Cash or Card.</p>
              ) : sales.map((sale) => (
                <article className={`sale-row sale-${String(sale.mode).toLowerCase()}`} key={sale.key}>
                  <div className="sale-top">
                    <span className="sale-time">
                      {sale.stamp > 1e12 ? new Date(sale.stamp).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : sale.date}
                      {dayMode === 'all' && sale.stamp > 1e12 ? ` · ${sale.date}` : ''}
                    </span>
                    <em className={`sale-mode mode-${String(sale.mode).toLowerCase()}`}>{sale.mode === 'SAMPLING' ? 'Free' : sale.mode}</em>
                    <b>{money(sale.total)}</b>
                    <button type="button" className="sale-delete" onClick={() => deleteSale(sale)} aria-label={`Delete ${money(sale.total)} sale`}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <ul className="sale-items">
                    {sale.lines.map((entry) => (
                      <li key={entry.id}>
                        <b>{entry.quantity}×</b>
                        <span>{tileName(entry.productName)}</span>
                        <small>{entry.type === 'sample' ? 'Free' : money(lineTotal(entry))}</small>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Stall sections">
        <button className={`nav-stock ${activeView === 'stock' ? 'active' : ''}`} onClick={() => { setActiveView('stock'); window.scrollTo(0, 0); }} aria-pressed={activeView === 'stock'}>
          <Package size={18} /><span>Stock</span>
        </button>
        <button className={`nav-entry ${activeView === 'entry' ? 'active' : ''}`} onClick={() => { setActiveView('entry'); window.scrollTo(0, 0); }} aria-pressed={activeView === 'entry'}>
          <CirclePlus size={18} /><span>Sale</span>
        </button>
        <button className={`nav-saved ${activeView === 'saved' ? 'active' : ''}`} onClick={() => { setActiveView('saved'); window.scrollTo(0, 0); }} aria-pressed={activeView === 'saved'}>
          <ListChecks size={18} /><span>Day sale</span>
        </button>
      </nav>

      {activeView === 'entry' && billPacks > 0 && (
        <div className="bill-bar">
          <div className="bill-sum">
            <div className="bill-total">
              <small>Total · {billPacks} pack{billPacks === 1 ? '' : 's'}</small>
              <strong>{money(billTotal)}</strong>
            </div>
            {billSaved > 0 ? <em className="bill-saved">Saved {money(billSaved)}</em> : null}
            <button type="button" className="bill-clear" onClick={() => setBill({})} aria-label="Clear bill"><X size={18} /></button>
          </div>
          <div className="bill-items">
            {eventProducts.filter((product) => bill[product.id] > 0).map((product) => (
              <span key={product.id}><b>{bill[product.id]}</b>{tileName(product.name)}</span>
            ))}
          </div>
          {puffsNeeded ? <p className="bill-hint">Add {puffsNeeded} more puff{puffsNeeded === 1 ? '' : 's'} to get {comboOffer.label}</p> : null}
          <p className="bill-ask">Customer paid by</p>
          <div className="bill-pay">
            {[['UPI', Smartphone], ['Cash', Banknote], ['Card', CreditCard]].map(([mode, Icon]) => (
              <button type="button" key={mode} className={`pay-${mode.toLowerCase()}`} onClick={() => payBill(mode)} aria-label={`Paid by ${mode}`}>
                <Icon size={18} />{mode}
              </button>
            ))}
          </div>
        </div>
      )}

      {notice && <div className="save-toast" role="status">{notice}</div>}
    </div>
  );
}
