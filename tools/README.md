# Node.js portatile (opzionale)

Questa cartella può contenere una copia autonoma di Node.js in
`tools/node-portable/`, così `Avvia Quiz.bat` funziona senza che Node.js
sia installato sul PC. Non è inclusa in Git (è troppo pesante, ~150MB),
quindi se hai clonato il progetto da GitHub invece di copiarlo da una
chiavetta USB già pronta, questa cartella sarà vuota.

**Per aggiungerla** (serve farlo una sola volta, poi la porti dove vuoi
insieme al resto della cartella `quiz`):

1. Scarica lo ZIP "Windows Binary (x64)" da https://nodejs.org (versione LTS)
2. Estrailo
3. Rinomina la cartella estratta (es. `node-v24.20.0-win-x64`) in `node-portable`
4. Spostala qui dentro, così da avere `quiz/tools/node-portable/node.exe`

Se questa cartella manca, `Avvia Quiz.bat` funziona comunque, usando il
Node.js eventualmente già installato sul PC.
