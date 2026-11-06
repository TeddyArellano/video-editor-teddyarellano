#!/bin/zsh
# oir.sh CLIP.MOV inicio fin  → transcribe ESE tramo exacto, aislado y sin contexto (para confirmar una frase/retoma antes de usarla)
o=$(mktemp -t oir).wav
ffmpeg -v error -y -ss $2 -to $3 -i "$1" -af apad=pad_dur=0.5 -ac 1 -ar 16000 $o
echo "${1:t:r} $2-$3: $(whisper-cli -m $HOME/.reels-toolkit/models/ggml-large-v3-turbo.bin -l es -mc 0 -nt -f $o 2>/dev/null | tr '\n' ' ')"
