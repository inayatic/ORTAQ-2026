"use client";
import { useEffect, useState } from "react";

export default function Best({ id, label }: { id: string; label: string }) {
  const [v, setV] = useState("");
  useEffect(() => {
    try {
      const b = JSON.parse(localStorage.getItem(`ortaq:best:${id}`) ?? "null");
      if (b) setV(`${b.score}/${b.max}`); // eslint-disable-line react-hooks/set-state-in-effect
    } catch {}
  }, [id]);
  return v ? <p className="mt-1 text-sm text-green-800">{label}: {v}</p> : null;
}
