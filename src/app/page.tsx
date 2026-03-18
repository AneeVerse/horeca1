import { Hero } from "@/components/features/Hero";
import { CategoryShowcase } from "@/components/features/CategoryShowcase";
import { FeatureBar } from "@/components/features/FeatureBar";
// import { ShopByStore } from "@/components/features/ShopByStore";
import { ShopByStorePromo } from "@/components/features/ShopByStorePromo";
import { ShopByStoreAlt } from "@/components/features/ShopByStoreAlt";
import { QuickActions } from "@/components/features/homepage/QuickActions";
import { ContinueOrdering } from "@/components/features/homepage/ContinueOrdering";
import { NearbyVendors } from "@/components/features/homepage/NearbyVendors";
import { Collections } from "@/components/features/homepage/Collections";
import { NewsletterBanner } from "@/components/features/NewsletterBanner";

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      {/* Hero / Banner */}
      <Hero />

      {/* Quick Actions: Reorder, Quick Order, My Vendors */}
      <QuickActions />

      {/* Continue Ordering: Recent vendors */}
      <ContinueOrdering />

      {/* Shop By Store (OLD - commented out) */}
      {/* <ShopByStore /> */}

      {/* Shop By Store Promo (Design 1 - green promo banner with vendor logos) */}
      <ShopByStorePromo />

      {/* Categories */}
      <CategoryShowcase />

      {/* Vendors Near You */}
      <NearbyVendors />

      {/* Shop By Store Alt (Design 2 - Popular Chains white clean style) */}
      <ShopByStoreAlt />

      {/* Collections: Italian Kitchen, Oriental, etc. */}
      <Collections />


      {/* Features Bar */}
      <FeatureBar />


      {/* Newsletter / Subscription */}
      <NewsletterBanner />
    </div>
  );
}
