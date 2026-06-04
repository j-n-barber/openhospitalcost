import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { unsubscribeByToken } from "@/lib/unsubscribe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribe — OpenHospitalCost",
  description: "Unsubscribe from the OpenHospitalCost newsletter.",
  robots: { index: false, follow: false },
};

type Params = { searchParams: Promise<{ token?: string }> };

export default async function UnsubscribePage({ searchParams }: Params) {
  const { token } = await searchParams;
  const result = await unsubscribeByToken(token);

  return (
    <>
      <SiteHeader />
      <main className="wrap prose">
        <section className="pagehead">
          <div className="crumb"><a href="/">Home</a> / Unsubscribe</div>
          <h1>{result.ok ? "You're unsubscribed" : "Unsubscribe"}</h1>
        </section>
        <div className="copy">
          {result.ok ? (
            <p>
              {result.email ? <><strong>{result.email}</strong> has </> : "You've "}
              been removed from the OpenHospitalCost newsletter. You won&apos;t receive any more monthly reports.
              Changed your mind? You can <a href="/reports">re-subscribe from any report page</a> anytime.
            </p>
          ) : (
            <p>
              We couldn&apos;t process that unsubscribe link — it may be invalid or already used. If you keep receiving
              emails you don&apos;t want, email us at{" "}
              <a href="mailto:contact@openhospitalcost.com?subject=Unsubscribe">contact@openhospitalcost.com</a> and
              we&apos;ll remove you right away.
            </p>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
