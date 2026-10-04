"""EDL for '¿Cuál es la empresa de tus sueños?' – question once, then only the answers."""
import json

# (clip, [(first_word, last_word, role)], [(word_index, logo_key)])
PLAN = [
    ("IMG_9551", [(107, 113, 'q'), (114, 123, 'a'), (126, 130, 'a')], [(120, 'aws'), (123, 'google')]),
    ("2.1", [(10, 41, 'a')], [(26, 'boston')]),
    ("IMG_9556", [(7, 9, 'a'), (10, 16, 'a'), (17, 20, 'a'), (26, 40, 'a')],
     [(9, 'tesla'), (13, 'siemens'), (15, 'gm'), (19, 'lego'), (20, 'festo')]),
    ("IMG_9545", [(7, 12, 'a'), (18, 35, 'a')], [(12, 'samsung')]),
    ("4.1", [(7, 17, 'a'), (74, 93, 'a')], [(7, 'televisa'), (12, 'cocacola'), (13, 'femsa'), (17, 'microsoft')]),
    ("IMG_9549", [(56, 77, 'a'), (80, 101, 'a')], [(65, 'bbva'), (70, 'deloitte'), (71, 'kpmg')]),
    ("IMG_9550", [(46, 61, 'a'), (64, 73, 'a')], [(47, 'gbm')]),
    ("IMG_9546", [(6, 18, 'a'), (21, 38, 'a')], [(13, 'bbva')]),
    ("1", [(84, 97, 'a'), (100, 116, 'a')], [(97, 'secihti')]),
    ("3", [(48, 50, 'a'), (53, 57, 'a')], []),
    ("IMG_9553", [(7, 7, 'a'), (10, 31, 'a')], [(7, 'sabritas')]),
]
OVERRIDE_IN = {('IMG_9551', 121): 66.35, ('IMG_9551', 126): 69.1}
OVERRIDE_OUT = {('4.1', 17): 12.45, ('IMG_9551', 126): 70.25, ('IMG_9551', 130): 72.3}


def wend(w):
    return w[2] + 0.05 * len(w[0]) + 0.14


PAD_IN, PAD_OUT, GAP = 0.14, 0.12, 0.30
pieces = []
for si, (src, ranges, logos) in enumerate(PLAN):
    W = json.load(open(f'tr/words{src}.json'))
    for a, b, role in ranges:
        ws = [w + [idx] for idx, w in zip(range(a, b + 1), W[a:b + 1])]
        grp = [[ws[0]]]
        for p, q in zip(ws, ws[1:]):
            if q[1] - wend(p) > GAP:
                grp.append([q])
            else:
                grp[-1].append(q)
        for g in grp:
            i0, i1 = g[0][3], g[-1][3]
            st = g[0][1] - PAD_IN
            if i0 > 0:
                st = max(st, W[i0 - 1][2] + 0.02)
            st = OVERRIDE_IN.get((src, i0), st)
            en = wend(g[-1]) + PAD_OUT
            if i1 + 1 < len(W):
                en = min(en, W[i1 + 1][1] - 0.15)
            en = OVERRIDE_OUT.get((src, i1), en)
            pieces.append({"seg": si, "src": src, "in": round(st, 3), "out": round(en, 3), "role": role,
                           "words": [x[:3] + [x[3]] for x in g], "text": " ".join(x[0] for x in g),
                           "logos": [[wi, k] for wi, k in logos if i0 <= wi <= i1]})
merged = []
for p in pieces:
    q = merged[-1] if merged else None
    if q and q['src'] == p['src'] and q['seg'] == p['seg'] and 0 <= p['in'] - q['out'] < 0.25:
        q['out'] = p['out']
        q['words'] += p['words']
        q['text'] += ' ' + p['text']
        q['logos'] += p['logos']
    else:
        merged.append(p)
json.dump(merged, open('edl.json', 'w'), ensure_ascii=False, indent=1)
print("pieces", len(merged), "total", round(sum(p['out'] - p['in'] for p in merged), 1), "s")
for k, p in enumerate(merged):
    print(f"{k:2d} {p['src']:9s} {p['in']:6.2f}-{p['out']:6.2f} {p['logos']} | {p['text']}")
