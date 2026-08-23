'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Bot } from 'lucide-react';

const LANGUAGES = [
  { value: 'fr', label: 'Français' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'ar', label: 'العربية' },
];

const TIMEZONES = [
  'UTC', 'Europe/Paris', 'Europe/Berlin', 'Europe/London',
  'America/New_York', 'America/Los_Angeles', 'America/Toronto',
  'America/Sao_Paulo', 'Asia/Dubai', 'Asia/Tokyo', 'Asia/Singapore',
  'Asia/Shanghai', 'Australia/Sydney', 'Africa/Lagos',
];

export default function RegisterPageContent() {
  const router = useRouter();
  const t = useTranslations('auth.register');
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ companyName: '', name: '', email: '', password: '', language: '', timezone: '', location: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const browserLang = typeof navigator !== 'undefined' ? navigator.language?.split('-')[0] : '';
    const browserTz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
    const initialLang = LANGUAGES.some((l) => l.value === browserLang) ? browserLang : 'fr';
    const initialTz = TIMEZONES.includes(browserTz) ? browserTz : 'UTC';
    setForm((f) => ({ ...f, language: initialLang, timezone: initialTz }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.register(form);
      setAuth({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        userId: data.userId,
        tenantId: data.tenantId,
      });
      router.push('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">Stiamond Agents</span>
        </div>

        <div className="card p-4 lg:p-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{t('title')}</h1>
          <p className="text-gray-500 text-sm mb-6">{t('subtitle')}</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">{t('company')}</label>
              <input
                type="text"
                name="companyName"
                className="input"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                placeholder="Acme Inc."
                required
              />
            </div>
            <div>
              <label className="label">{t('name')}</label>
              <input
                type="text"
                name="name"
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="label">{t('email')}</label>
              <input
                type="email"
                name="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@company.com"
                required
              />
            </div>
            <div>
              <label className="label">{t('password')}</label>
              <input
                type="password"
                name="password"
                className="input"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="********"
                minLength={8}
                required
              />
            </div>

            <div className="border-t pt-4 mt-2">
              <h2 className="text-sm font-medium text-gray-900 mb-3">Préférences</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Langue</label>
                  <select
                    className="input"
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                    required
                  >
                    {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Fuseau horaire (GMT)</label>
                  <select
                    className="input"
                    value={form.timezone}
                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                    required
                  >
                    {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="label">Localité</label>
                <input
                  type="text"
                  name="location"
                  className="input"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="France, Paris"
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? t('loading') : t('submit')}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            {t('hasAccount')}{' '}
            <Link href="/login" className="text-primary-600 font-medium hover:underline">
              {t('signin')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
