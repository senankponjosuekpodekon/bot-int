'use client';
import { useQuery } from '@tanstack/react-query';
import { tenantApi } from '@/lib/api';

export type UiLocale = 'fr' | 'en';

type Dict = Record<string, string>;

const fr: Dict = {
  'nav.dashboard': 'Tableau de bord',
  'nav.agents': 'Agents',
  'nav.personality': 'Personnalité',
  'nav.chat': 'Conversations',
  'nav.operator': 'Opérateur',
  'nav.leads': 'Leads',
  'nav.surveys': 'Sondages',
  'nav.pipeline': 'Pipeline CRM',
  'nav.products': 'Produits',
  'nav.quotes': 'Devis',
  'nav.knowledge': 'Base de connaissances',
  'nav.analytics': 'Analytics',
  'nav.channels': 'Channels',
  'nav.intelligence': 'Intelligence',
  'nav.memory': 'Mémoire Agent',
  'nav.workflows': 'Workflows',
  'nav.widget': 'Widget & Intégration',
  'nav.site': 'Site & Landing',
  'nav.marketplace': 'Marketplace',
  'nav.flows': 'Flux',
  'nav.billing': 'Facturation',
  'nav.settings': 'Paramètres',
  'nav.superAdmin': 'Super Admin',
  'nav.logout': 'Déconnexion',
};

const en: Dict = {
  'nav.dashboard': 'Dashboard',
  'nav.agents': 'Agents',
  'nav.personality': 'Personality',
  'nav.chat': 'Conversations',
  'nav.operator': 'Operator',
  'nav.leads': 'Leads',
  'nav.surveys': 'Surveys',
  'nav.pipeline': 'CRM Pipeline',
  'nav.products': 'Products',
  'nav.quotes': 'Quotes',
  'nav.knowledge': 'Knowledge base',
  'nav.analytics': 'Analytics',
  'nav.channels': 'Channels',
  'nav.intelligence': 'Intelligence',
  'nav.memory': 'Agent Memory',
  'nav.workflows': 'Workflows',
  'nav.widget': 'Widget & Integration',
  'nav.site': 'Site & Landing',
  'nav.marketplace': 'Marketplace',
  'nav.flows': 'Flows',
  'nav.billing': 'Billing',
  'nav.settings': 'Settings',
  'nav.superAdmin': 'Super Admin',
  'nav.logout': 'Sign out',
};

const dicts: Record<UiLocale, Dict> = { fr, en };

export function useUiLocale(): { locale: UiLocale; t: (key: string) => string } {
  const { data } = useQuery({
    queryKey: ['tenant', 'me'],
    queryFn: () => tenantApi.me().then((r) => r.data ?? r),
    staleTime: 60_000,
  });
  const lang = String(data?.language || 'fr').toLowerCase();
  const locale: UiLocale = lang === 'en' ? 'en' : 'fr';
  return { locale, t: (key) => dicts[locale][key] ?? dicts.fr[key] ?? key };
}
