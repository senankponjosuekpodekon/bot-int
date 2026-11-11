'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bot, MessageSquare, Users, BookOpen, LayoutDashboard, LogOut, Package, KanbanSquare, BarChart3, Settings, Brain, FileText, Headphones, Code2, Sparkles, ClipboardList, Globe, CreditCard, Crown, Menu, X, Workflow, Store, List } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import BusinessSelector from '@/components/BusinessSelector';
import { useUiLocale } from '@/lib/ui-locale';
import { clsx } from 'clsx';

const nav = [
  { href: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { href: '/dashboard/agents', labelKey: 'nav.agents', icon: Bot },
  { href: '/dashboard/personality', labelKey: 'nav.personality', icon: Sparkles },
  { href: '/dashboard/chat', labelKey: 'nav.chat', icon: MessageSquare },
  { href: '/dashboard/operator', labelKey: 'nav.operator', icon: Headphones },
  { href: '/dashboard/leads', labelKey: 'nav.leads', icon: Users },
  { href: '/dashboard/surveys', labelKey: 'nav.surveys', icon: ClipboardList },
  { href: '/dashboard/pipeline', labelKey: 'nav.pipeline', icon: KanbanSquare },
  { href: '/dashboard/products', labelKey: 'nav.products', icon: Package },
  { href: '/dashboard/quotes', labelKey: 'nav.quotes', icon: FileText },
  { href: '/dashboard/knowledge', labelKey: 'nav.knowledge', icon: BookOpen },
  { href: '/dashboard/analytics', labelKey: 'nav.analytics', icon: BarChart3 },
  { href: '/dashboard/channels', labelKey: 'nav.channels', icon: BarChart3 },
  { href: '/dashboard/intelligence', labelKey: 'nav.intelligence', icon: Brain },
  { href: '/dashboard/memory', labelKey: 'nav.memory', icon: Brain },
  { href: '/dashboard/workflows', labelKey: 'nav.workflows', icon: Workflow },
  { href: '/dashboard/widget', labelKey: 'nav.widget', icon: Code2 },
  { href: '/dashboard/site', labelKey: 'nav.site', icon: Globe },
  { href: '/dashboard/marketplace', labelKey: 'nav.marketplace', icon: Store },
  { href: '/dashboard/flows', labelKey: 'nav.flows', icon: List },
  { href: '/dashboard/billing', labelKey: 'nav.billing', icon: CreditCard },
  { href: '/dashboard/settings', labelKey: 'nav.settings', icon: Settings },
];

const adminNav = [
  { href: '/dashboard/admin', labelKey: 'nav.superAdmin', icon: Crown },
];

function jwtRole(token: string | null): string | null {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload?.role ?? null;
  } catch {
    return null;
  }
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, refreshToken, accessToken } = useAuthStore();
  const { t } = useUiLocale();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isSuperAdmin = jwtRole(accessToken) === 'super_admin';

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (error) {
      console.error('Failed to logout', error);
    } finally {
      logout();
      router.push('/login');
    }
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-lg shadow-md"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={clsx(
          'bg-gray-900 text-white flex flex-col h-screen w-64 fixed top-0 left-0 z-50 transition-transform duration-300 overflow-y-auto',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
      <div className="flex items-center gap-2 p-5 border-b border-gray-800">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-base">Stiamond Agents</span>
      </div>

      <div className="px-4 py-3">
        <BusinessSelector />
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ href, labelKey, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white',
            )}
          >
            <Icon className="w-4 h-4" />
            {t(labelKey)}
          </Link>
        ))}
        {isSuperAdmin && adminNav.map(({ href, labelKey, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-yellow-600 text-white'
                : 'text-yellow-500 hover:bg-gray-800 hover:text-yellow-400',
            )}
          >
            <Icon className="w-4 h-4" />
            {t(labelKey)}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          {t('nav.logout')}
        </button>
      </div>
    </aside>
    </>
  );
}
