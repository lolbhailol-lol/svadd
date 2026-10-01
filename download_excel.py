import requests
import re

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
})

url = 'https://1drv.ms/x/c/838AB1375C0F4F22/IQB2fBIn83S9QoxP5yo6z9nYAfgpdLlQRHTEE3ErDrUO3Ng?e=6iAYmz'
resp = session.get(url, allow_redirects=True)
print("Doc URL:", resp.url)

# Now extract the download url from resp.text
matches = re.findall(r'(https://[^\s"\'<>\\]+/_layouts/15/download\.aspx\?UniqueId=[^\s"\'<>\\]+)', resp.text)
print("Matches:", matches)

if not matches:
    matches = ['https://onedrive.live.com/personal/838AB1375C0F4F22/_layouts/15/download.aspx?UniqueId=27127c76-74f3-42bd-8c4f-e72a3acfd9d8']

for target in matches:
    target = target.replace('\\u0026', '&')
    print("Trying download:", target)
    dresp = session.get(target, allow_redirects=True)
    print("Status:", dresp.status_code, "Content type:", dresp.headers.get('Content-Type'), "Length:", len(dresp.content))
    if dresp.status_code == 200 and ('spreadsheet' in dresp.headers.get('Content-Type', '') or len(dresp.content) > 1000 and dresp.content[:2] == b'PK'):
        with open('c:/svadd/Billing_Format.xlsx', 'wb') as f:
            f.write(dresp.content)
        print("Successfully saved Billing_Format.xlsx! Size:", len(dresp.content))
        break
    else:
        print("Response preview:", dresp.content[:200])
