import { notFound } from "next/navigation";
import { ChartRecordPage, getChartMarket, getChartMarketLabel } from "@/components/ChartRecordPage";
import { chartMarkets } from "@/lib/market-links";
import { buildMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return chartMarkets.map((market) => ({ slug: market.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const market = getChartMarket(slug);
  if (!market) {
    return buildMetadata({
      title: "Panel Chart Record",
      description: "Market-wise panel chart record and old satta matka history.",
      path: `/panel-chart-record/${slug}`
    });
  }

  const label = getChartMarketLabel(slug);
  return buildMetadata({
    title: `${label.toUpperCase()} PANEL CHART RECORD`,
    description: `${label} Panel Chart Satta Matka record old history, panna chart, daily panel result, bracket, open close chart aur online live chart dekho.`,
    path: `/panel-chart-record/${slug}`,
    keywords: [
      `${label} panel chart`,
      `${label} panel chart record`,
      `${label} panna chart`,
      `${label} panna chart record`,
      `${label} old panel chart`,
      `${label} panel result`,
      "satta matka panel chart record",
      "satta matka panna chart record"
    ]
  });
}

export default async function PanelChartRecordPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getChartMarket(slug)) {
    notFound();
  }
  return <ChartRecordPage slug={slug} chartType="panna" />;
}
