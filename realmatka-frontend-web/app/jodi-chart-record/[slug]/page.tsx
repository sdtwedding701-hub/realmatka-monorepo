import { notFound } from "next/navigation";
import { ChartRecordPage, getChartMarket, getChartMarketLabel } from "@/components/ChartRecordPage";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const market = getChartMarket(slug);
  if (!market) {
    return buildMetadata({
      title: "Jodi Chart Record",
      description: "Market-wise jodi chart record and old satta matka history.",
      path: `/jodi-chart-record/${slug}`
    });
  }

  const label = getChartMarketLabel(slug);
  return buildMetadata({
    title: `${label.toUpperCase()} JODI CHART RECORD`,
    description: `${label} Jodi Chart Satta Matka record old history, daily jodi result, bracket, open close chart aur online live chart dekho.`,
    path: `/jodi-chart-record/${slug}`,
    keywords: [
      `${label} jodi chart`,
      `${label} jodi chart record`,
      `${label} matka jodi chart`,
      `${label} old jodi chart`,
      `${label} jodi result`,
      "satta matka jodi chart record"
    ]
  });
}

export default async function JodiChartRecordPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!getChartMarket(slug)) {
    notFound();
  }
  return <ChartRecordPage slug={slug} chartType="jodi" />;
}
