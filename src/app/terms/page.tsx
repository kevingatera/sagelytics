import { type Metadata } from 'next';
import { LegalPage } from '~/components/legal-page';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The rules for using Sagelytics, including accounts, billing, and limits of liability.',
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        {/* TODO(kevin): legal entity name */}
        These terms govern your use of the Sagelytics service, which is operated by Sagelytics (&quot;we&quot;,
        &quot;us&quot;). By creating an account or using the service, you agree to them. If you do not agree, do not
        use the service.
      </p>

      <h2 className="pt-4 text-xl font-semibold">The service</h2>
      <p>
        Sagelytics helps you find likely competitors from your company domain, monitor prices on competitors&apos;
        public websites, and compare those prices with your products using AI-assisted analysis. Results are
        informational. Competitor data comes from public pages and search results, which can be incomplete, out of date
        or wrong, so check important pricing decisions against the source.
      </p>

      <h2 className="pt-4 text-xl font-semibold">Accounts</h2>
      <p>
        You must give us accurate information and confirm your email address before you can sign in with a password.
        You are responsible for keeping your sign-in details secure and for activity under your account. Tell us
        promptly if you think someone else has access to it.
      </p>

      <h2 className="pt-4 text-xl font-semibold">Acceptable use</h2>
      <p>You agree not to:</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>use the service for any unlawful purpose, or to collect data from sites where doing so would break the law;</li>
        <li>monitor pages or sites you have no right to monitor, or get around access controls on other sites;</li>
        <li>send traffic that overloads or disrupts any website or our systems, or probe, attack or try to break into our systems;</li>
        <li>get around plan limits, rate limits or other restrictions in the service.</li>
      </ul>

      <h2 className="pt-4 text-xl font-semibold">URLs and data you submit</h2>
      <p>
        You are responsible for the URLs, product details and other information you submit. You must have the right to
        ask us to monitor them. We fetch public pages for you on the schedule you set, and we may send them to AI
        providers for analysis.
      </p>

      <h2 className="pt-4 text-xl font-semibold">Plans, billing and cancellation</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          The free plan includes monthly allowances for competitor discoveries and monitored products. A paid Pro plan
          includes higher allowances.
        </li>
        <li>Paid plans are billed through Stripe at the interval shown at checkout. Stripe handles your payment details.</li>
        <li>
          You can change or cancel a paid plan in the billing portal, which you open from the Billing section of Settings.
          Cancelling stops future renewals. Your paid access continues until the end of the period you have already paid
          for.
        </li>
        <li>We may change the free allowance and plan limits. We will post updated terms on this page when we do.</li>
      </ul>

      <h2 className="pt-4 text-xl font-semibold">Third-party services</h2>
      <p>
        Google sign-in, Stripe, and the search, AI and data providers we use are governed by their own terms. We are not
        responsible for third-party sites or services, or for changes to the public pages we read.
      </p>

      <h2 className="pt-4 text-xl font-semibold">No warranty</h2>
      <p>
        The service is provided &quot;as is&quot; and &quot;as available&quot;, without warranties of any kind, express
        or implied, including warranties of accuracy, fitness for a particular purpose, and uninterrupted or error-free
        operation.
      </p>

      <h2 className="pt-4 text-xl font-semibold">Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, we are not liable for indirect, incidental, special or consequential
        losses, including lost profits, revenue or data. Our total liability for any claim is limited to the amount you
        paid us for the service in the twelve months before the claim arose.
      </p>

      <h2 className="pt-4 text-xl font-semibold">Suspension and termination</h2>
      <p>
        You can stop using the service at any time. We may suspend or end accounts that break these terms, and we may
        change or stop the service.
      </p>

      <h2 className="pt-4 text-xl font-semibold">Changes to these terms</h2>
      <p>
        We may update these terms. When we do, we change the date at the top of the page. Continuing to use the service
        after an update means you accept the updated terms.
      </p>

      <h2 className="pt-4 text-xl font-semibold">Governing law</h2>
      <p>
        These terms are governed by the laws of the Province of Ontario and the federal laws of Canada that apply there.
        Disputes go to the courts located in Ontario.
      </p>

      <h2 className="pt-4 text-xl font-semibold">Contact</h2>
      <p>
        Questions about these terms can be sent to{' '}
        <a href="mailto:sagelytics@deployitwith.me" className="text-primary hover:underline">
          sagelytics@deployitwith.me
        </a>
        .
      </p>
    </LegalPage>
  );
}
