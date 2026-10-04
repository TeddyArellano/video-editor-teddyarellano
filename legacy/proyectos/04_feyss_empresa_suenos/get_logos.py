"""Download company logos from Wikimedia (Commons file titles first, then the Wikipedia article's images)."""
import json
import os
import time
import urllib.parse
import urllib.request

UA = {"User-Agent": "VideoEditBot/1.0 (personal video project)"}
OUT = "logos"
os.makedirs(OUT, exist_ok=True)

WANT = {
    "aws": (["File:Amazon Web Services Logo.svg"], []),
    "google": (["File:Google 2015 logo.svg"], []),
    "boston": (["File:BostonDynamics Logo.svg"], []),
    "tesla": (["File:Tesla Motors Logo.svg"], []),
    "siemens": (["File:Siemens-logo.svg"], []),
    "gm": (["File:General Motors (2021).svg", "File:General Motors logo.svg"], []),
    "lego": (["File:LEGO logo.svg"], []),
    "festo": (["File:Festo logo.svg"], []),
    "samsung": (["File:Samsung Orig Wordmark BLACK RGB.png", "File:Samsung wordmark.svg"], []),
    "televisa": ([], [("es", "Televisa"), ("en", "Televisa")]),
    "cocacola": (["File:Coca-Cola logo.svg"], [("en", "Coca-Cola")]),
    "femsa": (["File:FEMSA logo.svg", "File:Femsa logo.svg"], [("es", "FEMSA"), ("en", "FEMSA")]),
    "microsoft": (["File:Microsoft logo (2012).svg"], []),
    "bbva": (["File:BBVA 2019.svg"], [("en", "BBVA")]),
    "deloitte": (["File:Logo of Deloitte.svg", "File:Deloitte.svg"], [("en", "Deloitte")]),
    "kpmg": (["File:KPMG logo.svg", "File:KPMG blue logo.svg"], [("en", "KPMG")]),
    "gbm": ([], [("es", "Grupo Bursátil Mexicano"), ("es", "GBM (empresa)")]),
    "secihti": ([], [("es", "Secretaría de Ciencia, Humanidades, Tecnología e Innovación")]),
    "sabritas": ([], [("es", "Sabritas"), ("en", "Sabritas")]),
}


def get(url):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
                return r.read()
        except Exception as e:  # rate limit / transient
            time.sleep(4 + 4 * i)
    return None


def api(host, **params):
    params.update(format="json")
    raw = get(f"https://{host}/w/api.php?" + urllib.parse.urlencode(params))
    time.sleep(1.5)
    return json.loads(raw) if raw else {}


def thumb(host, title):
    d = api(host, action="query", titles=title, prop="imageinfo", iiprop="url", iiurlwidth=1200)
    for p in d.get("query", {}).get("pages", {}).values():
        if "imageinfo" in p:
            return p["imageinfo"][0].get("thumburl") or p["imageinfo"][0]["url"]
    return None


result = {}
for key, (titles, articles) in WANT.items():
    url = None
    for t in titles:
        url = thumb("commons.wikimedia.org", t)
        if url:
            break
    for lang, art in articles:
        if url:
            break
        d = api(f"{lang}.wikipedia.org", action="query", titles=art, prop="images", imlimit=50, redirects=1)
        imgs = [i["title"] for p in d.get("query", {}).get("pages", {}).values() for i in p.get("images", [])]
        cand = [i for i in imgs if "logo" in i.lower() or key in i.lower().replace("-", "")]
        for c in cand:
            url = thumb(f"{lang}.wikipedia.org", c)
            if url:
                break
    if url:
        data = get(url)
        if data:
            open(f"{OUT}/{key}.png", "wb").write(data)
            result[key] = url
    print(key, "->", url)
    time.sleep(1.5)
json.dump(result, open(f"{OUT}/sources.json", "w"), indent=1)
