import os
import json
import re
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime
from flask import Flask, request, jsonify, send_file, send_from_directory
from excel_generator import generate_eod_excel

app = Flask(__name__, static_folder='static')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
EXPORTS_DIR = os.path.join(BASE_DIR, 'exports')
STORE_FILE = os.path.join(DATA_DIR, 'store.json')
INITIAL_FILE = os.path.join(DATA_DIR, 'initial_data.json')
TEMPLATE_PATH = os.path.join(BASE_DIR, 'Billing_Format.xlsx')
STALL_STATE_FILE = os.path.join(DATA_DIR, 'stall_state.json')
STATE_LOCK = threading.Lock()

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(EXPORTS_DIR, exist_ok=True)

def load_data():
    if os.path.exists(STORE_FILE):
        try:
            with open(STORE_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            pass
    if os.path.exists(INITIAL_FILE):
        with open(INITIAL_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            save_data(data)
            return data
    # Fallback default
    default_data = {"settings": {"stall_name": "Svvad Pro Stall"}, "salespersons": ["Joe - MARKETING SVVAD PRO"], "categories": ["All"], "products": [], "bills": []}
    return default_data

def save_data(data):
    with open(STORE_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

DIST_DIR = os.path.join(BASE_DIR, 'dist')

@app.route('/')
def index():
    if os.path.exists(os.path.join(DIST_DIR, 'index.html')):
        return send_from_directory(DIST_DIR, 'index.html')
    return send_file(os.path.join(BASE_DIR, 'index.html'))

@app.route('/assets/<path:filename>')
def serve_assets(filename):
    if os.path.exists(os.path.join(DIST_DIR, 'assets', filename)):
        return send_from_directory(os.path.join(DIST_DIR, 'assets'), filename)
    return send_from_directory(os.path.join(BASE_DIR, 'assets'), filename)

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(os.path.join(BASE_DIR, 'static'), filename)

@app.route('/api/data', methods=['GET'])
def get_data():
    return jsonify(load_data())

@app.route('/api/bills', methods=['POST'])
def add_bills():
    data = load_data()
    payload = request.json
    new_bills = payload.get('bills')
    if not new_bills:
        if 'product_name' in payload:
            new_bills = [payload]
        else:
            return jsonify({'error': 'No bills provided'}), 400

    next_id_num = len(data.get('bills', [])) + 1001
    added = []
    for b in new_bills:
        if not b.get('id'):
            b['id'] = f"BILL-{next_id_num}"
            next_id_num += 1
        if not b.get('billing_date'):
            b['billing_date'] = datetime.today().strftime('%d/%m/%Y')
        if not b.get('time'):
            b['time'] = datetime.now().strftime('%I:%M %p')
        data['bills'].append(b)
        added.append(b)

    save_data(data)
    return jsonify({'success': True, 'added': added, 'total_bills': len(data['bills'])})

@app.route('/api/bills/<bill_id>', methods=['PUT'])
def update_bill(bill_id):
    data = load_data()
    updated = False
    for i, b in enumerate(data['bills']):
        if b.get('id') == bill_id:
            data['bills'][i].update(request.json)
            updated = True
            break
    if updated:
        save_data(data)
        return jsonify({'success': True})
    return jsonify({'error': 'Bill not found'}), 404

@app.route('/api/bills/<bill_id>', methods=['DELETE'])
def delete_bill(bill_id):
    data = load_data()
    initial_len = len(data['bills'])
    data['bills'] = [b for b in data['bills'] if b.get('id') != bill_id]
    if len(data['bills']) < initial_len:
        save_data(data)
        return jsonify({'success': True})
    return jsonify({'error': 'Bill not found'}), 404

@app.route('/api/products', methods=['POST'])
def save_products():
    data = load_data()
    products = request.json.get('products')
    if products is not None:
        data['products'] = products
        save_data(data)
        return jsonify({'success': True})
    return jsonify({'error': 'Invalid products payload'}), 400

@app.route('/api/settings', methods=['POST'])
def save_settings():
    data = load_data()
    settings = request.json.get('settings')
    salespersons = request.json.get('salespersons')
    if settings:
        data['settings'] = settings
    if salespersons:
        data['salespersons'] = salespersons
    save_data(data)
    return jsonify({'success': True})

@app.route('/api/reset-day', methods=['POST'])
def reset_day():
    data = load_data()
    today_str = datetime.today().strftime('%Y-%m-%d')
    # Save archive
    archive_file = os.path.join(EXPORTS_DIR, f'archive_{today_str}_{int(datetime.now().timestamp())}.json')
    with open(archive_file, 'w', encoding='utf-8') as f:
        json.dump(data.get('bills', []), f, indent=2)
    # Clear current bills
    data['bills'] = []
    save_data(data)
    return jsonify({'success': True, 'archive_saved': archive_file})

def _blob_token():
    return os.environ.get('BLOB_READ_WRITE_TOKEN', '').strip()


def _blob_store_id(token):
    prefix = 'vercel_blob_rw_'
    if not token.startswith(prefix):
        return ''
    store_id, separator, _secret = token[len(prefix):].rpartition('_')
    return store_id if separator else ''


def _read_blob_state(token):
    store_id = _blob_store_id(token)
    if not store_id:
        raise RuntimeError('Shared storage token is invalid')
    url = f'https://{store_id}.private.blob.vercel-storage.com/stall-state.json?cache=0'
    req = urllib.request.Request(url, headers={'authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req, timeout=12) as response:
            data = json.loads(response.read().decode('utf-8'))
        return data if isinstance(data, dict) else {}
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            return {}
        raise


def _write_blob_state(token, payload):
    raw = json.dumps(payload).encode('utf-8')
    url = 'https://vercel.com/api/blob/?pathname=stall-state.json'
    req = urllib.request.Request(url, data=raw, method='PUT', headers={
        'authorization': f'Bearer {token}',
        'x-api-version': '12',
        'x-vercel-blob-access': 'private',
        'x-add-random-suffix': '0',
        'x-allow-overwrite': '1',
        'x-content-type': 'application/json',
        'x-content-length': str(len(raw)),
    })
    with urllib.request.urlopen(req, timeout=15) as response:
        response.read()


def _read_file_state():
    if not os.path.exists(STALL_STATE_FILE):
        return {}
    try:
        with open(STALL_STATE_FILE, 'r', encoding='utf-8') as handle:
            data = json.load(handle)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _write_file_state(payload):
    with open(STALL_STATE_FILE, 'w', encoding='utf-8') as handle:
        json.dump(payload, handle, indent=2, ensure_ascii=False)


def _read_stall_state():
    token = _blob_token()
    if token:
        return _read_blob_state(token)
    return _read_file_state()


def _write_stall_state(payload):
    token = _blob_token()
    if token:
        _write_blob_state(token, payload)
        return
    _write_file_state(payload)


@app.route('/api/stall-state', methods=['GET', 'POST'])
def stall_state():
    if request.method == 'GET':
        try:
            return jsonify(_read_stall_state())
        except Exception:
            return jsonify({'error': 'Could not read the shared stall. Try again.'}), 500

    body = request.get_json(silent=True)
    if not isinstance(body, dict):
        return jsonify({'error': 'Invalid stall state'}), 400
    try:
        base_revision = int(body.get('revision') or 0)
    except (TypeError, ValueError):
        base_revision = 0
    kept = {
        'revision': int(time.time() * 1000),
        'stockByEvent': body.get('stockByEvent') if isinstance(body.get('stockByEvent'), dict) else {},
        'entriesByEvent': body.get('entriesByEvent') if isinstance(body.get('entriesByEvent'), dict) else {},
        'peopleByEvent': body.get('peopleByEvent') if isinstance(body.get('peopleByEvent'), dict) else {},
    }
    try:
        with STATE_LOCK:
            curren