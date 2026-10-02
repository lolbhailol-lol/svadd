export const eventNames = [
  'SVVAD PRO PUNE COEP',
  'SVVAD PRO PUNE UTSAV',
  'SVVAD PRO Mumbai Event'
];

const catalog = {
  'atta-multigrain': { name: 'High Protein Multigrain Atta 1kg', category: 'Atta' },
  'atta-protein': { name: 'High Protein Atta 1kg', category: 'Atta' },
  'cookie-butter-sorghum': { name: 'Protein Cookies - Butter Sorghum 150g', category: 'Cookies', perBox: 48 },
  'cookie-honey-oats': { name: 'Protein Cookies - Honey & Oats 150g', category: 'Cookies', perBox: 48 },
  'cookie-chocos': { name: 'Protein Cookies - Chocos 150g', category: 'Cookies', perBox: 48 },
  'cookie-chocos-85': { name: 'Protein Cookies - Chocos 85g', category: 'Cookies', perBox: 96 },
  'cookie-butter-sorghum-85': { name: 'Protein Cookies - Butter Sorghum 85g', category: 'Cookies', perBox: 96 },
  'rusk-wheat': { name: 'High Protein Whole Wheat Rusk 150g', category: 'Rusk', perBox: 40 },
  'puffs-bbq': { name: 'Protein Puffs - Barbeque Smoke 40g', category: 'Puffs', perBox: 70 },
  'puffs-cream-onion': { name: 'Protein Puffs - Cream & Onion 40g', category: 'Puffs', perBox: 70 },
  'puffs-tangy-tomato': { name: 'Protein Puffs - Tangy Tomato 40g', category: 'Puffs', perBox: 70 },
  'nachos-tangy-tomato': { name: 'Protein Nachos - Tangy Tomato 28g', category: 'Nachos', perBox: 70 },
  'nachos-bbq': { name: 'Protein Nachos - Barbeque Smoke 28g', category: 'Nachos', perBox: 70 },
  'honey-loops': { name: 'High Protein Honey Loops 350g', category: 'Honey Loops', perBox: 32 },
  chocos: { name: 'High Protein Chocos 350g', category: 'Chocos', perBox: 32 },
  'muesli-fruit-nuts': { name: 'High Protein Fruits & Nuts Muesli 220g', category: 'Muesli', perBox: 32 },
  'muesli-choco': { name: 'High Protein Choco Muesli 220g', category: 'Muesli', perBox: 32 },
  'pancake-vanilla': { name: 'High Protein Vanilla Pancake Premix 250g', category: 'Pancake', perBox: 45 },
  'pancake-choco': { name: 'High Protein Choco Pancake Premix 250g', category: 'Pancake', perBox: 45 }
};

const PUFFS_OFFER = { kind: 'combo', group: 'puffs', qty: 3, price: 100, label: '3 for ₹100' };
const BOGO = { kind: 'bogo', label: 'Buy 1 Get 1' };
const price = (amount, label) => ({ kind: 'price', price: amount, label });

const puffs = [
  ['puffs-bbq', 40, PUFFS_OFFER],
  ['puffs-cream-onion', 40, PUFFS_OFFER],
  ['puffs-tangy-tomato', 40, PUFFS_OFFER]
];

const eventLists = {
  'SVVAD PRO PUNE COEP': [
    ['cookie-butter-sorghum', 140, price(130, '10% off')],
    ['cookie-honey-oats', 140, price(130, '10% off')],
    ['cookie-chocos', 150, price(135, '10% off')],
    ['cookie-chocos-85', 85, null],
    ['cookie-butter-sorghum-85', 85, null],
    ['rusk-wheat', 130, BOGO],
    ...puffs,
    ['nachos-tangy-tomato', 20, null],
    ['nachos-bbq', 20, null],
    ['honey-loops', 260, price(210, '20% off')],
    ['chocos', 260, price(210, '20% off')],
    ['muesli-fruit-nuts', 230, price(185, '20% off')],
    ['muesli-choco', 250, price(200, '20% off')],
    ['pancake-vanilla', 200, price(160, '20% off')],
    ['pancake-choco', 200, price(160, '20% off')]
  ],
  'SVVAD PRO PUNE UTSAV': [
    ['atta-multigrain', 210, price(170, '20% off')],
    ['atta-protein', 190, price(155, '20% off')],
    ['cookie-butter-sorghum', 140, price(130, '10% off')],
    ['cookie-honey-oats', 140, price(130, '10% off')],
    ['cookie-chocos', 150, price(135, '10% off')],
    ['rusk-wheat', 130, BOGO],
    ...puffs,
    ['nachos-tangy-tomato', 20, null],
    ['nachos-bbq', 20, null],
    ['honey-loops', 260, price(235, '10% off')],
    ['chocos', 260, price(235, '10% off')],
    ['muesli-fruit-nuts', 230, price(210, '10% off')],
    ['muesli-choco', 250, price(225, '10% off')],
    ['pancake-vanilla', 200, price(160, '20% off')],
    ['pancake-choco', 200, price(160, '20% off')]
  ],
  'SVVAD PRO Mumbai Event': [
    ['atta-multigrain', 210, price(190, '10% off')],
    ['atta-protein', 190, price(170, '10% off')],
    ['cookie-butter-sorghum', 140, price(130, '10% off')],
    ['cookie-honey-oats', 140, price(130, '10% off')],
    ['cookie-chocos', 150, price(135, '10% off')],
    ['rusk-wheat', 130, BOGO],
    ...puffs,
    ['honey-loops', 260, price(235, '10% off')],
    ['chocos', 260, price(235, '10% off')],
    ['muesli-fruit-nuts', 230, price(210, '10% off')],
    ['muesli-choco', 250, price(225, '10% off')],
    ['pancake-vanilla', 200, price(180, '10% off')],
    ['pancake-choco', 200, price(180, '10% off')]
  ]
};

export function productsForEvent(eventName) {
  const list = eventLists[eventName] || eventLists[eventNames[0]];
  return list.map(([id, rate, offer]) => ({ id, ...catalog[id], rate, offer }));
}

export function offerDiscountPercent(product, quantity) {
  const offer = product?.offer;
  if (!offer || !product.rate) return 0;
  if (offer.kind === 'price') return ((product.rate - offer.price) / product.rate) * 100;
  if (offer.kind === 'bogo') {
    const qty = Math.max(1, quantity);
    return (Math.floor(qty / 2) / qty) * 100;
  }
  if (offer.kind === 'combo') return (1 - offer.price / (offer.qty * product.rate)) * 100;
  return 0;
}
