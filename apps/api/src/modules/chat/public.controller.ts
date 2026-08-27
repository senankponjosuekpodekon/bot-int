import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';

const ADMIN_HTML = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>BotInt Admin</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; padding: 0; background: #f3f4f6; color: #111; }
    header { background: #111; color: #fff; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; }
    main { max-width: 1200px; margin: 24px auto; padding: 0 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
    .card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .card h3 { margin: 0 0 8px; font-size: 14px; color: #6b7280; text-transform: uppercase; }
    .card .value { font-size: 28px; font-weight: 700; }
    .filters { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .filters input, .filters button { padding: 10px 12px; border-radius: 8px; border: 1px solid #d1d5db; font-size: 14px; }
    .filters button { background: #111; color: #fff; border-color: #111; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-size: 12px; text-transform: uppercase; color: #6b7280; }
    #login { max-width: 400px; margin: 80px auto; background: #fff; padding: 32px; border-radius: 12px; }
    #login input { width: 100%; margin-bottom: 12px; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; }
    #login button { width: 100%; padding: 12px; background: #111; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <header><div>BotInt Admin</div><small id="period"></small></header>
  <main>
    <div id="login">
      <h2>Connexion admin</h2>
      <input id="token" type="password" placeholder="JWT token" />
      <button onclick="saveToken()">Se connecter</button>
    </div>
    <div id="app" class="hidden">
      <div class="filters">
        <input type="date" id="from" />
        <input type="date" id="to" />
        <button onclick="load()">Rafraîchir</button>
        <button onclick="localStorage.removeItem('botint_token'); location.reload()">Déconnexion</button>
      </div>
      <div class="grid" id="kpi-grid"></div>
      <h2>Top intentions</h2>
      <table id="top-intents"><thead><tr><th>Intention</th><th>Compteur</th></tr></thead><tbody></tbody></table>
    </div>
  </main>
  <script>
    const token = localStorage.getItem('botint_token');
    if (token) { document.getElementById('login').classList.add('hidden'); document.getElementById('app').classList.remove('hidden'); load(); }
    function saveToken() { localStorage.setItem('botint_token', document.getElementById('token').value); location.reload(); }
    function fmt(n) { return new Intl.NumberFormat('fr-FR').format(n); }
    async function load() {
      const from = document.getElementById('from').value;
      const to = document.getElementById('to').value;
      const qs = (from ? '&from=' + from : '') + (to ? '&to=' + to : '');
      const res = await fetch('/chat/analytics?' + qs.replace(/^&/, '?'), { headers: { Authorization: 'Bearer ' + token } });
      if (!res.ok) return alert('Erreur ' + res.status);
      const d = await res.json();
      document.getElementById('period').textContent = new Date(d.period.start).toLocaleDateString('fr-FR') + ' – ' + new Date(d.period.end).toLocaleDateString('fr-FR');
      const grid = document.getElementById('kpi-grid');
      grid.innerHTML = [
        ['Conversations', d.totalConversations],
        ['Messages', d.totalMessages],
        ['Handoffs', d.handoffs],
        ['Score moyen', d.averageIntentScore],
        ['Avec lead', d.conversationsWithLead],
        ['Taux conversion', d.conversionRate + '%']
      ].map(([t, v]) => '<div class="card"><h3>' + t + '</h3><div class="value">' + fmt(v) + '</div></div>').join('');
      document.querySelector('#top-intents tbody').innerHTML = (d.topIntents || []).map(i => '<tr><td>' + i.intent + '</td><td>' + fmt(i.count) + '</td></tr>').join('');
    }
  </script>
</body>
</html>`;

const OPERATOR_HTML = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>BotInt Operator Inbox</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; margin: 0; padding: 0; background: #f3f4f6; }
    header { background: #111; color: #fff; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center; }
    main { max-width: 960px; margin: 24px auto; padding: 0 24px; }
    .conversation { background: #fff; border-radius: 12px; padding: 16px; margin-bottom: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .conversation h4 { margin: 0 0 6px; }
    .conversation p { margin: 0 0 12px; color: #6b7280; font-size: 14px; }
    .conversation button { padding: 8px 12px; border: none; border-radius: 6px; background: #111; color: #fff; cursor: pointer; margin-right: 8px; }
    .chat { display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin: 12px 0; background: #f9fafb; }
    .msg { padding: 8px 12px; border-radius: 8px; font-size: 14px; max-width: 80%; }
    .msg.user { align-self: flex-end; background: #111; color: #fff; }
    .msg.bot, .msg.operator { align-self: flex-start; background: #e5e7eb; color: #111; }
    .reply { display: flex; gap: 8px; }
    .reply input { flex: 1; padding: 10px; border: 1px solid #d1d5db; border-radius: 6px; }
    #login { max-width: 400px; margin: 80px auto; background: #fff; padding: 32px; border-radius: 12px; }
    #login input { width: 100%; margin-bottom: 12px; padding: 12px; border: 1px solid #d1d5db; border-radius: 8px; }
    #login button { width: 100%; padding: 12px; background: #111; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <header><div>Opérateur BotInt</div><button onclick="localStorage.removeItem('botint_token'); location.reload()">Déconnexion</button></header>
  <main>
    <div id="login">
      <h2>Connexion opérateur</h2>
      <input id="token" type="password" placeholder="JWT token" />
      <button onclick="saveToken()">Se connecter</button>
    </div>
    <div id="app" class="hidden">
      <h2>File d'attente</h2>
      <div id="inbox"></div>
    </div>
  </main>
  <script>
    const token = localStorage.getItem('botint_token');
    if (token) { document.getElementById('login').classList.add('hidden'); document.getElementById('app').classList.remove('hidden'); loadInbox(); }
    function saveToken() { localStorage.setItem('botint_token', document.getElementById('token').value); location.reload(); }
    async function get(path) { const r = await fetch(path, { headers: { Authorization: 'Bearer ' + token } }); return r.json(); }
    async function post(path, body) { const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify(body) }); return r.json(); }
    async function loadInbox() {
      const d = await get('/chat/operator/inbox?limit=50');
      const box = document.getElementById('inbox');
      if (!d.data.length) { box.innerHTML = '<p>Aucune conversation en attente.</p>'; return; }
      box.innerHTML = d.data.map(c => \`
        <div class="conversation" id="conv-\${c.id}">
          <h4>\${c.visitorId || 'Anonyme'}</h4>
          <p>\${c.channel || 'web'} • \${new Date(c.updatedAt || c.createdAt).toLocaleString('fr-FR')}</p>
          <button onclick="take('\${c.id}')">Prendre en charge</button>
          <button onclick="loadHistory('\${c.id}')">Voir</button>
          <div class="chat hidden" id="chat-\${c.id}"></div>
          <form class="reply hidden" id="reply-\${c.id}" onsubmit="reply(event, '\${c.id}')">
            <input type="text" id="input-\${c.id}" placeholder="Réponse opérateur..." autocomplete="off" />
            <button type="submit">Envoyer</button>
          </form>
        </div>
      \`).join('');
    }
    async function take(id) { await post('/chat/operator/' + id + '/take', {}); alert('Pris en charge'); }
    async function loadHistory(id) {
      const data = await get('/chat/history/' + id);
      const chat = document.getElementById('chat-' + id);
      chat.classList.remove('hidden');
      document.getElementById('reply-' + id).classList.remove('hidden');
      chat.innerHTML = (data.messages || []).map(m => '<div class="msg ' + (m.role === 'user' ? 'user' : (m.metadata && m.metadata.isOperator ? 'operator' : 'bot')) + '">' + (m.content || '').replace(/</g, '&lt;') + '</div>').join('');
    }
    async function reply(e, id) {
      e.preventDefault();
      const content = document.getElementById('input-' + id).value;
      if (!content) return;
      await post('/chat/' + id + '/operator', { content });
      document.getElementById('input-' + id).value = '';
      loadHistory(id);
    }
  </script>
</body>
</html>`;

const WIDGET_DEMO_HTML = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>BotInt Widget Demo</title>
  <style>body { font-family: system-ui, sans-serif; padding: 40px; background: #f3f4f6; } .box { max-width: 500px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 12px; }</style>
</head>
<body>
  <div class="box">
    <h1>Widget demo</h1>
    <p>Collez votre script <code>widget.js</code> n'importe où sur une page. Vous avez besoin d'une <a href="/api-key">clé API</a> et d'un <code>agentId</code>.</p>
    <pre><code id="code"></code></pre>
  </div>
  <script>
    const agentId = new URLSearchParams(location.search).get('agentId') || 'YOUR_AGENT_ID';
    const apiKey = new URLSearchParams(location.search).get('apiKey') || 'stia_YOUR_API_KEY';
    const snippet = '<script src="' + location.origin + '/widget/widget.js" data-api-key="' + apiKey + '" data-agent-id="' + agentId + '" data-position="right"><\/script>';
    document.getElementById('code').textContent = snippet;
  </script>
  <script src="/widget/widget.js" data-api-key="stia_demo" data-agent-id="demo_agent" data-position="right"></script>
</body>
</html>`;

@Controller()
export class PublicController {
  @Get('admin')
  admin(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html');
    res.send(ADMIN_HTML);
  }

  @Get('operator')
  operator(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html');
    res.send(OPERATOR_HTML);
  }

  @Get('widget-demo')
  widgetDemo(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/html');
    res.send(WIDGET_DEMO_HTML);
  }
}
