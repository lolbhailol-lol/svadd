import urllib.request
import urllib.parse
import re
import json

url = 'https://1drv.ms/x/c/838AB1375C0F4F22/IQB2fBIn83S9QoxP5yo6z9nYAfgpdLlQRHTEE3ErDrUO3Ng?e=6iAYmz'
req = urllib.request.Request(url, headers={
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
})

try:
    with urllib.request.urlopen(req) as resp:
        final_url = resp.geturl()
        print('Final URL:', final_url)
        content = resp.read()
        html = content.decode('utf-8', errors='ignore')
        print('HTML length:', len(html))
        print('Title:', re.findall(r'<title>(.*?)</title>', html, re.I))
        
        # Save HTML for inspection
        with open('onedrive_landing.html', 'w', encoding='utf-8') as f:
            f.write(html)
        print('Saved onedrive_landing.html')
except Exception as e:
    print('Error:', e)
