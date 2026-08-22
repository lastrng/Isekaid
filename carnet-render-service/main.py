# ─────────────────────────────────────────────────────────────────────────────
# carnet-render-service — microservice de rendu PDF (weasyprint) pour le
# carnet de voyage illustré d'Isekaid.
#
# Ne connaît RIEN des données Isekaid (pas de lieux, pas de voyage, pas de DB) :
# reçoit du HTML déjà entièrement assemblé (voir src/carnet.js côté app) et
# renvoie les octets PDF. Appelé uniquement par la Supabase Edge Function
# carnet-render (supabase/functions/carnet-render/index.ts), jamais
# directement par le client — protégé par un jeton partagé.
# ─────────────────────────────────────────────────────────────────────────────
import os

from flask import Flask, Response, abort, request
from weasyprint import HTML

app = Flask(__name__)

RENDER_TOKEN = os.environ.get("CARNET_RENDER_TOKEN", "")
MAX_HTML_BYTES = 3 * 1024 * 1024  # 3 Mo — doit rester cohérent avec l'Edge Function


@app.post("/render")
def render():
    if not RENDER_TOKEN:
        abort(500, "CARNET_RENDER_TOKEN non configuré côté serveur")

    auth = request.headers.get("Authorization", "")
    if auth != f"Bearer {RENDER_TOKEN}":
        abort(401)

    data = request.get_json(silent=True) or {}
    html = data.get("html", "")
    if not html:
        abort(400, "champ 'html' manquant")
    if len(html.encode("utf-8")) > MAX_HTML_BYTES:
        abort(413, "HTML trop volumineux")

    pdf_bytes = HTML(string=html).write_pdf()
    return Response(pdf_bytes, mimetype="application/pdf")


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8088"))
    app.run(host="0.0.0.0", port=port)
