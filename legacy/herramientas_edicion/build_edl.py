"""Build one EDL per area video (A: química/industria, B: tecnología/finanzas)."""
import json

GROUPS = {
    'A': [
        ("JARRITOS", "9707", [(1, 3, 'q'), (4, 19, 'a'), (24, 34, 'a'), (38, 47, 'a')]),
        ("GRUPO INIX", "9711", [(81, 98, 'a'), (111, 136, 'a'), (15, 26, 'a'), (42, 55, 'a')]),
        ("ALS GLOBAL", "9714", [(4, 22, 'a'), (23, 35, 'a'), (36, 49, 'a')]),
        ("GRUPO SPIN", "9704", [(1, 20, 'a'), (21, 34, 'a'), (45, 63, 'a')]),
    ],
    'B': [
        ("PwC", "9726", [(0, 2, 'q'), (3, 27, 'a'), (59, 65, 'a'), (103, 130, 'a')]),
        ("AXTEL", "9721", [(121, 140, 'a'), (7, 30, 'a')]),
        ("SNGULAR", "9697", [(277, 281, 'a'), (15, 34, 'a'), (42, 53, 'a'), (118, 127, 'a')]),
        ("E-GLOBAL", "9718", [(29, 45, 'a'), (5, 25, 'a'), (93, 100, 'a')]),
        ("TCM PARTNERS", "9693", [(55, 72, 'a'), (1, 10, 'a'), (18, 28, 'a')]),
    ],
}


def wend(w):
    return w[2] + 0.05 * len(w[0]) + 0.14


PAD_IN, PAD_OUT, GAP = 0.14, 0.12, 0.30

for g, companies in GROUPS.items():
    pieces = []
    for ci, (name, src, plan) in enumerate(companies):
        W = json.load(open(f'tr/words{src}.json'))
        for a, b, role in plan:
            ws = [w + [idx] for idx, w in zip(range(a, b + 1), W[a:b + 1])]
            grp = [[ws[0]]]
            for p, q in zip(ws, ws[1:]):
                if q[1] - wend(p) > GAP:
                    grp.append([q])
                else:
                    grp[-1].append(q)
            for gg in grp:
                i0, i1 = gg[0][3], gg[-1][3]
                st = gg[0][1] - PAD_IN
                if i0 > 0:
                    st = max(st, W[i0 - 1][2] + 0.02)
                en = wend(gg[-1]) + PAD_OUT
                if i1 + 1 < len(W):
                    en = min(en, W[i1 + 1][1] - 0.15)
                pieces.append({"company": ci, "name": name, "src": src, "in": round(st, 3), "out": round(en, 3),
                               "role": role, "words": [x[:3] for x in gg], "text": " ".join(x[0] for x in gg)})
    merged = []
    for p in pieces:
        q = merged[-1] if merged else None
        if q and q['src'] == p['src'] and q['company'] == p['company'] and 0 <= p['in'] - q['out'] < 0.25:
            q['out'] = p['out']
            q['words'] += p['words']
            q['text'] += ' ' + p['text']
        else:
            merged.append(p)
    json.dump(merged, open(f'edl_{g}.json', 'w'), ensure_ascii=False, indent=1)
    tot = sum(p['out'] - p['in'] for p in merged)
    print(g, "pieces", len(merged), "total", round(tot, 1), "s |", merged[0]['text'][:50])
