import { Hero } from "@/components/features/Hero";
import { CategoryShowcase } from "@/components/features/CategoryShowcase";

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      <Hero />
      <CategoryShowcase />
    </div>
  );
}
