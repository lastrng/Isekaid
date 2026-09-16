# carnet-render-service

Microservice WeasyPrint minimal : il reçoit le document HTML déjà construit par
la fonction Supabase `carnet-render` et renvoie les octets du PDF. Il n’accède ni
à Supabase ni à Storage. Les seules ressources acceptées dans le HTML sont les
images `data:` intégrées par la fonction ; HTTP(S) et `file:` sont bloqués.

## Installation VPS

```bash
sudo apt-get install -y libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev fonts-noto-cjk
sudo mkdir -p /opt/isekaid-carnet-render
sudo cp main.py requirements.txt /opt/isekaid-carnet-render/
cd /opt/isekaid-carnet-render

python3 -m venv venv
./venv/bin/pip install -r requirements.txt
```

Les familles Noto Sans/Serif CJK sont locales et couvrent accents français,
hiragana, katakana et kanji. Le service systemd refuse de démarrer si la police
japonaise principale manque.

Créer `/opt/isekaid-carnet-render/.env` avec un jeton aléatoire :

```bash
echo "CARNET_RENDER_TOKEN=$(openssl rand -hex 32)" | sudo tee /opt/isekaid-carnet-render/.env
sudo chmod 600 /opt/isekaid-carnet-render/.env
```

```bash
sudo cp carnet-render.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now carnet-render
sudo systemctl status carnet-render
```

Le service écoute uniquement sur `127.0.0.1:8088`. Le reverse proxy HTTPS ne
doit exposer `/render` qu’à la fonction, protégée par le même token configuré
dans le secret Supabase `CARNET_RENDER_TOKEN`. `CARNET_RENDER_URL` pointe vers
cette route HTTPS.

### Test de santé

```bash
curl -fsS http://127.0.0.1:8088/health
```

La fonction Edge est la seule couche qui accepte un `tripId`, vérifie
l’utilisateur, collecte les photos privées et met en cache le PDF privé.
