import openpyxl

wb = openpyxl.load_workbook('c:/svadd/Billing_Format.xlsx', data_only=False)
print("Sheet names:", wb.sheetnames)

for sheetname in wb.sheetnames:
    print(f"\n================ SHEET: {sheetname} ================")
    ws = wb[sheetname]
    print(f"Dimensions: max_row={ws.max_row}, max_column={ws.max_column}")
    
    # Print non-empty rows up to max 100 rows
    for r in range(1, min(ws.max_row + 1, 100)):
        row_vals = [ws.cell(r, c).value for c in range(1, min(ws.max_column + 1, 30))]
        if any(v is not None for v in row_vals):
            print(f"Row {r:3d}: {row_vals}")

wb_data = openpyxl.load_workbook('c:/svadd/Billing_Format.xlsx', data_only=True)
for sheetname in wb_data.sheetnames:
    print(f"\n================ EVALUATED SHEET: {sheetname} ================")
    ws = wb_data[sheetname]
    for r in range(1, min(ws.max_row + 1, 30)):
        row_vals = [ws.cell(r, c).value for c in range(1, min(ws.max_column + 1, 30))]
        if any(v is not None for v in row_vals):
            print(f"Row {r:3d}: {row_vals}")
