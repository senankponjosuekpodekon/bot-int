import IntlProvider from '@/components/IntlProvider';
import LandingPageContent from '@/components/LandingPageContent';
import enMessages from '@/messages/en.json';

export default function LandingPage() {
  return (
    <IntlProvider locale="en" messages={enMessages}>
      <LandingPageContent locale="en" />
    </IntlProvider>
  );
}
