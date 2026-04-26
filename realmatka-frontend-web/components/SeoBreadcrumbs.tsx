import Link from "next/link";

type BreadcrumbItem = {
  name: string;
  href?: string;
};

type SeoBreadcrumbsProps = {
  items: BreadcrumbItem[];
};

export function SeoBreadcrumbs({ items }: SeoBreadcrumbsProps) {
  const baseUrl = "https://realmatka.in";
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.href ? `${baseUrl}${item.href}` : baseUrl
    }))
  };

  return (
    <section className="px-6 py-4 sm:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <nav aria-label="Breadcrumb" className="text-sm text-slate-400">
        <div className="flex flex-wrap items-center gap-2">
          {items.map((item, index) => (
            <span key={`${item.name}-${index}`} className="flex items-center gap-2">
              {item.href ? <Link href={item.href} className="hover:text-white">{item.name}</Link> : <span className="text-slate-200">{item.name}</span>}
              {index < items.length - 1 ? <span>/</span> : null}
            </span>
          ))}
        </div>
      </nav>
    </section>
  );
}
