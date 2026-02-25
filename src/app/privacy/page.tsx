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
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">GDPR and this privacy statement</h2>
        <p>
          If you are in the United Kingdom or the European Economic Area, the UK GDPR and the EU General Data Protection Regulation (GDPR) apply. This privacy statement explains how we collect, use, store and protect your personal data and what rights you have. We process your data only where we have a lawful basis and in line with applicable data protection law.
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
          We use your data to provide the FiBi service (saving and organising places, sharing itineraries, calendar and map views), to send you account-related emails (e.g. password reset, email confirmation) and, if you have opted in, product updates and tips (you can withdraw this at any time). We also use data to maintain security and prevent abuse.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">Lawful basis (GDPR Art. 6)</h2>
        <p className="mb-2">We process your personal data only where we have a lawful basis:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Contract (Art. 6(1)(b)):</strong> account creation, providing the service, account-related emails (e.g. confirmation, password reset).</li>
          <li><strong>Legitimate interests (Art. 6(1)(f)):</strong> security, preventing abuse, improving the service, necessary technical processing (e.g. cookies for login).</li>
          <li><strong>Consent (Art. 6(1)(a)):</strong> marketing and product-update emails. You give consent when you tick the optional box at signup; you can withdraw it anytime (e.g. via unsubscribe or by contacting us).</li>
        </ul>
        <p className="mt-3">
          We retain your data for as long as your account is active and as long as needed to comply with legal obligations. After account deletion, we remove or anonymise your data within a reasonable period except where we must keep it for law or disputes.
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
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">Your rights (GDPR)</h2>
        <p className="mb-2">If UK/EEA GDPR applies to you, you have the following rights in relation to your personal data:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Right of access (Art. 15):</strong> request a copy of the personal data we hold about you.</li>
          <li><strong>Right to rectification (Art. 16):</strong> request correction of inaccurate or incomplete data.</li>
          <li><strong>Right to erasure (Art. 17):</strong> request deletion of your data in certain circumstances.</li>
          <li><strong>Right to restrict processing (Art. 18):</strong> request that we limit how we use your data in certain cases.</li>
          <li><strong>Right to data portability (Art. 20):</strong> receive your data in a structured, machine-readable format where applicable.</li>
          <li><strong>Right to object (Art. 21):</strong> object to processing based on legitimate interests; we will stop unless we have compelling grounds to continue.</li>
          <li><strong>Right to withdraw consent:</strong> where we rely on consent (e.g. marketing emails), you may withdraw it at any time without affecting the lawfulness of processing before withdrawal. Use the unsubscribe link in emails or contact us.</li>
          <li><strong>Right to complain:</strong> you may lodge a complaint with a supervisory authority (e.g. the ICO in the UK, or your local data protection authority in the EEA).</li>
        </ul>
        <p className="mt-3">
          To exercise any of these rights or ask questions, contact us at the address below. We will respond within the time required by law (usually one month).
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">International transfers</h2>
        <p>
          Our service providers may process data in countries outside your own. We ensure appropriate safeguards (e.g. standard contractual clauses) where required by law.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">Changes to this policy</h2>
        <p>
          We may update this policy from time to time. We will post the updated version on this page and update the &quot;Last updated&quot; date. For material changes we may notify you by email or a notice in the app where required by law.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">Contact and data protection</h2>
        <p>
          For privacy-related questions, to exercise your rights, or to contact us in relation to data protection (including as data controller under GDPR), email us at{' '}
          <a href="mailto:hello@fibi.world" className="text-[#2563eb] underline hover:no-underline">
            hello@fibi.world
          </a>. We will respond as required by applicable law.
        </p>
      </section>
    </LegalPageLayout>
  )
}
