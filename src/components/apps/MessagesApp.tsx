"use client";

import DirectMessages from "@/components/DirectMessages";

export default function MessagesApp({ isVisible = true }: { isVisible?: boolean }) {
  return (
    <div className="page-shell dm-shell">
      <DirectMessages isVisible={isVisible} />
    </div>
  );
}
