import IntlProvider from '@/components/IntlProvider';
import LoginPageContent from '@/components/auth/LoginPageContent';
import enMessages from '@/messages/en.json';

export default function LoginPage() {
  return (
    <IntlProvider locale="en" messages={enMessages} timeZone="UTC">
      <LoginPageContent />
    </IntlProvider>
  );
}
