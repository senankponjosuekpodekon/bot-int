import IntlProvider from '@/components/IntlProvider';
import LandingPageContent from '@/components/LandingPageContent';
import frMessages from '@/messages/fr.json';

export default function LandingPageFR() {
  return (
    <IntlProvider locale="fr" messages={frMessages}>
      <LandingPageContent locale="fr" />
    </IntlProvider>
  );
}
