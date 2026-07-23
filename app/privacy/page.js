import LegalLayout, { Section, Bullets, Callout } from "@/components/LegalLayout";

export const metadata = {
  title: "Privacy Policy · SuperCreators",
  description:
    "How SuperCreators collects, uses, stores and protects your personal data on supercreators.in.",
};

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      updated="23 July 2026"
      intro="What we collect, why we collect it, who we share it with, and the control you have over it."
    >
      <Section title="1. Scope">
        <p>
          This policy covers personal data processed by SuperCreators when you
          visit supercreators.in, create an account, publish a course, or make a
          purchase. It is written to align with the Digital Personal Data
          Protection Act, 2023 and the Information Technology (Reasonable
          Security Practices) Rules, 2011.
        </p>
        <p>
          Where a creator collects data from their own buyers through custom
          checkout questions, that creator is the data fiduciary for that data
          and we process it on their behalf.
        </p>
      </Section>

      <Section title="2. What we collect">
        <p>
          <strong style={{ color: "#0B1220" }}>You give us directly:</strong>
        </p>
        <Bullets
          items={[
            "Account details — name, email address, phone number, password hash, profile photo.",
            "Creator details — bank account or UPI ID for payouts, PAN and GSTIN where required, KYC documents requested by our payment partner.",
            "Course content — text, images, video, files and any other material you upload.",
            "Purchase details — courses bought, coupon codes used, and answers to any custom checkout questions the creator has configured.",
            "Support correspondence — messages you send us, including any attachments.",
          ]}
        />
        <p>
          <strong style={{ color: "#0B1220" }}>Collected automatically:</strong>
        </p>
        <Bullets
          items={[
            "Device and browser type, operating system, and approximate location derived from IP address.",
            "Usage data — pages viewed, lessons completed, time spent, drop-off points, and referral source.",
            "Cookies and similar technologies, described in our cookie notice.",
          ]}
        />
        <Callout>
          We never see or store your full card number, CVV or UPI PIN. Payment
          credentials go directly to Razorpay, a PCI-DSS compliant payment
          gateway.
        </Callout>
      </Section>

      <Section title="3. Why we use it">
        <Bullets
          items={[
            "To create and secure your account, and to authenticate you when you sign in.",
            "To deliver courses you have bought and to give creators the sales, completion and drop-off analytics shown in their dashboard.",
            "To process payments, issue payouts, generate invoices and meet tax obligations.",
            "To issue and verify completion certificates.",
            "To send transactional messages — receipts, access links, payout confirmations, security alerts. These are not marketing and cannot be opted out of while your account is active.",
            "To send product updates and offers, where you have consented. You can withdraw this at any time.",
            "To detect and prevent fraud, chargeback abuse, account takeover and content piracy.",
            "To comply with legal obligations and respond to lawful requests from authorities.",
          ]}
        />
      </Section>

      <Section title="4. Who we share it with">
        <p>
          We do not sell your personal data. We share it only with the following
          categories of recipient, and only to the extent needed:
        </p>
        <Bullets
          items={[
            "Payment processing — Razorpay, for transactions, settlements, refunds and KYC.",
            "Creators — when you buy a course, the creator receives your name, email and your answers to their checkout questions, so they can deliver and support the course.",
            "Infrastructure and analytics providers — cloud hosting, email delivery, error monitoring and product analytics, each bound by contract to process data only on our instructions.",
            "Professional advisers — auditors, accountants and lawyers, under confidentiality.",
            "Authorities — where disclosure is required by law, court order, or to protect the rights and safety of users.",
          ]}
        />
      </Section>

      <Section title="5. Retention">
        <p>
          We keep account data for as long as your account is active. After you
          delete your account we remove or anonymise personal data within ninety
          days, except:
        </p>
        <Bullets
          items={[
            "Transaction and tax records, retained for eight years as required under Indian tax law.",
            "Course content still accessible to learners who purchased it before deletion.",
            "Records needed for an ongoing dispute, investigation or legal claim, kept until it is resolved.",
          ]}
        />
      </Section>

      <Section title="6. Security">
        <p>
          We use TLS encryption in transit, encryption at rest for sensitive
          fields, hashed passwords, role-based internal access controls, and
          logging of administrative actions. No system is perfectly secure — if a
          breach affects your data, we will notify you and the Data Protection
          Board without undue delay, as required by law.
        </p>
      </Section>

      <Section title="7. Your rights">
        <p>You may, at any time:</p>
        <Bullets
          items={[
            "Access the personal data we hold about you and request a copy.",
            "Correct or complete inaccurate data through your account settings or by writing to us.",
            "Erase your account and associated data, subject to the retention exceptions above.",
            "Withdraw consent for marketing communications, without affecting the lawfulness of prior processing.",
            "Nominate another individual to exercise these rights on your behalf in the event of your death or incapacity.",
            "Raise a grievance with our Grievance Officer, and escalate to the Data Protection Board of India if unsatisfied.",
          ]}
        />
        <p>
          We respond to verified requests within thirty days. We may ask for
          identity verification before acting on a request.
        </p>
      </Section>

      <Section title="8. Children">
        <p>
          SuperCreators is not directed at children under 18. We do not knowingly
          process a child&rsquo;s personal data without verifiable parental
          consent. If you believe a child has created an account, write to us and
          we will remove it.
        </p>
      </Section>

      <Section title="9. Cross-border transfers">
        <p>
          Some of our infrastructure providers operate servers outside India.
          Where personal data is transferred abroad, we ensure comparable
          protection through contractual safeguards, and we do not transfer to
          territories restricted by the Government of India.
        </p>
      </Section>

      <Section title="10. Changes">
        <p>
          We may update this policy. The revision date at the top always reflects
          the current version, and we will notify you of material changes by
          email or an in-app notice.
        </p>
      </Section>

      <Section title="11. Grievance Officer">
        <p>
          Under Indian law, you may contact our Grievance Officer for any
          data-related complaint:
        </p>
        <div
          className="rounded-2xl border p-5"
          style={{ borderColor: "#E1E7F5", background: "#F4F7FF" }}
        >
          <div className="font-semibold" style={{ color: "#0B1220" }}>
            Grievance Officer, SuperCreators
          </div>
          <div className="mt-1 text-sm">
            <a
              href="mailto:privacy@supercreators.in"
              className="font-medium underline"
              style={{ color: "#2A5DF0" }}
            >
              privacy@supercreators.in
            </a>
          </div>
          <div className="mt-1 text-sm">Response within 30 days of receipt.</div>
        </div>
      </Section>
    </LegalLayout>
  );
}