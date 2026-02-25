import LegalPageLayout from '@/components/LegalPageLayout'

export const dynamic = 'force-dynamic'

const LAST_UPDATED = '25 February 2025'

export const metadata = {
  title: 'Terms and Conditions - FiBi',
  description: 'FiBi terms of service: rules for using the FiBi app.',
}

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms and Conditions" lastUpdated={LAST_UPDATED}>
      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">Acceptance</h2>
        <p>
          By signing up for or using FiBi, you agree to these Terms and Conditions (Terms of Service). If you do not agree, do not use the service.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">Who can use FiBi</h2>
        <p>
          You must be at least 13 years old (or the minimum age in your country to consent to use online services) and have the authority to enter into these terms. If you use FiBi on behalf of an organisation, you represent that you have that authority.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">Description of the service</h2>
        <p>
          FiBi lets you save and organise travel places you find on social media (e.g. Instagram, TikTok, YouTube), create itineraries, share them with others, and view them on a map or calendar. We may change or discontinue features with reasonable notice where possible.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">Your account and acceptable use</h2>
        <p>
          You are responsible for keeping your account credentials secure and for all activity under your account. You must not use FiBi to break any law, infringe others&apos; rights, distribute harmful or illegal content, or abuse the service (e.g. spam, scraping, circumventing access controls). We may suspend or terminate accounts that violate these terms.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">Your content and our licence</h2>
        <p>
          You keep ownership of the content you add (places, notes, images you upload). By using FiBi, you grant us a licence to use, store, and display that content as needed to provide and improve the service (e.g. showing your itineraries to you and to people you share with). You must only add content you have the right to use; do not upload material that infringes copyright or others&apos; rights.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">Disclaimers</h2>
        <p>
          FiBi is provided &quot;as is&quot;. We do not guarantee that the service will be uninterrupted or error-free. Travel information and third-party content (e.g. from social platforms) may be inaccurate or out of date. Use your own judgment when making travel decisions.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">Limitation of liability</h2>
        <p>
          To the fullest extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of FiBi. Our total liability for any claims related to the service is limited to the amount you paid us in the twelve months before the claim (or, if nothing was paid, to zero).
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">Termination</h2>
        <p>
          You may stop using FiBi and delete your account at any time. We may suspend or terminate your access if you breach these terms or for other operational or legal reasons, with notice where reasonable.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">Changes and governing law</h2>
        <p>
          We may update these terms. We will post the updated version on this page and update the &quot;Last updated&quot; date. Continued use of FiBi after changes means you accept the new terms. These terms are governed by the laws of England and Wales (or the jurisdiction of your residence, if we agree). Any disputes are subject to the exclusive jurisdiction of the courts of England and Wales unless otherwise required by law.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-[#171717] mt-4 mb-2">Contact</h2>
        <p>
          For questions about these terms, contact us at{' '}
          <a href="mailto:hello@fibi.world" className="text-[#2563eb] underline hover:no-underline">
            hello@fibi.world
          </a>.
        </p>
      </section>
    </LegalPageLayout>
  )
}
