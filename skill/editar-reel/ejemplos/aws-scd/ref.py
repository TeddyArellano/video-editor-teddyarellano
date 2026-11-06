# Genera src/ref.json (estilo referencia.mp4) a partir de src/data.json. Correr después de cada `reel datos`.
import json, sys, unicodedata
P = sys.argv[1] if len(sys.argv) > 1 else '.'
d = json.load(open(f'{P}/src/data.json')); FPS = 30
norm = lambda t: ''.join(c for c in unicodedata.normalize('NFD', t.lower()) if c.isalnum())
def w(sec, txt, n=0, campo='start'):
    hits = [x for x in d['words'] if x['sec'] == sec and norm(x['text']) == norm(txt)]
    return round(hits[n][campo] * FPS)
len_cut = d['n']
fin = lambda sec: next(s['b'] for s in d['secs'] if s['id'] == sec)
ref = {
  "hookEnd": w('intro', 'México', campo='end') + 12,
  "stickers": [
    {"texto": "AMAZON", "at": w('intro', 'Amazon') - 4, "x": 320, "y": 340, "rot": -11, "size": 112},
    {"texto": "LLEGA", "at": w('intro', 'llega') - 4, "x": 770, "y": 400, "rot": 13, "size": 104}],
  "blur": {"texto": "A CDMX", "at": w('intro', 'ciudad') - 4, "y": 990, "size": 112},
  "glitch": {"src": "logos/aws_blanco.png", "at": w('intro', 'ciudad') + 2, "y": 1250, "ancho": 400},
  "logos": [
    {"src": "scd/logo_scd.png", "a": w('evento', 'AWS') - 2, "b": fin('evento'), "ancho": 760, "y": 270},
    {"src": "logos/linkedin.png", "a": w('actividades', 'fotos') - 2, "b": w('actividades', 'LinkedIn', campo='end') + 40, "ancho": 620, "y": 340},],
  # al frente
  "pegatinas": [
    {"src": "scd/nube.png", "a": w('niveles', 'domines') - 3, "b": w('niveles', 'nube', campo='end') + 18, "x": 540, "y": 380, "ancho": 320, "entrada": "pop"}],
  # DETRÁS de la persona: salen en diagonal a 135° (izquierda) / 45° (derecha) desde atrás de los hombros, giros simétricos
  "detras": [
    {"src": "scd/angel.png", "a": w('intro', 'ciudad') - 2, "b": w('intro', 'México', campo='end') + 12, "x": 245, "y": 600, "ancho": 200, "desde": [300, 260], "rot": -14},
    {"src": "scd/insignia.png", "a": w('evento', 'Hablo') - 3, "b": w('evento', 'AWS') - 2, "x": 540, "y": 300, "ancho": 400, "desde": [0, 460]},
    {"src": "scd/xolo_camina.png", "a": w('niveles', 'Build') - 3, "b": fin('niveles'), "x": 255, "y": 560, "ancho": 330, "desde": [290, 260], "rot": -20},
    {"src": "scd/xolo_sentado.png", "a": w('niveles', 'hackatón') - 3, "b": fin('niveles'), "x": 830, "y": 560, "ancho": 300, "desde": [-290, 260], "rot": 20},
    {"src": "scd/pan.png", "a": w('fecha', '4') - 3, "b": w('fecha', 'Centro') - 1, "x": 255, "y": 560, "ancho": 330, "desde": [290, 260], "rot": -20},
    {"src": "scd/cafe.png", "a": w('fecha', 'noviembre') - 3, "b": w('fecha', 'Centro') - 1, "x": 830, "y": 560, "ancho": 250, "desde": [-290, 260], "rot": 20},
    {"src": "logos/ipn.png", "a": w('fecha', 'mítico') - 4, "b": fin('fecha'), "x": 540, "y": 290, "ancho": 420, "desde": [0, 520]},
    {"src": "scd/xolo_frente.png", "a": w('cierre', 'Nos') - 3, "b": fin('cierre') + 30, "x": 830, "y": 600, "ancho": 300, "desde": [-290, 260], "rot": 16}],
  "gratis": [{"texto": "GRATIS", "a": w('gratis', 'gratuito') - 10, "b": fin('gratis') + 15, "y": 290, "size": 150}],
}
ref['fotos'] = [{"src": "scd/cuadrilatero.jpg", "a": w('fecha', 'Centro') - 4, "b": w('fecha', 'mítico') - 3, "cx": 0.5}]
qa = w('cierre', 'Te') - 2
ref['qr'] = {"src": "scd/qr_registro.png", "a": qa, "b": w('cierre', 'comenta') - 4, "y": 62, "qr": 286, "titulo": "REGÍSTRATE", "pie": ""}
c0, c1 = w('cierre', 'comenta') + 2, w('cierre', 'Amazon', campo='end')
ref['comentario'] = {"a": w('cierre', 'comenta') - 4, "b": w('cierre', 'Nos') - 2, "y": 900, "texto": "AMAZON",
  "letras": [round(c0 + i * (c1 - c0) / 5) for i in range(6)], "enviar": c1 + 4}
ref['subs'] = {"arriba": [], "ocultar": [[ref['comentario']['a'], ref['comentario']['b']]], "top": 870}
ref['fg'] = sorted({f for d in ref['detras'] for f in range(d['a'], min(d['b'], len_cut))})
json.dump(ref, open(f'{P}/src/ref.json', 'w'), indent=1)
print('✓ src/ref.json', ref['hookEnd'], [(l['src'], l['a'], l['b']) for l in ref['logos']])
