import { loadScenarios } from "@/lib/scenarios";

export const dynamic = "force-dynamic";

export default function Home() {
  const scenarios = loadScenarios();
  return (
    <main>
      <h1 className="text-2xl font-bold">Тренажёр трудных разговоров</h1>
      <ul className="mt-4 space-y-3">
        {scenarios.map((s) => (
          <li key={s.id} className="rounded border p-3">
            <h2 className="font-semibold">{s.title.ru}</h2>
            <p className="text-sm">{s.situation.ru}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
