// Hands a generated file to the user: the native OS share sheet where the
// Web Share API's file-sharing is supported (most mobile browsers), a plain
// browser download everywhere else (most desktop browsers still lack
// navigator.canShare({ files })).
export async function shareOrDownloadFile(
  blob: Blob,
  filename: string,
  options?: { title?: string; text?: string }
): Promise<"shared" | "downloaded" | "cancelled"> {
  const file = new File([blob], filename, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean };

  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      // navigator.share() reporting support doesn't guarantee it settles —
      // with no OS share target registered it can hang indefinitely rather
      // than rejecting, which would otherwise leave the caller's "pending"
      // UI state stuck forever. A timeout falls back to a normal download.
      await Promise.race([
        nav.share({ files: [file], title: options?.title, text: options?.text }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("share timed out")), 5000)),
      ]);
      return "shared";
    } catch (err) {
      // The user dismissing the share sheet is not a failure — anything
      // else (including our own timeout above) falls through to a plain
      // download instead.
      if (err instanceof Error && err.name === "AbortError") return "cancelled";
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return "downloaded";
}
