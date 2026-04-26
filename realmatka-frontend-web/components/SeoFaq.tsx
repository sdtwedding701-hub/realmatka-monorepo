type FaqItem = {
  question: string;
  answer: string;
};

type SeoFaqProps = {
  title?: string;
  items: FaqItem[];
};

export function SeoFaq({ title = "Frequently Asked Questions", items }: SeoFaqProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer
      }
    }))
  };

  return (
    <section className="section-shell px-6 py-6 sm:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <h2 className="text-2xl font-extrabold">{title}</h2>
      <div className="mt-5 grid gap-4">
        {items.map((item) => (
          <article key={item.question} className="border border-white/10 bg-white/[0.03] px-5 py-5">
            <h3 className="text-lg font-extrabold text-slate-100">{item.question}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-300 sm:text-base">{item.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
