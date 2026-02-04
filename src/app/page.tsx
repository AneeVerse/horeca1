import { Hero } from "@/components/features/Hero";
import { CategoryShowcase } from "@/components/features/CategoryShowcase";
import { PromotionBanners } from "@/components/features/PromotionBanners";
import { FlashSale } from "@/components/features/FlashSale";

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      <Hero />
      <CategoryShowcase />
      <PromotionBanners />
      <FlashSale />
    </div>
  );
}
