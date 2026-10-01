import re
import json

with open('c:/svadd/resp_out.html', 'r', encoding='utf-8', errors='ignore') as f:
    text = f.read()

print("Title:", re.findall(r'<title>(.*?)</title>', text, re.I))

# Find any URLs containing download or FileGet or xlsx
urls = set(re.findall(r'https?://[^\s"\'<>]+(?:download|FileGet|\.xlsx)[^\s"\'<>]*', text, re.I))
print("\nMatched URLs:")
for u in urls:
    print(u[:150])

# Search for JSON blobs or AppConfig
scripts = re.findall(r'<script[^>]*>(.*?)</script>', text, re.S)
print(f"\nFound {len(scripts)} script tags")
for i, s in enumerate(scripts):
    if 'FileUrl' in s or 'DownloadUrl' in s or 'wopi' in s or 'itemUrl' in s:
        print(f"Script {i} matches keywords!")
        # print snippet
        for line in s.splitlines():
            if any(k in line for k in ['Download', 'FileUrl', 'ItemUrl', 'wopi', 'Title', 'FileName']):
                print("  ", line.strip()[:140])
