import LegalLayout, { Section, Bullets, Callout } from "@/components/LegalLayout";

export const metadata = {
  title: "Terms of Service · SuperCreators",
  description:
    "The terms that govern your use of SuperCreators — creating, selling and buying courses on supercreators.in.",
};

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms of Service"
      updated="23 July 2026"
      intro="These terms govern your use of SuperCreators. By creating an account, publishing a course, or buying one, you agree to everything below."
    >
      <Section title="1. Who we are">
        <p>
          SuperCreators (&ldquo;SuperCreators&rdquo;, &ldquo;we&rdquo;,
          &ldquo;us&rdquo;) operates supercreators.in, a platform that lets
          creators build, price and sell online courses, and lets learners buy
          and access them. In these terms, &ldquo;you&rdquo; means anyone using
          the platform in any capacity.
        </p>
        <p>
          We act as a technology and payment-facilitation layer. We are not the
          author, publisher or guarantor of any course sold through the
          platform.
        </p>
      </Section>

      <Section title="2. Your account">
        <Bullets
          items={[
            "You must be at least 18 years old, or using the platform under the supervision of a parent or legal guardian who accepts these terms.",
            "You are responsible for everything that happens under your account, including keeping your login credentials secure.",
            "The information you give us — name, email, payout details, KYC documents — must be accurate and kept up to date.",
            "We may suspend or terminate an account that breaches these terms, is used for fraud, or is dormant with an unresolved compliance issue.",
          ]}
        />
      </Section>

      <Section title="3. Creator obligations">
        <p>
          If you publish a course, you keep ownership of your content but grant
          us a non-exclusive, worldwide, royalty-free licence to host, stream,
          display, and promote it for the purpose of running the platform. This
          licence ends when you remove the content, except where we must retain
          copies to serve learners who already purchased it or to meet a legal
          obligation.
        </p>
        <p>You confirm that your course:</p>
        <Bullets
          items={[
            "Is your original work, or is content you are otherwise licensed to sell.",
            "Does not infringe anyone's copyright, trademark, privacy or publicity rights.",
            "Delivers substantially what your sales page, description and testimonials promise.",
            "Complies with Indian law, including consumer protection, advertising and taxation requirements.",
          ]}
        />
        <p>
          You are solely responsible for the accuracy of claims you make about
          outcomes, earnings or results. Misleading claims are a breach of these
          terms and may be a breach of law.
        </p>
      </Section>

      <Section title="4. Prohibited content and conduct">
        <p>You may not use SuperCreators to publish, sell, or distribute:</p>
        <Bullets
          items={[
            "Content that is unlawful, defamatory, obscene, or that promotes hatred or violence against any group or individual.",
            "Sexually explicit material, or any content involving minors in a sexual or exploitative context.",
            "Pirated courses, cracked software, leaked exam papers, or any third-party material you do not have the right to sell.",
            "Guaranteed-return investment schemes, multi-level marketing recruitment, or any content designed to defraud buyers.",
            "Malware, scraping tools, or anything intended to compromise the platform or another user's account.",
          ]}
        />
        <p>
          We may remove content and terminate accounts for violations without
          prior notice where the violation is serious or ongoing.
        </p>
      </Section>

      <Section title="5. Pricing, payments and payouts">
        <p>
          Creators set their own course price, including free and
          pay-what-you-want options. Payments are processed by Razorpay via UPI,
          cards, net banking and supported wallets. We do not store your full
          card or bank credentials.
        </p>
        <Bullets
          items={[
            "A platform fee plus payment gateway charges are deducted from each sale. The exact fee applicable to your account is shown in your dashboard before you publish.",
            "Payouts are made to the verified bank account on your profile, typically within 24 hours of a settled transaction, subject to gateway settlement cycles and any hold placed for fraud or dispute review.",
            "You are responsible for your own tax obligations, including GST registration and filing where applicable, and for issuing invoices required by law.",
            "We may withhold or reverse a payout where a transaction is disputed, charged back, or reasonably suspected to be fraudulent.",
          ]}
        />
      </Section>

      <Section title="6. Refunds and cancellations">
        <p>
          Refund windows are set by the creator and displayed on each course
          page before checkout. Where a creator has not specified a policy, a
          seven-day window applies from the date of purchase, provided the
          learner has not completed more than a quarter of the course content.
        </p>
        <p>
          Refunds are returned via the original payment method. Gateway charges
          on a refunded transaction may not be recoverable. We may issue a
          refund directly, and deduct it from creator payouts, where a course was
          not delivered, was materially misrepresented, or where required by law
          or by a payment network ruling.
        </p>
      </Section>

      <Section title="7. Buyer rights and course access">
        <p>
          Buying a course grants you a personal, non-transferable licence to
          access it for your own learning. You may not download, record,
          redistribute, resell or share access with anyone else. Doing so may
          result in loss of access without refund and, where warranted, legal
          action by the creator.
        </p>
        <p>
          Access ordinarily continues for as long as the course remains on the
          platform. If a creator removes a course, we will make reasonable
          efforts to preserve access for existing buyers, but cannot guarantee
          indefinite availability.
        </p>
      </Section>

      <Section title="8. Certificates">
        <p>
          Certificates issued on completion carry a unique verification ID. They
          record that a learner completed a course on the platform. They are not
          academic qualifications, are not accredited by any regulatory or
          educational authority, and confer no formal credential. We may
          invalidate a certificate obtained through fraud or account sharing.
        </p>
      </Section>

      <Section title="9. Intellectual property">
        <p>
          The SuperCreators name, logo, interface, and underlying software are
          ours and are protected by applicable intellectual property law. You may
          not copy, reverse engineer, or create derivative works from the
          platform. Course content remains the property of the creator who
          uploaded it.
        </p>
        <p>
          If you believe content on the platform infringes your rights, write to
          us with details of the work, the infringing URL, and a statement of
          your good-faith belief. We will investigate and act on valid notices.
        </p>
      </Section>

      <Section title="10. Availability and changes">
        <p>
          We aim to keep the platform available continuously, but we do not
          promise uninterrupted service. We may perform maintenance, change or
          discontinue features, and update these terms. Material changes will be
          notified by email or an in-app notice before they take effect.
          Continuing to use the platform after that constitutes acceptance.
        </p>
      </Section>

      <Section title="11. Limitation of liability">
        <Callout>
          To the fullest extent permitted by law, SuperCreators is not liable for
          indirect, incidental or consequential losses, including lost profits or
          lost data. Our total aggregate liability to you in any twelve-month
          period is limited to the total platform fees you paid us during that
          period.
        </Callout>
        <p>
          Nothing in these terms limits liability for fraud, wilful misconduct,
          or anything that cannot be excluded under Indian law.
        </p>
      </Section>

      <Section title="12. Indemnity">
        <p>
          You agree to indemnify SuperCreators against claims, damages and
          reasonable legal costs arising from your content, your breach of these
          terms, or your violation of another person&rsquo;s rights.
        </p>
      </Section>

      <Section title="13. Governing law and disputes">
        <p>
          These terms are governed by the laws of India. Disputes are subject to
          the exclusive jurisdiction of the courts at Bengaluru, Karnataka. We
          encourage you to write to us first — most issues are resolved without
          escalation.
        </p>
      </Section>

      <Section title="14. Contact">
        <p>
          Questions about these terms can be sent to{" "}
          <a
            href="mailto:legal@supercreators.in"
            className="font-medium underline"
            style={{ color: "#2A5DF0" }}
          >
            legal@supercreators.in
          </a>
          .
        </p>
      </Section>
    </LegalLayout>
  );
}