# carnet-render-service

Microservice weasyprint : reçoit du HTML (déjà généré côté app par `src/carnet.js`), renvoie un PDF. N'a besoin d'aucun accès aux données Isekaid — un seul endpoint, protégé par un jeton partagé.

Appelé uniquement par la Supabase Edge Function `carnet-render` (jamais exposé publiquement sans authentification).

## Déploiement sur le VPS

```bash
sudo mkdir -p /opt/isekaid-carnet-render
sudo cp main.py requirements.txt /opt/isekaid-carnet-render/
cd /opt/isekaid-carnet-render

python3 -m venv venv
./venv/bin/pip install -r requirements.txt
```

weasyprint a besoin de libs système (Pango, Cairo, GDK-Pixbuf) — si absentes :

```bash
sudo apt-get install -y libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 libffi-dev
```

### Jeton partagé

```bash
echo "CARNET_RENDER_TOKEN=$(openssl rand -hex 32)" | sudo tee /opt/isekaid-carnet-render/.env
```

Cette même valeur doit être configurée comme secret `CARNET_RENDER_TOKEN` côté Supabase Edge Function (voir plus bas) — les deux doivent correspondre exactement.

### ⚠️ Polices — important

`carnet-template.html` (dans le repo principal, à la racine de `src/`) charge les polices via :
```css
@font-face { font-family: 'Caveat'; src: url('/tmp/fonts/Caveat.ttf'); }
@font-face { font-family: 'Montserrat'; src: url('/tmp/fonts/Montserrat.ttf'); }
```
`/tmp` peut être vidé au redémarrage du VPS — le carnet perdrait alors ses polices (repli silencieux sur une police système, la charte visuelle change). Avant de démarrer le service, assure-toi que `/tmp/fonts/Caveat.ttf` et `/tmp/fonts/Montserrat.ttf` existent réellement (copie manuelle ou `ExecStartPre` dans le systemd unit) — ou dis-moi si tu préfères que je change ces chemins vers un dossier permanent (ex. `/opt/isekaid-carnet-render/fonts/`) : je n'ai pas touché au template pour l'instant, il reste exactement tel que tu l'as fourni.

### Lancer le service

```bash
sudo cp carnet-render.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now carnet-render
sudo systemctl status carnet-render
```

Le service écoute en local sur `127.0.0.1:8088` (pas exposé directement à internet — passe par ton reverse proxy existant, ex. nginx, avec HTTPS, pour lui donner une URL publique `https://xxx/render`). C'est cette URL publique (HTTPS) qui sera configurée comme secret `CARNET_RENDER_URL` côté Supabase.

### Test manuel

```bash
curl -X POST https://ton-domaine/render \
  -H "Authorization: Bearer <CARNET_RENDER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"html":"<html><body><h1>Test</h1></body></html>"}' \
  -o test.pdf
```

## Côté Supabase (une fois le microservice en ligne)

Secrets à configurer sur le projet Supabase (`supabase secrets set ...` ou dashboard) :
- `CARNET_RENDER_URL` — l'URL publique HTTPS du endpoint `/render` (via ton reverse proxy)
- `CARNET_RENDER_TOKEN` — le même jeton que `.env` ci-dessus
- `REVENUECAT_SECRET_KEY` / `REVENUECAT_ENTITLEMENT_ID` — déjà configurés pour `itinerary-generate`, réutilisés tels quels

Puis déployer la fonction : `supabase functions deploy carnet-render`.
