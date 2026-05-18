import type { Metadata } from "next";
import { PageHero, SiteFooter, SiteHeader } from "../site-shell";

export const metadata: Metadata = {
  title: "Pricing And Service Plans",
  description: "NovaByte Technologies pricing plans for websites, app UI, admin dashboards, maintenance, and technical support services."
};

const plans = [
  {
    name: "Starter Website",
    price: "INR 4,999 onwards",
    details: ["Single landing page or small website", "Mobile responsive layout", "Contact CTA and basic SEO setup", "Delivery estimate: 3 to 7 business days"]
  },
  {
    name: "Business Website",
    price: "INR 12,999 onwards",
    details: ["Multi-page service website", "Policy pages and enquiry flow", "Performance and deployment support", "Delivery estimate: 7 to 15 business days"]
  },
  {
    name: "Mobile App UI",
    price: "INR 14,999 onwards",
    details: ["React Native screen design", "Login/profile/dashboard flows", "Build and handover support", "Delivery estimate: 10 to 20 business days"]
  },
  {
    name: "Admin Dashboard",
    price: "INR 19,999 onwards",
    details: ["Records and approval workflows", "Reports and filters", "Operator-friendly internal tools", "Delivery estimate: 15 to 30 business days"]
  },
  {
    name: "Monthly Maintenance",
    price: "INR 2,999 / month onwards",
    details: ["Bug fixes and small updates", "Monitoring and backups guidance", "Priority technical support", "Monthly support cycle"]
  },
  {
    name: "Digital Service Consultation",
    price: "INR 999 onwards",
    details: ["Requirement review call", "Basic technical guidance", "Scope and estimate preparation", "Remote delivery via email/online meeting"]
  }
];

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageHero eyebrow="Pricing" title="Listed service prices in INR with final quote after scope review." description="Starting prices are listed below. Final amount depends on features, timeline, revisions, integrations, third-party costs, and support needs." />
        <section className="shell section">
          <div className="sectionHead">
            <span className="eyebrow">Service Price List</span>
            <h2 className="sectionTitle">Software, website, app interface, dashboard, and maintenance services.</h2>
            <p>All prices are in Indian Rupees (INR). GST or taxes, if applicable after registration, may be charged separately.</p>
          </div>
          <div className="grid3">
            {plans.map((plan) => (
              <article className="panel serviceCard" key={plan.name}>
                <span className="projectTag">{plan.price}</span>
                <strong>{plan.name}</strong>
                <ul className="list">
                  {plan.details.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </article>
            ))}
          </div>
          <article className="panel policyPanel priceNote">
            <h2>Payment Terms</h2>
            <p>For fixed-scope work, payment may be collected as advance, milestone payment, or full payment depending on the approved estimate. Work starts only after scope confirmation and payment confirmation.</p>
            <h2>What Is Included</h2>
            <p>Each service includes agreed design/development work, basic testing, delivery support, and handover of agreed files or deployed pages. Additional features, paid tools, hosting, domains, or third-party services may be billed separately after approval.</p>
          </article>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
