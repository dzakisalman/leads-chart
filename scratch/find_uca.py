import urllib.request
import re
import pandas as pd
import io

url = 'https://docs.google.com/spreadsheets/d/1kwhpZTUEkzGnc8QuEpP0fN3bmrFRtmTTSV9AQSM6Le8/edit?usp=sharing'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
content = urllib.request.urlopen(req).read().decode('utf-8', errors='ignore')
captions = re.findall(r'docs-sheet-tab-caption\">([^<]+)</div>', content)

print("Checking tabs for 'Uca':")
for tab in captions:
    try:
        t_url = f"https://docs.google.com/spreadsheets/d/1kwhpZTUEkzGnc8QuEpP0fN3bmrFRtmTTSV9AQSM6Le8/gviz/tq?tqx=out:csv&sheet={urllib.parse.quote(tab)}"
        r = urllib.request.Request(t_url, headers={'User-Agent': 'Mozilla/5.0'})
        df = pd.read_csv(io.BytesIO(urllib.request.urlopen(r).read()), low_memory=False)
        # Search for Uca in all string columns
        mask = df.astype(str).apply(lambda x: x.str.contains('Uca', case=False, na=False)).any(axis=1)
        if mask.sum() > 0:
            print(f"--> Found {mask.sum()} rows in tab: {tab}")
    except Exception as e:
        pass
