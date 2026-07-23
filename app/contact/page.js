import LegalLayout, { Section, Bullets, Callout } from "@/components/LegalLayout";

export const metadata = {
  title: "Disclaimer · SuperCreators",
  description:
    "Important limitations on the courses, certificates and information available through SuperCreators.",
};

export default function DisclaimerPage() {
  return (
    <LegalLayout
      title="Disclaimer"
      updated="23 July 2026"
      intro="Read this before you buy a course or rely on anything published on the platform."
    >
      <Section title="1. We are a marketplace, not a publisher">
        <p>
          SuperCreators provides the tools that let independent creators build,
          price and sell courses. We do not write, review, fact-check, accredit
          or endorse the courses listed here. Opinions, claims, advice and
          teaching methods in any course belong to its creator alone.
        </p>
        <Callout>
          A course being listed on SuperCreators is not a recommendation from us,
          nor a guarantee that its content is accurate, current or suitable for
          your situation.
        </Callout>
      </Section>

      <Section title="2. No professional advice">
        <p>
          Courses on this platform are for general educational purposes only.
          Nothing on SuperCreators constitutes:
        </p>
        <Bullets
          items={[
            "Financial, investment, trading or tax advice. Markets carry risk, past performance says nothing about future returns, and no course can promise a profit.",
            "Medical, nutritional, psychological or fitness advice. Consult a qualified practitioner before changing your diet, exercise or treatment.",
            "Legal advice. Laws differ by state and change over time; speak to a licensed advocate about your specific matter.",
            "Career or immigration advice with any guarantee of an outcome.",
          ]}
        />
        <p>
          Always seek independent professional guidance before acting on
          something you learned in a course.
        </p>
      </Section>

      <Section title="3. No guarantee of results">
        <p>
          Any earnings figures, career outcomes, skill timelines, weight or
          fitness results, follower counts or student testimonials shown on a
          course page are illustrative of what some individuals achieved. They
          are not typical, not promised, and not a projection of what you will
          achieve.
        </p>
        <p>
          Your results depend on your starting point, effort, time, market
          conditions and factors outside anyone&rsquo;s control. Neither
          SuperCreators nor any creator guarantees a specific outcome from
          completing a course.
        </p>
      </Section>

      <Section title="4. Certificates are not accreditation">
        <p>
          Certificates issued through SuperCreators confirm that a learner
          completed a specific course on the platform. They are not degrees,
          diplomas, or licences. They are not accredited by the UGC, AICTE, any
          state or central education board, or any professional regulator, and
          they carry no statutory recognition. Do not represent them as a formal
          qualification.
        </p>
      </Section>

      <Section title="5. Third-party content and links">
        <p>
          Courses may reference or link to external websites, tools, books and
          services. We do not control those, do not vet them, and are not
          responsible for their content, pricing, availability or privacy
          practices. Some links may be affiliate links from which the creator
          earns a commission — creators are required to disclose this, but we do
          not independently verify each one.
        </p>
      </Section>

      <Section title="6. Accuracy and availability">
        <p>
          Content can become outdated. Software changes, regulations are amended,
          and techniques are superseded. We make no warranty that any course is
          complete, current or error-free. We also do not warrant uninterrupted
          availability of the platform — maintenance, outages and third-party
          failures can affect access.
        </p>
      </Section>

      <Section title="7. Creator responsibility">
        <p>
          Creators are solely responsible for the legality, quality and delivery
          of what they sell, for the accuracy of their marketing claims, and for
          honouring their stated refund policy. Disputes about course content are
          between the buyer and the creator in the first instance. We will assist
          where a creator has clearly failed to deliver, in line with our{" "}
          <a
            href="/terms"
            className="font-medium underline"
            style={{ color: "#2A5DF0" }}
          >
            Terms of Service
          </a>
          .
        </p>
      </Section>

      <Section title="8. Limitation of liability">
        <p>
          To the fullest extent permitted by law, SuperCreators disclaims
          liability for any loss — financial, personal, professional or
          otherwise — arising from your use of, or reliance on, any course or
          information obtained through the platform. Our liability is limited as
          set out in our Terms of Service.
        </p>
      </Section>

      <Section title="9. Questions">
        <p>
          If something on the platform looks misleading or unsafe, report it to{" "}
          <a
            href="mailto:support@supercreators.in"
            className="font-medium underline"
            style={{ color: "#2A5DF0" }}
          >
            support@supercreators.in
          </a>{" "}
          and we will review it.
        </p>
      </Section>
    </LegalLayout>
  );
}