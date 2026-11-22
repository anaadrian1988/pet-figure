"use client";

import { useEffect, useRef } from "react";

/**
 * Starts the HD download when the page is opened from the email's "Download" button
 * (?download=1). The server responds with a file attachment, so the page stays put.
 * The ?download=1 is then removed from the address so a refresh doesn't download again.
 */
export default function AutoDownload({ href }: { href: string }) {
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    window.location.assign(href);
    const url = new URL(window.location.href);
    url.searchParams.delete("download");
    window.history.replaceState(window.history.state, "", url);
  }, [href]);

  return (
    <p className="rounded-2xl border-4 border-ink bg-toy-yellow p-4 text-center text-sm font-semibold" role="status">
      ⬇️ Your download is starting. If nothing happens, tap <strong>Download HD PNG</strong> below.
    </p>
  );
}
