export type ChartMarketLink = {
  slug: string;
  label: string;
  open: string;
  close: string;
};

export const chartMarkets: ChartMarketLink[] = [
  { slug: "ntr-morning", label: "NTR Morning", open: "09:00 AM", close: "10:00 AM" },
  { slug: "sita-morning", label: "Sita Morning", open: "09:40 AM", close: "10:40 AM" },
  { slug: "karnataka-day", label: "Karnataka Day", open: "09:55 AM", close: "10:55 AM" },
  { slug: "star-tara-morning", label: "Star Tara Morning", open: "10:05 AM", close: "11:05 AM" },
  { slug: "milan-morning", label: "Milan Morning", open: "10:10 AM", close: "11:10 AM" },
  { slug: "maya-bazar", label: "Maya Bazar", open: "10:15 AM", close: "11:15 AM" },
  { slug: "andhra-morning", label: "Andhra Morning", open: "10:35 AM", close: "11:35 AM" },
  { slug: "sridevi", label: "Sridevi", open: "11:25 AM", close: "12:25 PM" },
  { slug: "mahadevi-morning", label: "Mahadevi Morning", open: "11:40 AM", close: "12:40 PM" },
  { slug: "time-bazar", label: "Time Bazar", open: "12:45 PM", close: "01:45 PM" },
  { slug: "madhur-day", label: "Madhur Day", open: "01:20 PM", close: "02:20 PM" },
  { slug: "sita-day", label: "Sita Day", open: "01:40 PM", close: "02:40 PM" },
  { slug: "star-tara-day", label: "Star Tara Day", open: "02:15 PM", close: "03:15 PM" },
  { slug: "milan-day", label: "Milan Day", open: "02:45 PM", close: "04:45 PM" },
  { slug: "rajdhani-day", label: "Rajdhani Day", open: "03:00 PM", close: "05:00 PM" },
  { slug: "andhra-day", label: "Andhra Day", open: "03:30 PM", close: "05:30 PM" },
  { slug: "kalyan", label: "Kalyan", open: "04:10 PM", close: "06:10 PM" },
  { slug: "mahadevi", label: "Mahadevi", open: "04:25 PM", close: "06:25 PM" },
  { slug: "ntr-day", label: "NTR Day", open: "04:50 PM", close: "06:50 PM" },
  { slug: "sita-night", label: "Sita Night", open: "06:40 PM", close: "07:40 PM" },
  { slug: "sridevi-night", label: "Sridevi Night", open: "07:05 PM", close: "08:05 PM" },
  { slug: "star-tara-night", label: "Star Tara Night", open: "07:15 PM", close: "08:15 PM" },
  { slug: "mahadevi-night", label: "Mahadevi Night", open: "07:45 PM", close: "08:45 PM" },
  { slug: "madhur-night", label: "Madhur Night", open: "08:20 PM", close: "10:20 PM" },
  { slug: "supreme-night", label: "Supreme Night", open: "08:35 PM", close: "10:35 PM" },
  { slug: "andhra-night", label: "Andhra Night", open: "08:40 PM", close: "10:40 PM" },
  { slug: "ntr-night", label: "NTR Night", open: "08:50 PM", close: "10:50 PM" },
  { slug: "milan-night", label: "Milan Night", open: "08:50 PM", close: "10:50 PM" },
  { slug: "kalyan-night", label: "Kalyan Night", open: "09:25 PM", close: "11:25 PM" },
  { slug: "rajdhani-night", label: "Rajdhani Night", open: "09:30 PM", close: "11:40 PM" },
  { slug: "main-bazar", label: "Main Bazar", open: "09:45 PM", close: "11:55 PM" },
  { slug: "mangal-bazar", label: "Mangal Bazar", open: "10:05 PM", close: "11:05 PM" }
];
