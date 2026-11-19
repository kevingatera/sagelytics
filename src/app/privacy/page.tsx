import { type Metadata } from 'next';
import { LegalPage } from '~/components/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'What data Sagelytics collects, how we use it, who we share it with, and your choices.',
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        {/* TODO(kevin): legal entity name */}
        The Sagelytics service is operated by Sagelytics (&quot;we&quot;, &quot;us&quot;). This policy explains what
        personal data we collect when you use the service, why we collect it, who we share it with, and the choices
        you have. Questions go to{' '}
        <a href="mailto:sagelytics@deployitwith.me" className="text-primary hover:underline">
          sagelytics@deployitwith.me
        </a>
        .
      </p>

      <h2 className="pt-4 text-xl font-semibold">What we collect</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>Account details.</strong> Your name and email address. If you register with a password, we store a
          bcrypt hash of it, never the password itself.
        </li>
        <li>
          <strong>Google sign-in.</strong> If you sign in with Google, we receive your name, email address and profile
          picture from Google. We also store the link between your Sagelytics account and your Google account, including
          the tokens Google issues for that sign-in.
        </li>
        <li>
          <strong>Business details.</strong> The company domain, optional product catalog URL, business type and
          competitor domains you enter during onboarding.
        </li>
        <li>
          <strong>Products you add.</strong> Product names, SKUs, prices, categories and descriptions you enter.
        </li>
        <li>
          <strong>Monitoring setup.</strong> The competitor and product URLs you add, how often we check them, and your
          alert and notification settings.
        </li>
        <li>
          <strong>Public web data.</strong> Pages and search results we read from public websites, and what we extract
          from them, such as competitor product names and listed prices. Public facts about a competitor are stored
          separately from your private analysis of that competitor.
        </li>
        <li>
          <strong>Price history and alerts.</strong> Prices we recorded over time, the price alerts you set, and a log
          of the notification emails we sent you.
        </li>
        <li>
          <strong>Usage records.</strong> A record of each metered action, such as a competitor discovery run, used to
          apply your plan limits.
        </li>
        <li>
          <strong>Billing.</strong> Stripe customer and subscription IDs, your subscription status, your plan, and
          billing period dates. We do not receive or store your card number; Stripe handles payment details.
        </li>
        <li>
          <strong>Sign-in protection.</strong> Your IP address is used to limit repeated sign-in and password attempts.
        </li>
      </ul>

      <h2 className="pt-4 text-xl font-semibold">How we use your data</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>To run the service: find competitors, check the pages you asked us to monitor, and show prices and analysis in your dashboard.</li>
        <li>To run AI analysis that matches competitor products to yours and summarizes what we find.</li>
        <li>To send account emails, such as email confirmation and password reset, and the price alerts you turned on.</li>
        <li>To process subscriptions and apply plan limits.</li>
        <li>To keep accounts secure and prevent abuse.</li>
      </ul>

      <h2 className="pt-4 text-xl font-semibold">Who we share it with</h2>
      <p>We share data only with the service providers we need to run Sagelytics:</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>Stripe</strong> for payments and subscription management.
        </li>
        <li>
          <strong>Purelymail</strong> for transactional email, such as confirmation and password reset emails and price
          alerts.
        </li>
        <li>
          <strong>Third-party AI model providers</strong> that analyze the page content and product details we send them.
        </li>
        <li>
          <strong>Search and data providers</strong> that return search results for competitor discovery, using queries
          based on your company domain and the competitors being looked up.
        </li>
        <li>
          <strong>Hosting and infrastructure providers</strong> that run our application, database and cache.
        </li>
      </ul>
      <p>
        When you sign in with Google, Google receives that sign-in request. We do not sell your personal data or use it
        for advertising.
      </p>

      <h2 className="pt-4 text-xl font-semibold">Cookies and local storage</h2>
      <p>
        We use cookies only for sign-in: a session cookie that keeps you signed in, and short-lived cookies used while
        you sign in. We also set a cookie that remembers whether the dashboard sidebar is open. Your light or dark theme
        choice is stored in your browser&apos;s local storage. We do not use advertising or tracking cookies, and the
        site does not load analytics scripts.
      </p>

      <h2 className="pt-4 text-xl font-semibold">How long we keep data</h2>
      <p>
        We keep your account data, and the monitoring data tied to it, for as long as your account exists. When you ask
        us to delete your account, we delete the data tied to it, except records we must keep for legal or accounting
        reasons. Billing records held by Stripe follow Stripe&apos;s retention rules.
      </p>

      <h2 className="pt-4 text-xl font-semibold">Your choices</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>Access and export.</strong> Download a copy of your data from the Data page in Settings.
        </li>
        <li>
          <strong>Correct your details.</strong> Change your name and profile picture in Settings. To change your email
          address, contact us.
        </li>
        <li>
          <strong>Reset onboarding.</strong> Settings lets you reset onboarding. This removes your products, monitoring
          tasks, alerts, notification history, competitor links and analysis. It does not close your account or change
          your billing.
        </li>
        <li>
          <strong>Turn off emails.</strong> Choose which notification emails you receive in Settings under Notifications.
        </li>
        <li>
          <strong>Delete your account.</strong> Email{' '}
          <a href="mailto:sagelytics@deployitwith.me" className="text-primary hover:underline">
            sagelytics@deployitwith.me
          </a>{' '}
          from the address on your account. There is no self-service account deletion yet.
        </li>
      </ul>

      <h2 className="pt-4 text-xl font-semibold">Security</h2>
      <p>
        We hash passwords with bcrypt, limit repeated sign-in and password attempts, require email confirmation before
        a password sign-in works, and scope your data to your account. No online service can be guaranteed secure. If
        you think your account has been compromised, contact us right away.
      </p>

      <h2 className="pt-4 text-xl font-semibold">Changes to this policy</h2>
      <p>
        When we change this policy, we post the new version here and update the date at the top of the page.
      </p>

      <h2 className="pt-4 text-xl font-semibold">Contact</h2>
      <p>
        For privacy questions or requests, email{' '}
        <a href="mailto:sagelytics@deployitwith.me" className="text-primary hover:underline">
          sagelytics@deployitwith.me
        </a>
        .
      </p>
    </LegalPage>
  );
}
