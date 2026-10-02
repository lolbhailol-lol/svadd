import os
import re
import zipfile
from copy import copy
from datetime import datetime

import openpyxl
from openpyxl.utils import column_index_from_string, get_column_letter

# Official template layout. Row 156 totals rows 3-152. Row 153 has formulas but is outside that total.
DATA_START = 3
TEMPLATE_SUM_END = 152
SHEET_NAME = 'Biling Sheet'


def generate_eod_excel(entries, output_path, template_path=None):
    """Fill Billing_Format.xlsx without changing its sheet, columns, or formulas."""
    if template_path is None:
        template_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Billing_Format.xlsx')
    if not os.path.exists(template_path):
        raise FileNotFoundError(f'Billing template not found: {template_path}')

    wb = openpyxl.load_workbook(template_path)
    if SHEET_NAME not in wb.sheetnames:
        raise KeyError(f'Worksheet {SHEET_NAME!r} is missing from the billing template')
    ws = wb[SHEET_NAME]

    total_row = _find_total_row(ws)
    extra = max(0, len(entries) - (TEMPLATE_SUM_END - DATA_START + 1))
    if extra:
        ws.insert_rows(TEMPLATE_SUM_END + 1, extra)
        total_row += extra
        for offset in range(extra):
            _clone_formula_row(ws, DATA_START, TEMPLATE_SUM_END + 1 + offset)
        _rewrite_shifted_formulas(ws, total_row)
        _extend_totals(ws, total_row, TEMPLATE_SUM_END + extra)
        ws.auto_filter.ref = f'A2:J{TEMPLATE_SUM_END + extra}'

    grid_end = TEMPLATE_SUM_END + extra
    _clear_input_cells(ws, DATA_START, grid_end + 1)

    for index, entry in enumerate(entries, 1):
        row = DATA_START + index - 1
        qty = _as_int(entry.get('qty', entry.get('quantity', 1)), 1)
        rate = _as_float(entry.get('rate', 0))
        discount = _as_fraction(entry.get('discount', entry.get('dis', 0)))
        ws.cell(row, 1).value = index
        billed_on = ws.cell(row, 2)
        billed_on.value = _parse_billing_date(entry.get('billing_date', entry.get('date')))
        billed_on.number_format = 'mm-dd-yy'
        ws.cell(row, 3).value = str(entry.get('product_name', entry.get('productName', '')) or '')
        ws.cell(row, 4).value = qty
        ws.cell(row, 5).value = rate
        discount_cell = ws.cell(row, 6)
        discount_cell.value = discount
        discount_cell.number_format = '0%'
        ws.cell(row, 9).value = str(entry.get('salesperson', entry.get('sale_person', '')) or '')
        ws.cell(row, 10).value = str(entry.get('payment_mode', entry.get('paymentMode', '')) or '')

    ws.freeze_panes = 'A3'
    ws.sheet_view.selection[-1].activeCell = 'A3'
    ws.sheet_view.selection[-1].sqref = 'A3'
    wb.active = wb.sheetnames.index(SHEET_NAME)

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    cached = _formula_results(ws)
    sheet_index = wb.sheetnames.index(SHEET_NAME) + 1
    wb.save(output_path)
    _write_cached_results(output_path, f'xl/worksheets/sheet{sheet_index}.xml', cached)
    return output_path


_REF = re.compile(r'\$?([A-Z]{1,3})\$?(\d+)')
_SUM = re.compile(r'SUM\(\$?([A-Z]{1,3})\$?(\d+):\$?([A-Z]{1,3})\$?(\d+)\)')


def _formula_results(ws):
    """Phone viewers show formula cells blank unless the file also stores their results."""
    results = {}

    def value(column, row):
        coordinate = f'{column}{row}'
        if coordinate in results:
            return results[coordinate]
        raw = ws[coordinate].value
        if isinstance(raw, str) and raw.startswith('='):
            results[coordinate] = evaluate(raw[1:])
            return results[coordinate]
        return float(raw) if isinstance(raw, (int, float)) and not isinstance(raw, bool) else 0.0

    def total(match):
        first, start, last, end = match.group(1), int(match.group(2)), match.group(3), int(match.group(4))
        columns = range(column_index_from_string(first), column_index_from_string(last) + 1)
        return repr(sum(value(get_column_letter(c), r) for c in columns for r in range(start, end + 1)))

    def evaluate(expression):
        expression = _SUM.sub(total, expression)
        expression = _REF.sub(lambda m: repr(value(m.group(1), int(m.group(2)))), expression)
        if not re.fullmatch(r'[\d\s.+\-*/()e]*', expression):
            return None
        return eval(expression, {'__builtins__': {}}, {})

    for row in ws.iter_rows():
        for cell in row:
            if isinstance(cell.value, str) and cell.value.startswith('='):
                value(cell.column_letter, cell.row)
    return {coordinate: result for coordinate, result in results.items() if result is not None}


