"""EDL for the Google Cloud Summit unboxing: best take of every line, continuous audio."""
import json

W = json.load(open('words.json'))
# (first_word, last_word, section)  – sections drive the item chips / zooms
PLAN = [
    (110, 128, 'summit'),
    (85, 89, 'bolsa1'), (101, 107, 'bolsa1'),
    (129, 132, 'botella'), (137, 137, 'botella'), (139, 141, 'botella'),
    (147, 150, 'gafete'), (155, 158, 'gafete'), (166, 173, 'gafete'),
    (176, 179, 'organizador'), (184, 191, 'organizador'), (210, 216, 'organizador'), (230, 235, 'organizador'),
    (240, 244, 'correa'), (261, 274, 'correa'),
    (284, 291, 'llaveros'), (296, 299, 'llaveros'), (308, 315, 'llaveros'), (316, 320, 'llaveros'),
    (325, 330, 'te'), (343, 345, 'te'), (357, 369, 'te'), (374, 378, 'te'),
    (391, 403, 'bolsa2'),
    (409, 416, 'galletas'), (427, 428, 'galletas'), (429, 434, 'galletas'), (443, 446, 'galletas'), (476, 480, 'galletas'),
    (510, 518, 'caja'), (519, 525, 'caja'), (550, 558, 'caja'),
    (562, 566, 'tetera'), (573, 580, 'tetera'), (587, 594, 'tetera'), (597, 599, 'tetera'), (600, 601, 'tetera'),
    (602, 606, 'tetera'), (614, 624, 'tetera'), (630, 635, 'tetera'),
    (636, 641, 'cierre'), (679, 691, 'cierre'), (707, 713, 'cierre'),
]
OVERRIDE_IN = {319: 185.30}
OVERRIDE_OUT = {}


def wend(w):
    # DTW sometimes stretches the last token over the following silence: cap by the word's start + length
    return min(w[2], w[1] + 0.08 * len(w[0]) + 0.25) + 0.05 * len(w[0]) * 0 + 0.14


PAD_IN, PAD_OUT, GAP = 0.14, 0.12, 0.30
pieces = []
for a, b, sec in PLAN:
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
        st = OVERRIDE_IN.get(i0, st)
        en = wend(g[-1]) + PAD_OUT
        if i1 + 1 < len(W):
            en = min(en, W[i1 + 1][1] - 0.15)
        en = OVERRIDE_OUT.get(i1, en)
        pieces.append({"sec": sec, "in": round(st, 3), "out": round(en, 3), "words": [x[:3] for x in g],
                       "text": " ".join(x[0] for x in g), "i0": i0, "i1": i1})
# hook: best take (18.87-21.35) + "vamos a ver qué son" from the 31 s take, timed from the audio itself
def synth(text, a, b, lead=0.12, tail=0.1):
    ws = text.split(); tot = sum(len(x) + 1 for x in ws); t = a + lead; out = []
    for x in ws:
        d = (b - a - lead - tail) * (len(x) + 1) / tot; out.append([x, round(t, 3), round(t + d, 3)]); t += d
    return out
HOOK = [{"sec": "hook", "in": 18.75, "out": 21.45, "words": synth("Google me regaló algunas cositas por ser creador de contenido,", 18.75, 21.45), "text": "Google me regaló algunas cositas por ser creador de contenido,", "i0": -1, "i1": -1},
        {"sec": "hook", "in": 33.46, "out": 34.45, "words": [["vamos", 33.58, 33.72], ["a", 33.72, 33.84], ["ver", 33.84, 33.94], ["qué", 33.94, 34.16], ["son.", 34.16, 34.4]], "text": "vamos a ver qué son.", "i0": -1, "i1": -1}]
pieces = HOOK + pieces
merged = []
for p in pieces:
    q = merged[-1] if merged else None
    if q and q['sec'] == p['sec'] and 0 <= p['in'] - q['out'] < 0.25:
        q['out'] = p['out']; q['words'] += p['words']; q['text'] += ' ' + p['text']; q['i1'] = p['i1']
    else:
        merged.append(p)
json.dump(merged, open('edl.json', 'w'), ensure_ascii=False, indent=1)
print("pieces", len(merged), "total", round(sum(p['out'] - p['in'] for p in merged), 1), "s")
for k, p in enumerate(merged):
    print(f"{k:2d} {p['sec']:12s} {p['in']:7.2f}-{p['out']:7.2f} | {p['text']}")
