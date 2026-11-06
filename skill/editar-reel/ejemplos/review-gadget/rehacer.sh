#!/bin/zsh
# datos → whisper del corte (si cambió) → sync → tech
cd "${0:A:h}/.."
REEL="$HOME/.reels-toolkit/venv/bin/python $HOME/.claude/skills/editar-reel/scripts/reel.py"
${=REEL} datos -p . 2>&1 | grep "✓"
if [[ public/cut.mp4 -nt edicion/cut_whisper.json ]]; then
  ffmpeg -v error -y -i public/cut.mp4 -ar 16000 -ac 1 edicion/cut.wav
  whisper-cli -m ~/.reels-toolkit/models/ggml-large-v3-turbo.bin -l es -ml 1 -sow -dtw large.v3.turbo -ojf -of edicion/cut_whisper -f edicion/cut.wav >/dev/null 2>&1
fi
python3 edicion/sync.py
[[ -f edicion/tech.py ]] && python3 edicion/tech.py
