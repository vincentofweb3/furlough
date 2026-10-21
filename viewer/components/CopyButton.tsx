"use client";

import { useState } from "react";

export default function CopyButton({ value, label = "Copy address" }: { value: string; label?: string }) {
  const [text, setText] = useState(label);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setText("Copied");
    } catch {
      setText("Select and copy manually");
    }
    setTimeout(() => setText(label), 1600);
  };

  return (
    <button className="btn btn-ghost" type="button" onClick={copy}>
      {text}
    </button>
  );
}
