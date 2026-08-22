import IntlProvider from '@/components/IntlProvider';
import LandingPageContent from '@/components/LandingPageContent';
import deMessages from '@/messages/de.json';

export default function LandingPageDE() {
  return (
    <IntlProvider locale="de" messages={deMessages}>
      <LandingPageContent locale="de" />
    </IntlProvider>
  );
}
