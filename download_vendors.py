import urllib.request
import os

urls = {
    'xlsx.full.min.js': 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    'chart.umd.min.js': 'https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js',
    'qrcode.min.js': 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js'
}

dest_dir = 'c:/svadd/static/js'

for filename, url in urls.items():
    dest_path = os.path.join(dest_dir, filename)
    print(f"Downloading {filename}...")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read()
            with open(dest_path, 'wb') as f:
                f.write(content)
            print(f"Saved {filename} ({len(content)} bytes)")
    except Exception as e:
        print(f"Failed downloading {filename}: {e}")
