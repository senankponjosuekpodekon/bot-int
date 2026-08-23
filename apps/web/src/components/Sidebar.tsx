'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bot, MessageSquare, Users, BookOpen, LayoutDashboard, LogOut, Package, KanbanSquare, BarChart3, Settings, Brain, FileText, Headphones, Code2, Sparkles, ClipboardList, Globe, CreditCard, Crown, Menu, X, Workflow } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { clsx } from 'clsx';

const nav = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/dashboard/agents', label: 'Agents', icon: Bot },
  { href: '/dashboard/personality', label: 'Personnalité', icon: Sparkles },
  { href: '/dashboard/chat', label: 'Conversations', icon: MessageSquare },
  { href: '/dashboard/operator', label: 'Opérateur', icon: Headphones },
  { href: '/dashboard/leads', label: 'Leads', icon: Users },
  { href: '/dashboard/surveys', label: 'Sondages', icon: ClipboardList },
  { href: '/dashboard/pipeline', label: 'Pipeline CRM', icon: KanbanSquare },
  { href: '/dashboard/products', label: 'Produits', icon: Package },
  { href: '/dashboard/quotes', label: 'Devis', icon: FileText },
  { href: '/dashboard/knowledge', label: 'Base de connaissances', icon: BookOpen },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/dashboard/channels', label: 'Channels', icon: BarChart3 },
  { href: '/dashboard/intelligence', label: 'Intelligence', icon: Brain },
  { href: '/dashboard/memory', label: 'Mémoire Agent', icon: Brain },
  { href: '/dashboard/workflows', label: 'Workflows', icon: Workflow },
  { href: '/dashboard/widget', label: 'Widget & Intégration', icon: Code2 },
  { href: '/dashboard/site', label: 'Site & Landing', icon: Globe },
  { href: '/dashboard/billing', label: 'Facturation', icon: CreditCard },
  { href: '/dashboard/settings', label: 'Paramètres', icon: Settings },
];

const adminNav = [
  { href: '/dashboard/admin', label: 'Super Admin', icon: Crown },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, refreshToken } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

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
          'bg-gray-900 text-white flex flex-col min-h-screen w-64 fixed lg:static z-50 transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
      <div className="flex items-center gap-2 p-5 border-b border-gray-800">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-base">Stiamond Agents</span>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => (
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
            {label}
          </Link>
        ))}
        {adminNav.map(({ href, label, icon: Icon }) => (
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
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white w-full transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </aside>
    </>
  );
}
