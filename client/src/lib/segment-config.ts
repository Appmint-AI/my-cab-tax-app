export type UserSegment = "taxi" | "delivery";

export interface SegmentConfig {
  label: string;
  shortLabel: string;
  icon: string;
  customerTerm: string;
  tripTerm: string;
  tripTermPlural: string;
  earningsLabel: string;
  surgeLabel: string;
  tipContext: string;
  dashboardHeading: string;
  dashboardSubheading: string;
  incomeSources: string[];
  expenseSuggestions: string[];
  receiptOptimization: string;
  proTips: string[];
}

const TAXI_CONFIG: SegmentConfig = {
  label: "Taxi / Rideshare Driver",
  shortLabel: "Rideshare",
  icon: "car",
  customerTerm: "Rider",
  tripTerm: "Passenger Trip",
  tripTermPlural: "Passenger Trips",
  earningsLabel: "Ride Earnings",
  surgeLabel: "Surge Earnings",
  tipContext: "passenger gratuities",
  dashboardHeading: "Driver Dashboard",
  dashboardSubheading: "Track your passenger trips, surge earnings, and deductions.",
  incomeSources: ["Uber", "Lyft", "Taxi Medallion", "Via", "Curb", "Arro"],
  expenseSuggestions: [
    "Car Detailing",
    "Passenger Snacks & Water",
    "TLC License Fees",
    "Phone Mount & Charger",
    "Dash Cam",
    "Airport Queue Fees",
  ],
  receiptOptimization: "Optimized for gas station, car wash, and vehicle maintenance receipts.",
  proTips: [
    "Track every trip — even short ones add up for your mileage deduction.",
    "Surge pricing counts as regular income on your 1099-K.",
    "Keep your TLC license renewal receipt — it's fully deductible.",
    "Water and snacks for riders? Deductible as a business supply.",
  ],
};

const DELIVERY_CONFIG: SegmentConfig = {
  label: "Delivery Courier",
  shortLabel: "Delivery",
  icon: "package",
  customerTerm: "Customer",
  tripTerm: "Order Delivery",
  tripTermPlural: "Order Deliveries",
  earningsLabel: "Delivery Earnings",
  surgeLabel: "Tip Breakdown",
  tipContext: "customer delivery tips",
  dashboardHeading: "Courier Dashboard",
  dashboardSubheading: "Track your order deliveries, tips, and deductions.",
  incomeSources: ["DoorDash", "Instacart", "Grubhub", "Uber Eats", "Amazon Flex", "Shipt"],
  expenseSuggestions: [
    "Insulated Delivery Bags",
    "Courier Insurance",
    "Bike Repair & Maintenance",
    "Phone Data Plan",
    "Parking Fees",
    "Hand Warmers & Gear",
  ],
  receiptOptimization: "Optimized for equipment, delivery gear, and staging area receipts.",
  proTips: [
    "Your insulated bags are a deductible business expense.",
    "Track mileage between deliveries — waiting time at restaurants counts.",
    "Bike repairs and e-bike charging costs are fully deductible.",
    "Multi-app stacking? Split mileage proportionally across platforms.",
  ],
};

const SEGMENT_CONFIGS: Record<UserSegment, SegmentConfig> = {
  taxi: TAXI_CONFIG,
  delivery: DELIVERY_CONFIG,
};

export function getSegmentConfig(segment: UserSegment | string | null | undefined): SegmentConfig {
  if (segment === "delivery") return SEGMENT_CONFIGS.delivery;
  return SEGMENT_CONFIGS.taxi;
}

export function isValidSegment(value: unknown): value is UserSegment {
  return value === "taxi" || value === "delivery";
}
