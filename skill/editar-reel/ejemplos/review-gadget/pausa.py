# Pausa en silencio del gancho: "reel cortar" quita los silencios, así que después de cortar se alarga a mano
# la 2a pieza (se pone los audífonos y se queda 1 s con ellos puestos) y se vuelve a armar public/cut.mp4.
import json, sys, os
sys.path.insert(0, os.path.expanduser('~/.claude/skills/editar-reel/scripts'))
import reel
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
FIN = 29.45  # en C063: 27.9–29.2 manos en las orejas (se los pone), 29.3 baja las manos, 29.7 empieza otra toma
pr = reel.Proyecto('.')
E = json.load(open('edicion/edl_final.json'))
E[1]['out'] = FIN
n = reel.build_master(pr, E, pr.P / 'public' / 'cut.mp4')
json.dump(E, open('edicion/edl_final.json', 'w'), ensure_ascii=False)
print(f'✓ pausa → cut.mp4 {n} cuadros ({n / 30:.2f} s); gancho 2 = {E[1]["start"]}–{E[1]["start"] + E[1]["frames"]}')
