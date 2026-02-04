import { Hero } from "@/components/features/Hero";

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      <Hero />
      {/* Additional sections will go here */}
      <section className="py-[var(--space-section)] flex items-center justify-center text-text-muted text-fluid-lg">
        Product Categories & Featured Items Coming Soon...
      </section>
    </div>
  );
}
