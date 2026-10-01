import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Minus, Plus, Search, Trash2, Package, CirclePlus, ListChecks } from 'lucide-react';
import { defaultProducts, eventNames } from './data/products';

const STORAGE_KEY = 'svvad_pro_event_stock_v1';
const ENTRIES_KEY = 'svvad_pro_event_entries_v1';
const PERSON_KEY = 'svvad_pro_sale_person_v1';

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
  const [notice, setNotice] = useState('');
  const savedTimer = useRef(null);
  const saveLock = useRef(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [entryType, setEntryType] = useState('without');
  const [discount, setDiscount] = useState(10);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [entryFilter, setEntryFilter] = useState('all');
  const [activeView, setActiveView] = useState('stock');
  const [peopleByEvent, setPeopleByEvent] = useState(loadPeople);
  const [exporting, setExporting] = useState(false);
  const [booted, setBooted] = useState(false);
  const revisionRef = useRef(0);
  const skipSaveRef = useRef(false);
  const savePendingRef = useRef(false);

  const eventStock = stockByEvent[eventName] || {};
  const entries = entriesByEvent[eventName] || [];
  const salePerson = peopleByEvent[eventName] || '';

  const applySharedState = (data) => {
    const stock = data.stockByEvent && typeof data.stockByEvent === 'object' ? data.stockByEvent : {};
    const sharedEntries = data.entriesByEvent && typeof data.entriesByEvent === 'object' ? data.entriesByEvent : {};
    const people = data.peopleByEvent && typeof data.peopleByEvent === 'object' ? data.peopleByEvent : {};
    skipSaveRef.current = true;
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
        if (response.ok) {
          const data = await response.json();
          if (!cancelled && Number(data.revision) > 0) applySharedState(data);
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
      if (savePendingRef.current) return;
      try {
        const response = await fetch('/api/stall-state');
        if (!response.ok) return;
        const data = await response.json();
        if (Number(data.revision) > revisionRef.current) applySharedState(data);
      } catch {
        // Keep the current screen until the next sync.
      }
    };
    const timer = window.setInterval(pull, 3000);
    return () => window.clearInterval(timer);
  }, [booted]);

  useEffect(() => {
    if (!booted) return undefined;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      savePendingRef.current = false;
      return undefined;
    }
    savePendingRef.current = true;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/stall-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ revision: revisionRef.current, stockByEvent, entriesByEvent, peopleByEvent })
        });
        const data = await response.json().catch(() => ({}));
        if (response.status === 409 && data.revision) {
          applySharedState(data);
          setNotice('Another laptop saved first. This screen was updated.');
          window.clearTimeout(savedTimer.current);
          savedTimer.current = window.setTimeout(() => setNotice(''), 3200);
        } else if (response.ok) {
          revisionRef.current = Number(data.revision) || revisionRef.current;
        } else {
          setNotice('Not synced. Check the internet.');
        }
      } catch {
        setNotice('Not synced. Check the internet.');
      } finally {
        savePendingRef.current = false;
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [booted, stockByEvent, entriesByEvent, peopleByEvent]);

  const updateSalePerson = (value) => {
    const updated = { ...peopleByEvent, [eventName]: value };
    setPeopleByEvent(updated);
    localStorage.setItem(PERSON_KEY, JSON.stringify(updated));
  };
  const products = useMemo(() => {
    const query = search.trim().toLowerCase();
    return query
      ? defaultProducts.filter((product) => product.name.toLowerCase().includes(query))
      : defaultProducts;
  }, [search]);

  const totalStock = defaultProducts.reduce(
    (total, product) => total + Number(eventStock[product.id] || 0),
    0
  );
  const productsInStock = defaultProducts.filter((product) => Number(eventStock[product.id] || 0) > 0).length;
  const unitsEntered = entries.reduce((total, entry) => total + Number(entry.quantity || 0), 0);

  const updateStock = (productId, value) => {
    const quantity = Math.max(0, Math.floor(Number(value) || 0));
    const updated = {
      ...stockByEvent,
      [eventName]: { ...eventStock, [productId]: quantity }
    };
    setStockByEvent(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const chosenProduct = defaultProducts.find((product) => product.name === selectedProduct);
  const safeQuantity = Math.max(1, Math.floor(Number(quantity) || 1));
  const activeDiscount = entryType === 'with' ? Math.min(99, Math.max(1, Number(discount) || 1)) : 0;
  const selectedStock = chosenProduct ? Number(eventStock[chosenProduct.id] || 0) : 0;
  const hasEnoughStock = Boolean(chosenProduct) && selectedStock >= safeQuantity;
  const entryTotal = chosenProduct
    ? entryType === 'sample'
      ? 0
      : chosenProduct.rate * safeQuantity * (1 - activeDiscount / 100)
    : 0;

  const saveEntry = (event) => {
    event.preventDefault();
    if (!chosenProduct || saveLock.current) return;
    if (!hasEnoughStock) {
      setNotice(`Only ${selectedStock} packet${selectedStock === 1 ? '' : 's'} available. Add stock first.`);
      window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setNotice(''), 3000);
      return;
    }
    saveLock.current = true;
    const now = new Date();
    const isoDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const newEntry = {
      id: `${now.getTime()}`,
      date: now.toLocaleDateString('en-GB'),
      isoDate,
      productId: chosenProduct.id,
      productName: chosenProduct.name,
      quantity: safeQuantity,
      rate: entryType === 'sample' ? 0 : chosenProduct.rate,
      discount: activeDiscount,
      type: entryType,
      paymentMode: entryType === 'sample' ? 'SAMPLING' : paymentMode,
      salesperson: salePerson.trim(),
      stockDeducted: true
    };
    const updatedEntries = { ...entriesByEvent, [eventName]: [newEntry, ...entries] };
    const updatedStock = {
      ...stockByEvent,
      [eventName]: { ...eventStock, [chosenProduct.id]: selectedStock - safeQuantity }
    };
    setEntriesByEvent(updatedEntries);
    setStockByEvent(updatedStock);
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(updatedEntries));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStock));
    setSelectedProduct('');
    setQuantity(1);
    setNotice('Entry saved and stock reduced');
    window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setNotice(''), 1800);
    window.setTimeout(() => { saveLock.current = false; }, 300);
  };

  const deleteEntry = (id) => {
    const entry = entries.find((item) => item.id === id);
    const deleteMessage = entry?.stockDeducted
      ? 'Delete this entry? Its packets will be returned to stock.'
      : 'Delete this older entry?';
    if (!entry || !window.confirm(deleteMessage)) return;
    const updatedEntries = { ...entriesByEvent, [eventName]: entries.filter((item) => item.id !== id) };
    setEntriesByEvent(updatedEntries);
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(updatedEntries));
    if (entry.stockDeducted) {
      const current = Number(eventStock[entry.productId] || 0);
      const updatedStock = {
        ...stockByEvent,
        [eventName]: { ...eventStock, [entry.productId]: current + Number(entry.quantity || 0) }
      };
      setStockByEvent(updatedStock);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStock));
    }
    setNotice(entry.stockDeducted ? 'Entry deleted and stock restored' : 'Entry deleted');
    window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setNotice(''), 1800);
  };

  const filteredEntries = entryFilter === 'all'
    ? entries
    : entries.filter((entry) => entry.type === entryFilter);
  const entryCounts = {
    all: entries.length,
    without: entries.filter((entry) => entry.type === 'without').length,
    with: entries.filter((entry) => entry.type === 'with').length,
    sample: entries.filter((entry) => entry.type === 'sample').length
  };
  const money = (value) => {
    const amount = Math.round((Number(value) || 0) * 100) / 100;
    return amount % 1 === 0 ? `₹${amount}` : `₹${amount.toFixed(2)}`;
  };

  const exportExcel = async () => {
    if (exporting) return;
    const person = salePerson.trim();
    const missingName = entries.some((entry) => !(entry.salesperson || person));
    if (missingName) {
      setNotice('Enter Sale Person Name first. That name is printed in the Excel sheet.');
      window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setNotice(''), 3200);
      return;
    }
    const ordered = [...entries].reverse();
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
      URL.revokeObjectURL(url);
      setNotice('Billing Excel downloaded. Open the sheet named Biling Sheet.');
    } catch {
      setNotice('Excel download failed. Start the stall app with start_dashboard.bat and try again.');
    } finally {
      setExporting(false);
      window.clearTimeout(savedTimer.current);
      savedTimer.current = window.setTimeout(() => setNotice(''), 3600);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span>SVVAD PRO</span>
          <h1>Stall counter</h1>
        </div>
        <button className="excel-button" onClick={exportExcel} disabled={exporting}>
          <Download size={18} />
          {exporting ? 'Preparing…' : 'Download Excel'}
        </button>
      </header>

      <main className="page">
        <section className="context-bar">
          <label className="field">
            <span>Event</span>
            <select value={eventName} onChange={(event) => {
              const nextEvent = event.target.value;
              setEventName(nextEvent);
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

        {activeView === 'stock' && (
          <section className="panel panel-stock">
            <div className="metrics">
              <div className="metric metric-green"><strong>{totalStock}</strong><span>Packets in stock</span></div>
              <div className="metric metric-blue"><strong>{productsInStock}</strong><span>Products available</span></div>
              <div className="metric metric-amber"><strong>{unitsEntered}</strong><span>Packets recorded</span></div>
            </div>
            <div className="panel-head">
              <div>
                <h2>Stock</h2>
                <p>Use − and + to set packets on the table.</p>
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
                return (
                  <article className="product-row" key={product.id}>
                    <div className="product-info">
                      <h3>{product.name}</h3>
                      <p>
                        <span className="product-price">{money(product.rate)}</span>
                        {product.note ? <span className="product-note">{product.note}</span> : null}
                        <span className={`stock-label ${stockQty === 0 ? 'out' : stockQty <= 5 ? 'low' : ''}`}>
                          {stockQty === 0 ? 'None yet' : `${stockQty} in stock`}
                        </span>
                      </p>
                    </div>
                    <div className="quantity-control" aria-label={`${product.name} quantity`}>
                      <button aria-label={`Remove one ${product.name}`} onClick={() => updateStock(product.id, stockQty - 1)} disabled={stockQty === 0}>
                        <Minus size={20} />
                      </button>
                      <input
                        inputMode="numeric"
                        aria-label={`Current quantity for ${product.name}`}
                        value={stockQty}
                        onChange={(event) => updateStock(product.id, event.target.value)}
                      />
                      <button className="add-button" aria-label={`Add one ${product.name}`} onClick={() => updateStock(product.id, stockQty + 1)}>
                        <Plus size={20} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {activeView === 'entry' && (
          <section className="panel panel-entry">
            <form className="entry-form" onSubmit={saveEntry}>
              <div className="panel-head plain-head">
                <div>
                  <h2>New entry</h2>
                  <p>Choose what went out, then save.</p>
                </div>
              </div>

              <label className="field">
                <span>Product</span>
                <input
                  className="desktop-product-input"
                  list="product-options"
                  value={selectedProduct}
                  onChange={(event) => setSelectedProduct(event.target.value)}
                  placeholder="Type or select a product"
                />
                <datalist id="product-options">
                  {defaultProducts.map((product) => <option key={product.id} value={product.name} />)}
                </datalist>
                <select className="mobile-product-select" value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)}>
                  <option value="">Choose a product</option>
                  {defaultProducts.map((product) => <option key={product.id} value={product.name}>{product.name}</option>)}
                </select>
                {chosenProduct && (
                  <small className={hasEnoughStock ? 'hint' : 'hint warn'}>
                    {selectedStock} in stock
                  </small>
                )}
              </label>

              <div className="entry-types" role="group" aria-label="Entry type">
                <button type="button" aria-pressed={entryType === 'without'} className={`type-normal ${entryType === 'without' ? 'active' : ''}`} onClick={() => setEntryType('without')}>Normal sale</button>
                <button type="button" aria-pressed={entryType === 'with'} className={`type-offer ${entryType === 'with' ? 'active' : ''}`} onClick={() => setEntryType('with')}>Offer</button>
                <button type="button" aria-pressed={entryType === 'sample'} className={`type-sample ${entryType === 'sample' ? 'active' : ''}`} onClick={() => setEntryType('sample')}>Free sample</button>
              </div>

              <div className="entry-fields">
                <label className="field">
                  <span>Quantity</span>
                  <input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} />
                </label>
                {entryType === 'with' && (
                  <label className="field">
                    <span>Offer %</span>
                    <input type="number" min="1" max="99" value={discount} onChange={(event) => setDiscount(Math.min(99, Math.max(1, Number(event.target.value) || 1)))} />
                  </label>
                )}
                {entryType !== 'sample' && (
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
                  {!chosenProduct ? 'Choose a product' : !hasEnoughStock ? 'Add stock first' : 'Save entry'}
                </button>
              </div>
            </form>
          </section>
        )}

        {activeView === 'saved' && (
          <section className="saved-screen">
            <div className="panel-head">
              <div>
                <h2>Saved</h2>
                <p>{filteredEntries.length} showing</p>
              </div>
            </div>
            <div className="filter-buttons">
              {[
                ['all', 'All'],
                ['without', 'No offer'],
                ['with', 'Offer'],
                ['sample', 'Sample']
              ].map(([value, label]) => (
                <button key={value} className={`filter-${value} ${entryFilter === value ? 'active' : ''}`} onClick={() => setEntryFilter(value)}>
                  {label}<em>{entryCounts[value]}</em>
                </button>
              ))}
            </div>
            {filteredEntries.length === 0 ? (
              <div className="empty-box">No lines in this view.</div>
            ) : (
              <div className="ledger">
                {filteredEntries.map((entry) => {
                  const total = entry.rate * entry.quantity * (1 - entry.discount / 100);
                  const typeLabel = entry.type === 'with' ? `${entry.discount}% offer` : entry.type === 'sample' ? 'Sample' : 'No offer';
                  return (
                    <article className={`ledger-row row-${entry.type}`} key={entry.id}>
                      <span className="ledger-mark" />
                      <div className="ledger-main">
                        <strong title={entry.productName}>{entry.productName}</strong>
                        <span>{entry.quantity} qty · {typeLabel} · {entry.paymentMode} · {entry.date}</span>
                      </div>
                      <b>{money(total)}</b>
                      <button className="remove-button" onClick={() => deleteEntry(entry.id)} aria-label={`Delete ${entry.productName}`}>
                        <Trash2 size={16} />
                      </button>
                    </article>
                  );
                })}
                <div className="ledger-total">
                  <span>{filteredEntries.reduce((sum, entry) => sum + Number(entry.quantity || 0), 0)} packets</span>
                  <b>{money(filteredEntries.reduce((sum, entry) => sum + entry.rate * entry.quantity * (1 - entry.discount / 100), 0))}</b>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      <nav className="bottom-nav" aria-label="Stall sections">
        <button className={`nav-stock ${activeView === 'stock' ? 'active' : ''}`} onClick={() => { setActiveView('stock'); window.scrollTo(0, 0); }} aria-pressed={activeView === 'stock'}>
          <Package size={22} /><span>Stock</span>
        </button>
        <button className={`nav-entry ${activeView === 'entry' ? 'active' : ''}`} onClick={() => { setActiveView('entry'); window.scrollTo(0, 0); }} aria-pressed={activeView === 'entry'}>
          <CirclePlus size={22} /><span>New entry</span>
        </button>
        <button className={`nav-saved ${activeView === 'saved' ? 'active' : ''}`} onClick={() => { setActiveView('saved'); window.scrollTo(0, 0); }} aria-pressed={activeView === 'saved'}>
          <ListChecks size={22} /><span>Saved{entries.length > 0 ? ` ${entries.length}` : ''}</span>
        </button>
      </nav>

      {notice && <div className="save-toast" role="status">{notice}</div>}
    </div>
  );
}
