'use client';
import { useState, useEffect } from 'react';
import { CreditCard, Calendar, Mail, Save, Check, X, ExternalLink, MessageCircle, Send, Smartphone } from 'lucide-react';
import { integrationsApi } from '@/lib/api';

interface Integration {
  id: string;
  type: string;
  enabled: boolean;
  config: Record<string, any>;
}

export default function SettingsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [stripeForm, setStripeForm] = useState({ secretKey: '', publishableKey: '' });
  const [calendlyForm, setCalendlyForm] = useState({ accessToken: '' });
  const [emailForm, setEmailForm] = useState({ provider: 'resend', apiKey: '', fromEmail: '', fromName: '' });
  const [whatsappForm, setWhatsappForm] = useState({ phoneNumberId: '', accessToken: '', verifyToken: '' });
  const [telegramForm, setTelegramForm] = useState({ botToken: '' });
  const [twilioForm, setTwilioForm] = useState({ accountSid: '', authToken: '', fromNumber: '' });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await integrationsApi.list();
      setIntegrations(data);
      const stripe = data.find((i: Integration) => i.type === 'stripe');
      if (stripe) setStripeForm({ secretKey: stripe.config.secretKey || '', publishableKey: stripe.config.publishableKey || '' });
      const calendly = data.find((i: Integration) => i.type === 'calendly');
      if (calendly) setCalendlyForm({ accessToken: calendly.config.accessToken || '' });
      const email = data.find((i: Integration) => i.type === 'email');
      if (email) setEmailForm({ provider: email.config.provider || 'resend', apiKey: email.config.apiKey || '', fromEmail: email.config.fromEmail || '', fromName: email.config.fromName || '' });
      const whatsapp = data.find((i: Integration) => i.type === 'whatsapp');
      if (whatsapp) setWhatsappForm({ phoneNumberId: whatsapp.config.phoneNumberId || '', accessToken: whatsapp.config.accessToken || '', verifyToken: whatsapp.config.verifyToken || '' });
      const telegram = data.find((i: Integration) => i.type === 'telegram');
      if (telegram) setTelegramForm({ botToken: telegram.config.botToken || '' });
      const twilio = data.find((i: Integration) => i.type === 'twilio');
      if (twilio) setTwilioForm({ accountSid: twilio.config.accountSid || '', authToken: twilio.config.authToken || '', fromNumber: twilio.config.fromNumber || '' });
    } catch {
      showToast('Erreur lors du chargement', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveStripe = async () => {
    try {
      await integrationsApi.upsert('stripe', stripeForm);
      showToast('Stripe configuré');
      load();
    } catch { showToast('Erreur', 'error'); }
  };

  const saveCalendly = async () => {
    try {
      await integrationsApi.upsert('calendly', calendlyForm);
      showToast('Calendly configuré');
      load();
    } catch { showToast('Erreur', 'error'); }
  };

  const saveEmail = async () => {
    try {
      await integrationsApi.upsert('email', emailForm);
      showToast('Email configuré');
      load();
    } catch { showToast('Erreur', 'error'); }
  };

  const saveWhatsapp = async () => {
    try {
      await integrationsApi.upsert('whatsapp', whatsappForm);
      showToast('WhatsApp configuré');
      load();
    } catch { showToast('Erreur', 'error'); }
  };

  const saveTelegram = async () => {
    try {
      await integrationsApi.upsert('telegram', telegramForm);
      showToast('Telegram configuré');
      load();
    } catch { showToast('Erreur', 'error'); }
  };

  const saveTwilio = async () => {
    try {
      await integrationsApi.upsert('twilio', twilioForm);
      showToast('SMS (Twilio) configuré');
      load();
    } catch { showToast('Erreur', 'error'); }
  };

  const toggleIntegration = async (type: string, enabled: boolean) => {
    try {
      await integrationsApi.toggle(type, enabled);
      load();
    } catch { showToast('Erreur', 'error'); }
  };

  const isEnabled = (type: string) => integrations.find((i) => i.type === type)?.enabled ?? false;

  if (loading) return <div className="p-4 lg:p-6 text-center text-gray-500">Chargement...</div>;

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Connecteurs</h1>

      <div className="space-y-6">
        {/* Stripe */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center"><CreditCard className="w-5 h-5 text-indigo-600" /></div>
              <div>
                <h2 className="font-semibold text-gray-900">Stripe</h2>
                <p className="text-xs text-gray-500">Paiements en ligne — l'agent génère des liens de paiement</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={isEnabled('stripe')} onChange={(e) => toggleIntegration('stripe', e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600" />
            </label>
          </div>
          <div className="space-y-3">
            <div><label className="text-sm font-medium text-gray-700">Secret Key</label><input type="password" value={stripeForm.secretKey} onChange={(e) => setStripeForm({ ...stripeForm, secretKey: e.target.value })} placeholder="sk_live_..." className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Publishable Key</label><input value={stripeForm.publishableKey} onChange={(e) => setStripeForm({ ...stripeForm, publishableKey: e.target.value })} placeholder="pk_live_..." className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
            <button onClick={saveStripe} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"><Save className="w-4 h-4" /> Sauvegarder</button>
          </div>
        </div>

        {/* Calendly */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Calendar className="w-5 h-5 text-blue-600" /></div>
              <div>
                <h2 className="font-semibold text-gray-900">Calendly</h2>
                <p className="text-xs text-gray-500">Prise de rendez-vous — l'agent propose des créneaux</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={isEnabled('calendly')} onChange={(e) => toggleIntegration('calendly', e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>
          <div className="space-y-3">
            <div><label className="text-sm font-medium text-gray-700">Personal Access Token</label><input type="password" value={calendlyForm.accessToken} onChange={(e) => setCalendlyForm({ ...calendlyForm, accessToken: e.target.value })} placeholder="Calendly PAT..." className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
            <a href="https://calendly.com/integrations/api_webhooks" target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">Obtenir un token <ExternalLink className="w-3 h-3" /></a>
            <button onClick={saveCalendly} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"><Save className="w-4 h-4" /> Sauvegarder</button>
          </div>
        </div>

        {/* Email */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><Mail className="w-5 h-5 text-green-600" /></div>
              <div>
                <h2 className="font-semibold text-gray-900">Email transactionnel</h2>
                <p className="text-xs text-gray-500">Envoi d'emails — Resend ou SendGrid</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={isEnabled('email')} onChange={(e) => toggleIntegration('email', e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600" />
            </label>
          </div>
          <div className="space-y-3">
            <div><label className="text-sm font-medium text-gray-700">Fournisseur</label><select value={emailForm.provider} onChange={(e) => setEmailForm({ ...emailForm, provider: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm"><option value="resend">Resend</option><option value="sendgrid">SendGrid</option></select></div>
            <div><label className="text-sm font-medium text-gray-700">API Key</label><input type="password" value={emailForm.apiKey} onChange={(e) => setEmailForm({ ...emailForm, apiKey: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-sm font-medium text-gray-700">Email expéditeur</label><input value={emailForm.fromEmail} onChange={(e) => setEmailForm({ ...emailForm, fromEmail: e.target.value })} placeholder="noreply@example.com" className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
              <div><label className="text-sm font-medium text-gray-700">Nom expéditeur</label><input value={emailForm.fromName} onChange={(e) => setEmailForm({ ...emailForm, fromName: e.target.value })} placeholder="Mon Entreprise" className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
            </div>
            <button onClick={saveEmail} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"><Save className="w-4 h-4" /> Sauvegarder</button>
          </div>
        </div>

        {/* WhatsApp */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center"><MessageCircle className="w-5 h-5 text-green-600" /></div>
              <div>
                <h2 className="font-semibold text-gray-900">WhatsApp Business</h2>
                <p className="text-xs text-gray-500">Envoyer des messages via WhatsApp Business API</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={isEnabled('whatsapp')} onChange={(e) => toggleIntegration('whatsapp', e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600" />
            </label>
          </div>
          <div className="space-y-3">
            <div><label className="text-sm font-medium text-gray-700">Phone Number ID</label><input value={whatsappForm.phoneNumberId} onChange={(e) => setWhatsappForm({ ...whatsappForm, phoneNumberId: e.target.value })} placeholder="123456789" className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Access Token</label><input type="password" value={whatsappForm.accessToken} onChange={(e) => setWhatsappForm({ ...whatsappForm, accessToken: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Webhook Verify Token</label><input value={whatsappForm.verifyToken} onChange={(e) => setWhatsappForm({ ...whatsappForm, verifyToken: e.target.value })} placeholder="my_verify_token" className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
            <a href="https://developers.facebook.com/docs/whatsapp" target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-green-600 hover:underline">Documentation WhatsApp API <ExternalLink className="w-3 h-3" /></a>
            <button onClick={saveWhatsapp} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"><Save className="w-4 h-4" /> Sauvegarder</button>
          </div>
        </div>

        {/* Telegram */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Send className="w-5 h-5 text-blue-600" /></div>
              <div>
                <h2 className="font-semibold text-gray-900">Telegram</h2>
                <p className="text-xs text-gray-500">Bot Telegram pour envoi de messages</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={isEnabled('telegram')} onChange={(e) => toggleIntegration('telegram', e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
            </label>
          </div>
          <div className="space-y-3">
            <div><label className="text-sm font-medium text-gray-700">Bot Token</label><input type="password" value={telegramForm.botToken} onChange={(e) => setTelegramForm({ ...telegramForm, botToken: e.target.value })} placeholder="123456:ABC-DEF..." className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
            <a href="https://t.me/botfather" target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">Créer un bot via @BotFather <ExternalLink className="w-3 h-3" /></a>
            <button onClick={saveTelegram} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"><Save className="w-4 h-4" /> Sauvegarder</button>
          </div>
        </div>

        {/* Twilio SMS */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><Smartphone className="w-5 h-5 text-red-600" /></div>
              <div>
                <h2 className="font-semibold text-gray-900">SMS (Twilio)</h2>
                <p className="text-xs text-gray-500">Envoi de SMS via Twilio</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={isEnabled('twilio')} onChange={(e) => toggleIntegration('twilio', e.target.checked)} className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-red-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600" />
            </label>
          </div>
          <div className="space-y-3">
            <div><label className="text-sm font-medium text-gray-700">Account SID</label><input value={twilioForm.accountSid} onChange={(e) => setTwilioForm({ ...twilioForm, accountSid: e.target.value })} placeholder="ACxxx..." className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Auth Token</label><input type="password" value={twilioForm.authToken} onChange={(e) => setTwilioForm({ ...twilioForm, authToken: e.target.value })} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
            <div><label className="text-sm font-medium text-gray-700">Numéro expéditeur</label><input value={twilioForm.fromNumber} onChange={(e) => setTwilioForm({ ...twilioForm, fromNumber: e.target.value })} placeholder="+33612345678" className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-300 text-sm" /></div>
            <a href="https://www.twilio.com/console" target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline">Console Twilio <ExternalLink className="w-3 h-3" /></a>
            <button onClick={saveTwilio} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700"><Save className="w-4 h-4" /> Sauvegarder</button>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-2.5 rounded-lg text-sm font-medium text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{toast.msg}</div>
      )}
    </div>
  );
}
