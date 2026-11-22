"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** After checkout, the webhook can land a few seconds later. Refresh until the page shows paid. */
export default function PaymentPoller() {
  const router = useRouter();
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (tries >= 20) return;
    const t = setTimeout(() => {
      router.refresh();
      setTries((n) => n + 1);
    }, 3000);
    return () => clearTimeout(t);
  }, [tries, router]);

  return (
    <div className="rounded-2xl border-4 border-ink bg-toy-yellow p-4 text-center font-semibold" role="status" aria-live="polite">
      {tries < 20 ? (
        <>⏳ Payment received! Unlocking your HD figure…</>
      ) : (
        <>Still confirming your payment. Refresh in a minute, or check your receipt email for the link.</>
      )}
    </div>
  );
}
