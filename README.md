# Svvad Pro — Stall Billing, Sampling & EOD Automation Suite

An automated POS terminal, promotional sampling tracker, and End-of-Day (EOD) Excel generation system built specifically for **Svvad Pro** (SVVAD PRO FOODS PVT LTD) exhibition, event, and retail stalls.

---

## What the stall laptop does

1. **Stock** — set how many packets are on the table. Plus and minus save immediately.
2. **Record Out** — normal sale, offer sale, or free sample. Samples are ₹0 and marked `SAMPLING`.
3. **Saved** — check or delete a line. Deleting a line puts the packets back in stock.
4. **Download Billing Excel** — fills the official billing sheet. Cash sales and samples stay in that same file.

### 3. Official billing Excel
**Download Billing Excel** fills `Billing_Format.xlsx` itself:
- Sheet name stays `Biling Sheet`
- Same title, 10 columns, percentage discount, formula rows, and total row
- Sampling is payment mode `SAMPLING` with rate 0, so the cash total stays correct

The laptop does not need internet. Double-click `start_dashboard.bat` and use http://localhost:5000.

---

## How to run on a stall

Double-click `start_dashboard.bat`. It opens **http://localhost:5000**.

1. Choose the event and type the **Sale Person Name**.
2. On **Stock**, set how many packets arrived.
3. On **Record Out**, save each normal sale, offer sale, or free sample.
4. Click **Download Billing Excel**.

The download is the official `Billing_Format.xlsx` file filled in: same sheet name `Biling Sheet`, same 10 columns, same formulas (`Dis. Amt = Rate × Qty × Dis.` and `Total Amt = (Rate × Qty) − Dis. Amt`), and the same total row. Discount is stored as an Excel percentage. Sampling rows use rate 0 and payment mode `SAMPLING`.

Stock and entries are kept in this browser and backed up in `data/stall_state.json`. Use the same laptop and browser for the whole event.

---

## Keyboard
- Use the bottom buttons: **Stock**, **Record Out**, **Saved**
