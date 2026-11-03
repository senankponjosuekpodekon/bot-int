'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import { integrationsApi } from '@/lib/api';
import { toast } from 'sonner';

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

// Meta Embedded Signup: opens the hosted onboarding flow in a popup, the
// tenant picks its WABA + phone number, Meta returns an OAuth code that the
// API exchanges for a permanent-scoped access token.
export default function WhatsAppConnectButton({ onDone }: { onDone?: () => void }) {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const configId = process.env.NEXT_PUBLIC_META_EMBEDDED_CONFIG_ID;
  const [loading, setLoading] = useState(false);
  const sessionInfo = useRef<{ phone_number_id?: string; waba_id?: string }>({});

  useEffect(() => {
    if (!appId || !configId) return;
    if (window.FB) return;
    window.fbAsyncInit = () => {
      window.FB.init({ appId, cookie: true, xfbml: true, version: 'v21.0' });
      // Embedded signup posts session info (waba_id, phone_number_id) here.
      window.FB.Event.subscribe('messaging_window', (event: any) => {
        const data = event?.data || event;
        if (data?.phone_number_id) sessionInfo.current.phone_number_id = data.phone_number_id;
        if (data?.waba_id) sessionInfo.current.waba_id = data.waba_id;
      });
    };
    const s = document.createElement('script');
    s.src = 'https://connect.facebook.net/en_US/sdk.js';
    s.async = true;
    document.body.appendChild(s);
  }, [appId, configId]);

  if (!appId || !configId) return null;

  const launch = () => {
    if (!window.FB) {
      toast.error('SDK Meta pas encore chargé, réessayez');
      return;
    }
    setLoading(true);
    sessionInfo.current = {};
    window.FB.login(
      async (response: any) => {
        const code = response?.authResponse?.code;
        if (!code) {
          setLoading(false);
          return;
        }
        try {
          await integrationsApi.whatsappEmbeddedSignup({
            code,
            phoneNumberId: sessionInfo.current.phone_number_id,
            wabaId: sessionInfo.current.waba_id,
          });
          toast.success('WhatsApp connecté — configurez le webhook avec l\'URL affichée');
          onDone?.();
        } catch {
          toast.error('Échec de la connexion WhatsApp');
        } finally {
          setLoading(false);
        }
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, featureType: '', sessionInfoVersion: '3' },
      } as any,
    );
  };

  return (
    <button
      onClick={launch}
      disabled={loading}
      className="btn-primary text-sm flex items-center gap-2 w-full justify-center"
      style={{ backgroundColor: '#25D366' }}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
      Connecter WhatsApp (onboarding Meta)
    </button>
  );
}
