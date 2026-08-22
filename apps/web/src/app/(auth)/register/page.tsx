import IntlProvider from '@/components/IntlProvider';
import RegisterPageContent from '@/components/auth/RegisterPageContent';
import enMessages from '@/messages/en.json';

export default function RegisterPage() {
  return (
    <IntlProvider locale="en" messages={enMessages} timeZone="UTC">
      <RegisterPageContent />
    </IntlProvider>
  );
}
