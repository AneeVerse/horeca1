import { Hero } from "@/components/features/Hero";
import { CategoryShowcase } from "@/components/features/CategoryShowcase";
import { PromotionBanners } from "@/components/features/PromotionBanners";
import { FlashSale } from "@/components/features/FlashSale";
import { FeaturedProducts } from "@/components/features/FeaturedProducts";
import { OfferBanners } from "@/components/features/OfferBanners";
import { RecommendedProducts } from "@/components/features/RecommendedProducts";
import { HotDeals } from "@/components/features/HotDeals";
import { TopVendors } from "@/components/features/TopVendors";
import { DailyBestSells } from "@/components/features/DailyBestSells";
import { DeliveryPoster } from "@/components/features/DeliveryPoster";

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      <Hero />
      <CategoryShowcase />
      <PromotionBanners />
      <FlashSale />
      <FeaturedProducts />
      <OfferBanners />
      <RecommendedProducts />
      <HotDeals />
      <TopVendors />
      <DailyBestSells />
      <DeliveryPoster />
    </div>
  );
}
