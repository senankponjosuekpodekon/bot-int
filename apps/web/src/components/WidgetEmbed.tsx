'use client';

import { useEffect } from 'react';

export default function WidgetEmbed() {
  const agentId = process.env.NEXT_PUBLIC_WIDGET_AGENT_ID;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!agentId || !apiUrl) {
    return null;
  }

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const selector = `script[data-agent="${agentId}"]`;
    if (document.querySelector(selector)) {
      return;
    }

    const script = document.createElement('script');
    script.src = `${apiUrl}/widget/embed.js`;
    script.async = true;
    script.setAttribute('data-agent', agentId);
    script.setAttribute('data-color', '#4f46e5');
    script.setAttribute('data-title', 'Chat IA');
    script.setAttribute('data-position', 'bottom-right');
    script.setAttribute('data-api', apiUrl);

    document.body.appendChild(script);
  }, [agentId, apiUrl]);

  return null;
}
