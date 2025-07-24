import { useEffect, useState } from 'react';

const OFFICES = [
  '東京本社',
  '大阪支社',
  '名古屋営業所',
  '福岡事業所',
];

export default function OfficeSelectPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('selected_office');
    if (saved) {
      setSelected(saved);
      setDone(true);
    }
  }, []);

  const handleSelect = (office: string) => {
    localStorage.setItem('selected_office', office);
    setSelected(office);
    setDone(true);
  };

  return (
    <main className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-bold mb-6">作業実施事業所の選択</h1>
      {done ? (
        <div className="p-4 border rounded bg-green-50">
          <div className="mb-2">選択済み事業所：</div>
          <div className="font-semibold text-lg">{selected}</div>
        </div>
      ) : (
        <ul className="space-y-4">
          {OFFICES.map((office) => (
            <li key={office}>
              <button
                className="w-full border rounded px-4 py-2 text-left hover:bg-blue-50"
                onClick={() => handleSelect(office)}
              >
                {office}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
} 