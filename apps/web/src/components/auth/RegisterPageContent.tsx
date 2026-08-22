'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { Bot } from 'lucide-react';

export default function RegisterPageContent() {
  const router = useRouter();
  const t = useTranslations('auth.register');
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ companyName: '', name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

        <div className="card p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('title')}</h1>
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
