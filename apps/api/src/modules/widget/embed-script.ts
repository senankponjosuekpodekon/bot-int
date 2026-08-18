export const EMBED_SCRIPT = `
(function() {
  var currentScript = document.currentScript || (function() {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  var agentId = currentScript.getAttribute('data-agent') || '';
  var position = currentScript.getAttribute('data-position') || 'bottom-right';
  var primaryColor = currentScript.getAttribute('data-color') || '#4f46e5';
  var title = currentScript.getAttribute('data-title') || 'Chat IA';
  var apiUrl = currentScript.getAttribute('data-api') || 'http://localhost:3001/api';

  if (!agentId) { console.error('Widget: data-agent attribute required'); return; }

  var isOpen = false;
  var visitorId = localStorage.getItem('stiamond_visitor_id');
  if (!visitorId) {
    visitorId = 'v_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    localStorage.setItem('stiamond_visitor_id', visitorId);
  }

  var messages = [];
  var conversationId = null;

  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  function createBubble() {
    var bubble = document.createElement('div');
    bubble.style.cssText = 'position:fixed;' + (position.indexOf('left') >= 0 ? 'left:20px;' : 'right:20px;') + 'bottom:20px;width:60px;height:60px;border-radius:50%;background:' + primaryColor + ';cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;z-index:999999;transition:transform 0.2s;';
    bubble.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>';
    bubble.onclick = toggleChat;
    return bubble;
  }

  function createChatWindow() {
    var win = document.createElement('div');
    win.id = 'stiamond-chat-window';
    win.style.cssText = 'position:fixed;' + (position.indexOf('left') >= 0 ? 'left:20px;' : 'right:20px;') + 'bottom:90px;width:380px;max-width:calc(100vw - 40px);height:560px;max-height:calc(100vh - 120px);background:white;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.15);display:none;flex-direction:column;z-index:999998;overflow:hidden;font-family:system-ui,-apple-system,sans-serif;';

    var header = document.createElement('div');
    header.style.cssText = 'background:' + primaryColor + ';padding:16px;color:white;display:flex;align-items:center;justify-content:space-between;';
    header.innerHTML = '<div style="display:flex;align-items:center;gap:10px;"><div style="width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></div><div><div style="font-weight:600;font-size:15px;">' + esc(title) + '</div><div style="font-size:11px;opacity:0.8;">En ligne</div></div></div>';
    var closeBtn = document.createElement('button');
    closeBtn.id = 'stiamond-close';
    closeBtn.style.cssText = 'background:none;border:none;color:white;cursor:pointer;padding:4px;';
    closeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    header.appendChild(closeBtn);
    win.appendChild(header);

    var msgsDiv = document.createElement('div');
    msgsDiv.id = 'stiamond-messages';
    msgsDiv.style.cssText = 'flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;background:#f9fafb;';
    win.appendChild(msgsDiv);

    var typingDiv = document.createElement('div');
    typingDiv.id = 'stiamond-typing';
    typingDiv.style.cssText = 'display:none;padding:8px 16px;font-size:12px;color:#999;';
    typingDiv.textContent = "L'agent ecrit...";
    win.appendChild(typingDiv);

    var inputBar = document.createElement('div');
    inputBar.style.cssText = 'padding:12px;border-top:1px solid #eee;display:flex;gap:8px;background:white;';

    var input = document.createElement('input');
    input.id = 'stiamond-input';
    input.type = 'text';
    input.placeholder = 'Ecrivez votre message...';
    input.style.cssText = 'flex:1;padding:10px 14px;border:1px solid #ddd;border-radius:24px;font-size:14px;outline:none;';

    var sendBtn = document.createElement('button');
    sendBtn.id = 'stiamond-send';
    sendBtn.style.cssText = 'background:' + primaryColor + ';border:none;border-radius:50%;width:40px;height:40px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
    sendBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';

    inputBar.appendChild(input);
    inputBar.appendChild(sendBtn);
    win.appendChild(inputBar);

    return win;
  }

  function addMessage(role, text) {
    var container = document.getElementById('stiamond-messages');
    if (!container) return;
    var msg = document.createElement('div');
    var isUser = role === 'user';
    msg.style.cssText = 'max-width:80%;padding:10px 14px;border-radius:16px;font-size:14px;line-height:1.4;' + (isUser ? 'background:' + primaryColor + ';color:white;align-self:flex-end;border-bottom-right-radius:4px;' : 'background:white;color:#333;align-self:flex-start;border:1px solid #eee;border-bottom-left-radius:4px;');
    msg.textContent = text;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
    messages.push({ role: role, text: text });
  }

  function addFlowToUI(flow) {
    var container = document.getElementById('stiamond-messages');
    if (!container || !flow) return;
    var flowDiv = document.createElement('div');
    flowDiv.style.cssText = 'background:white;border:1px solid #eee;border-radius:16px;padding:14px;align-self:flex-start;max-width:80%;';
    var flowTitle = document.createElement('div');
    flowTitle.style.cssText = 'font-weight:600;font-size:14px;margin-bottom:10px;color:#333;';
    flowTitle.textContent = flow.title;
    flowDiv.appendChild(flowTitle);

    if (flow.fields && flow.fields.length) {
      flow.fields.forEach(function(field) {
        var label = document.createElement('label');
        label.style.cssText = 'display:block;font-size:12px;color:#666;margin-bottom:4px;';
        label.textContent = field.label;
        flowDiv.appendChild(label);

        if (field.type === 'buttons' && field.options) {
          field.options.forEach(function(opt) {
            var btn = document.createElement('button');
            btn.style.cssText = 'display:inline-block;margin:2px;padding:6px 12px;background:#f0f0f0;border:1px solid #ddd;border-radius:16px;font-size:12px;cursor:pointer;';
            btn.textContent = opt;
            btn.onclick = function() { btn.style.background = primaryColor; btn.style.color = 'white'; };
            flowDiv.appendChild(btn);
          });
        } else if (field.type === 'dropdown' && field.options) {
          var select = document.createElement('select');
          select.style.cssText = 'width:100%;padding:6px;border:1px solid #ddd;border-radius:6px;font-size:13px;margin-bottom:8px;';
          field.options.forEach(function(opt) {
            var o = document.createElement('option');
            o.value = opt; o.textContent = opt;
            select.appendChild(o);
          });
          flowDiv.appendChild(select);
        } else {
          var inp = document.createElement('input');
          inp.type = field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text';
          inp.placeholder = field.placeholder || '';
          inp.style.cssText = 'width:100%;padding:6px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;margin-bottom:8px;box-sizing:border-box;';
          flowDiv.appendChild(inp);
        }
      });

      var submitBtn = document.createElement('button');
      submitBtn.textContent = 'Envoyer';
      submitBtn.style.cssText = 'width:100%;padding:8px;background:' + primaryColor + ';color:white;border:none;border-radius:8px;cursor:pointer;font-size:13px;margin-top:6px;';
      flowDiv.appendChild(submitBtn);
    }

    container.appendChild(flowDiv);
    container.scrollTop = container.scrollHeight;
  }

  function addProductsCarousel(products) {
    var container = document.getElementById('stiamond-messages');
    if (!container || !products || products.length === 0) return;

    var carouselDiv = document.createElement('div');
    carouselDiv.style.cssText = 'display:flex;gap:8px;overflow-x:auto;padding:4px 0 8px 0;align-self:flex-start;max-width:90%;';

    products.forEach(function(p) {
      var card = document.createElement('div');
      card.style.cssText = 'flex-shrink:0;width:140px;background:white;border:1px solid #eee;border-radius:12px;overflow:hidden;cursor:pointer;transition:box-shadow 0.2s;';

      card.onmouseenter = function() { card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'; };
      card.onmouseleave = function() { card.style.boxShadow = 'none'; };

      var imgContainer = document.createElement('div');
      imgContainer.style.cssText = 'width:140px;height:100px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;';
      if (p.image) {
        var img = document.createElement('img');
        img.src = p.image;
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        img.onerror = function() { imgContainer.innerHTML = '<span style="font-size:24px;color:#ccc;">\\uD83D\\uDCD6</span>'; };
        imgContainer.appendChild(img);
      } else {
        imgContainer.innerHTML = '<span style="font-size:24px;color:#ccc;">\\uD83D\\uDCD6</span>';
      }
      card.appendChild(imgContainer);

      var info = document.createElement('div');
      info.style.cssText = 'padding:8px;';

      var name = document.createElement('div');
      name.style.cssText = 'font-size:12px;font-weight:600;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
      name.textContent = p.name;
      info.appendChild(name);

      var price = document.createElement('div');
      price.style.cssText = 'font-size:13px;font-weight:700;color:' + primaryColor + ';margin-top:2px;';
      price.textContent = p.price + (p.currency === 'EUR' ? ' EUR' : ' ' + (p.currency || ''));
      info.appendChild(price);

      if (p.stock !== undefined && p.stock !== null) {
        var stock = document.createElement('div');
        stock.style.cssText = 'font-size:10px;margin-top:2px;';
        if (p.stock > 0) {
          stock.style.color = '#22c55e';
          stock.textContent = 'En stock';
        } else {
          stock.style.color = '#ef4444';
          stock.textContent = 'Rupture';
        }
        info.appendChild(stock);
      }

      card.appendChild(info);

      if (p.url) {
        card.onclick = function() { window.open(p.url, '_blank'); };
      }

      carouselDiv.appendChild(card);
    });

    container.appendChild(carouselDiv);
    container.scrollTop = container.scrollHeight;
  }

  function toggleChat() {
    isOpen = !isOpen;
    var win = document.getElementById('stiamond-chat-window');
    if (win) win.style.display = isOpen ? 'flex' : 'none';
    if (isOpen && messages.length === 0) loadHistory();
  }

  function loadHistory() {
    fetch(apiUrl + '/widget/history/' + agentId + '?visitorId=' + visitorId)
      .then(function(r) { return r.json(); })
      .then(function(history) {
        if (history && history.length > 0) {
          history.forEach(function(msg) {
            addMessage(msg.role === 'assistant' ? 'agent' : 'user', msg.content);
          });
        } else {
          addMessage('agent', 'Bonjour ! Comment puis-je vous aider aujourd\\'hui ?');
        }
      })
      .catch(function() {
        addMessage('agent', 'Bonjour ! Comment puis-je vous aider aujourd\\'hui ?');
      });
  }

  function sendMessage() {
    var input = document.getElementById('stiamond-input');
    var text = input.value.trim();
    if (!text) return;
    addMessage('user', text);
    input.value = '';

    var typing = document.getElementById('stiamond-typing');
    if (typing) typing.style.display = 'block';

    fetch(apiUrl + '/widget/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId: agentId, message: text, visitorId: visitorId, conversationId: conversationId })
    })
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (typing) typing.style.display = 'none';
      if (data.conversationId) conversationId = data.conversationId;
      addMessage('agent', data.reply);
      if (data.products && data.products.length > 0) addProductsCarousel(data.products);
      if (data.flow) addFlowToUI(data.flow);
    })
    .catch(function() {
      if (typing) typing.style.display = 'none';
      addMessage('agent', 'Desole, une erreur est survenue. Reessayez dans un instant.');
    });
  }

  function init() {
    var bubble = createBubble();
    var win = createChatWindow();
    document.body.appendChild(bubble);
    document.body.appendChild(win);

    document.getElementById('stiamond-close').onclick = toggleChat;
    document.getElementById('stiamond-send').onclick = sendMessage;
    document.getElementById('stiamond-input').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') sendMessage();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
