import LegalPageLayout from '@/components/LegalPageLayout'

export const dynamic = 'force-dynamic'

const LAST_UPDATED = '25 February 2025'

export const metadata = {
  title: 'Privacy Policy - FiBi',
  description: 'FiBi privacy policy: how we collect, use and protect your data.',
}

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">Who we are</h2>
        <p>
          FiBi (&quot;we&quot;, &quot;us&quot;) is the data controller for the FiBi service at fibi.world. We save and organise travel places you find on social media so you don&apos;t lose them.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">What data we collect</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Account data:</strong> email address and password (hashed).</li>
          <li><strong>Usage data:</strong> saved places, itineraries (trips), shared links, comments, and any content you add (names, notes, links, screenshots).</li>
          <li><strong>Technical data:</strong> we use authentication cookies to keep you logged in. We use Supabase for hosting and authentication, and Resend for sending emails (e.g. welcome, password reset, product updates).</li>
          <li><strong>Optional features:</strong> if you use AI-enriched details or image proxy for saved items, we process those requests to provide the service.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">How we use your data</h2>
        <p>
          We use your data to provide the FiBi service (saving and organising places, sharing itineraries, calendar and map views), to send you account-related and product emails (including optional updates you can unsubscribe from), and to maintain security and prevent abuse.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">Lawful basis and retention</h2>
        <p>
          We process your data on the basis of performing our contract with you and, where relevant, our legitimate interests (e.g. improving the service, security). We retain your data for as long as your account is active and as needed to comply with legal obligations. You can delete your account and request deletion of your data (see Your rights below).
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">Sharing your data</h2>
        <p>
          We use Supabase (hosting and database) and Resend (email). We do not sell your personal data. We may disclose data if required by law or to protect our rights and safety.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">Cookies and local storage</h2>
        <p>
          We use cookies for authentication (e.g. keeping you logged in). We also use your browser&apos;s local storage and session storage for preferences that make the app work better for you (e.g. remembering which trip is selected in the calendar, or that you&apos;ve seen the sharing tutorial). We do not use third-party advertising or analytics cookies. You can control cookies via your browser settings.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">Your rights</h2>
        <p>
          Depending on where you live, you may have the right to access, correct, delete, or export your data, and to object to or restrict certain processing. You can use your account settings to manage your data where possible. To exercise your rights or ask questions, contact us (see Contact below). If you are in the UK or EEA, you have the right to complain to your data protection supervisor (e.g. the ICO in the UK).
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">International transfers</h2>
        <p>
          Our service providers may process data in countries outside your own. We ensure appropriate safeguards (e.g. standard contractual clauses) where required by law.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">Changes and contact</h2>
        <p>
          We may update this policy from time to time. We will post the updated version on this page and update the &quot;Last updated&quot; date. For privacy-related questions or to exercise your rights, contact us at{' '}
          <a href="mailto:hello@fibi.world" className="text-[#2563eb] underline hover:no-underline">
            hello@fibi.world
          </a>.
        </p>
      </section>
    </LegalPageLayout>
  )
}
