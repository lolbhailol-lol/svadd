import React, { useState } from 'react';
import { defaultProducts } from '../data/products';
import { Search } from 'lucide-react';

export default function ProductSelector({ selectedProduct, onSelectProduct }) {
  const [filter, setFilter] = useState('');

  const filtered = defaultProducts.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    (p.badge && p.badge.toLowerCase().includes(filter.toLowerCase())) ||
    (p.tag && p.tag.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="product-shelf-wrapper">
      <div style={{ position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          className="terminal-input"
          style={{ paddingLeft: '30px', paddingRight: '10px', paddingTop: '6px', paddingBottom: '6px', fontSize: '12px' }}
          placeholder="Filter catalog (e.g. Makhana, Khakhra, Protein)..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="product-chips-grid">
        {filtered.map((p) => {
          const isSelected = selectedProduct === p.name;
          return (
            <div
              key={p.id}
              className={`product-select-card ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectProduct(p.name)}
            >
              <div className="p-card-name">
                {p.icon || '✨'} {p.name.split('(')[0]}
              </div>
              <div className="p-card-meta">
                <span className="p-card-price">₹{p.rate}</span>
                <span className="p-card-badge">{p.badge || p.tag || 'Protein'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
