import { Hero } from "@/components/features/Hero";
import { CategoryShowcase } from "@/components/features/CategoryShowcase";
import { PromotionBanners } from "@/components/features/PromotionBanners";
import { FlashSale } from "@/components/features/FlashSale";
import { FeaturedProducts } from "@/components/features/FeaturedProducts";

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      <Hero />
      <CategoryShowcase />
      <PromotionBanners />
      <FlashSale />
      <FeaturedProducts />
    </div>
  );
}
