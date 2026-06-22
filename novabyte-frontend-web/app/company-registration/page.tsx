import type { Metadata } from "next";
import { businessContact, PageHero, SiteFooter, SiteHeader } from "../site-shell";

export const metadata: Metadata = {
  title: "Company Registration Details",
  description: "Company registration and business details for NovaByte Technologies including registration status, business objective, and contact information."
};

export default function CompanyRegistrationPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <PageHero eyebrow="Company Details" title="Business and support information." description="This page keeps our legal business name, service category, and customer contact information clear." />
        <section className="shell section">
          <div className="billingLayout">
            <article className="panel infoPanel">
              <h2 className="sectionTitle">Current Details</h2>
              <div className="invoiceBox">
                <div className="invoiceRow"><span>Legal / Business Name</span><strong>{businessContact.legalName}</strong></div>
                <div className="invoiceRow"><span>Brand Name</span><strong>{businessContact.legalName}</strong></div>
                <div className="invoiceRow"><span>Service Category</span><strong>Software / IT Enabled Services</strong></div>
                <div className="invoiceRow"><span>Location</span><strong>{businessContact.location}</strong></div>
                <div className="invoiceRow"><span>Official Phone</span><strong>{businessContact.phone}</strong></div>
                <div className="invoiceRow"><span>Email</span><strong>{businessContact.email}</strong></div>
                <div className="invoiceRow"><span>Support Hours</span><strong>{businessContact.supportHours}</strong></div>
              </div>
            </article>
            <article className="panel infoPanel">
              <h2 className="sectionTitle">Business Services</h2>
              <ul className="list">
                <li>Software and website development</li>
                <li>Mobile application interfaces</li>
                <li>Cloud, deployment, and maintenance support</li>
                <li>Admin dashboards and digital operations</li>
              </ul>
            </article>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
