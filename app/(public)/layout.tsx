import { PublicNav } from "@/components/public-nav";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNav />
      <main className="mx-auto w-full max-w-[960px] flex-1 px-4 py-12 sm:px-6">{children}</main>
    </>
  );
}