def _write_cached_results(path, sheet_part, results):
    with zipfile.ZipFile(path) as source:
        parts = {name: source.read(name) for name in source.namelist()}
        infos = source.infolist()
    xml = parts[sheet_part].decode('utf-8')

    def fill(match):
        coordinate = match.group(1)
        if coordinate not in results:
            return match.group(0)
        number = round(results[coordinate], 10)
        text = str(int(number)) if number == int(number) else repr(number)
        return f'<c r="{coordinate}"{match.group(2)}>{match.group(3)}<v>{text}</v></c>'

    xml = re.sub(r'<c r="([A-Z]+\d+)"([^>]*)>(<f>.*?</f>)(?:<v>[^<]*</v>|<v\s*/>)?</c>', fill, xml)
    parts[sheet_part] = xml.encode('utf-8')
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as target:
        for info in infos:
            target.writestr(info, parts[info.filename])


def _find_total_row(ws):
    for row in range(DATA_START, ws.max_row + 1):
        value = ws.cell(row, 4).value
        if isinstance(value, str) and value.startswith('=SUM('):
            return row
    raise ValueError('Total row was not found in the billing template')


def _clear_input_cells(ws, start_row, end_row):
    for row in range(start_row, end_row + 1):
        for column in (1, 2, 3, 9, 10):
            ws.cell(row, column).value = None
        ws.cell(row, 4).value = 0
        ws.cell(row, 5).value = 0
        ws.cell(row, 6).value = 0


def _clone_formula_row(ws, src_row, dest_row):
    for column in range(1, 11):
        source = ws.cell(src_row, column)
        target = ws.cell(dest_row, column)
        if source.has_style:
            target.font = copy(source.font)
            target.border = copy(source.border)
            target.fill = copy(source.fill)
            target.number_format = source.number_format
            target.protection = copy(source.protection)
            target.alignment = copy(source.alignment)
    ws.cell(dest_row, 7).value = f'=E{dest_row}*D{dest_row}*F{dest_row}'
    ws.cell(dest_row, 8).value = f'=(E{dest_row}*D{dest_row})-G{dest_row}'
    ws.cell(dest_row, 7).number_format = '0.00'
    ws.cell(dest_row, 8).number_format = '0.00;[Red]0.00'


def _rewrite_shifted_formulas(ws, total_row):
    for row in range(DATA_START, total_row):
        discount_amount = ws.cell(row, 7).value
        if isinstance(discount_amount, str) and discount_amount.startswith('='):
            ws.cell(row, 7).value = f'=E{row}*D{row}*F{row}'
            ws.cell(row, 8).value = f'=(E{row}*D{row})-G{row}'


def _extend_totals(ws, total_row, last_data_row):
    for column in range(4, 9):
        cell = ws.cell(total_row, column)
        if isinstance(cell.value, str) and cell.value.startswith('=SUM('):
            letter = get_column_letter(column)
            cell.value = f'=SUM({letter}3:{letter}{last_data_row})'


def _parse_billing_date(value):
    if isinstance(value, datetime):
        return value.date()
    text = str(value or '').strip()
    if not text:
        return datetime.today().date()
    try:
        return datetime.strptime(text[:10], '%Y-%m-%d').date()
    except ValueError:
        pass
    parts = text.replace('.', '/').replace('-', '/').split('/')
    if len(parts) == 3 and all(part.isdigit() for part in parts):
        first, second, third = (int(part) for part in parts)
        if first > 31:
            return datetime(first, second, third).date()
        if third < 100:
            third += 2000
        return datetime(third, second, first).date()
    return datetime.today().date()


def _as_fraction(value):
    try:
        number = float(value or 0)
    except (TypeError, ValueError):
        return 0.0
    if number > 1:
        number = number / 100.0
    if number < 0:
        return 0.0
    if number > 1:
        return 1.0
    return number


def _as_float(value):
    try:
        return float(value or 0)
    except (TypeError, ValueError):
        return 0.0


def _as_int(value, fallback):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return fallback
