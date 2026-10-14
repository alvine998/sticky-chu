import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { LogicalSize } from "@tauri-apps/api/dpi";
import "./App.css";

type Msg = { role: "user" | "assistant"; content: string };
type Pet = { id: string; name: string; emoji: string; color: string; prompt: string };

const PETS: Pet[] = [
  { id: "chu", name: "Chu", emoji: "🐹", color: "#f5a623", prompt: "You are Chu, a cheerful hamster assistant. Keep answers short and playful." },
  { id: "momo", name: "Momo", emoji: "🐱", color: "#7ee2a8", prompt: "You are Momo, a calm cat assistant. Soft, concise, a little aloof but helpful." },
  { id: "pudding", name: "Pudding", emoji: "🐶", color: "#6cb8ff", prompt: "You are Pudding, an eager puppy assistant. Friendly, energetic, encouraging." },
  { id: "taro", name: "Taro", emoji: "🐧", color: "#b79cff", prompt: "You are Taro, a wise penguin assistant. Precise, thoughtful, slightly formal." },
  { id: "boba", name: "Boba", emoji: "🐸", color: "#8be28b", prompt: "You are Boba, a chill frog assistant. Relaxed tone, simple words, zen vibe." },
  { id: "mchi", name: "Mchi", emoji: "🐰", color: "#ff9ecf", prompt: "You are Mchi, a sweet bunny assistant. Kind, gentle, soft language." },
];

const BASE_URL = "https://inference.poolside.ai/v1";
const MODEL = "poolside/laguna-s-2.1";
const KEY_LS = "sticky-chu-poolside-key";
const PET_LS = "sticky-chu-pet";

function Icon({ d }: { d: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const ICON_MINI = "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3";
const ICON_GEAR = "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z";
const ICON_X = "M18 6 6 18 M6 6l12 12";
const ICON_CHAT = "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z";

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(KEY_LS) ?? "");
  const [petId, setPetId] = useState(() => localStorage.getItem(PET_LS) ?? "chu");
  const [showSettings, setShowSettings] = useState(false);
  const [showPets, setShowPets] = useState(false);
  const [mini, setMini] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const pet = PETS.find((p) => p.id === petId) ?? PETS[0];

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function startDrag(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("button, input, textarea")) return;
    try {
      await getCurrentWindow().startDragging();
    } catch (err) {
      setError(`drag failed: ${(err as Error).message ?? err}`.slice(0, 200));
    }
  }

  function pickPet(id: string) {
    setPetId(id);
    localStorage.setItem(PET_LS, id);
    setShowPets(false);
  }

  async function toggleMini() {
    const next = !mini;
    setMini(next);
    try {
      await getCurrentWindow().setSize(
        next ? new LogicalSize(110, 110) : new LogicalSize(400, 640),
      );
    } catch (err) {
      setError(`resize failed: ${(err as Error).message ?? err}`.slice(0, 200));
    }
  }

  async function closeApp() {
    try {
      await getCurrentWindow().close();
    } catch (err) {
      try {
        await getCurrentWindow().hide();
      } catch (err2) {
        setError(`close failed: ${(err2 as Error).message ?? err2}`.slice(0, 200));
      }
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    if (!apiKey.trim()) {
      setError("Add Poolside API key (gear icon).");
      setShowSettings(true);
      return;
    }
    setError("");
    const userMsg: Msg = { role: "user", content: text };
    const history = [...messages, userMsg];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let acc = "";
    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: "system", content: pet.prompt },
            ...history.map((m) => ({ role: m.role, content: m.content })),
          ],
          stream: true,
        }),
      });
      if (!res.ok || !res.body) throw new Error(`${res.status} ${await res.text()}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { done: rDone, value } = await reader.read();
        if (rDone) break;
        buf += decoder.decode(value, { stream: true });
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const p of parts) {
          for (const line of p.split("\n")) {
            const t = line.trim();
            if (!t.startsWith("data:")) continue;
            const data = t.slice(5).trim();
            if (data === "[DONE]") {
              done = true;
              break;
            }
            try {
              const json = JSON.parse(data);
              const delta: string = json.choices?.[0]?.delta?.content ?? "";
              if (delta) {
                acc += delta;
                const snapshot = acc;
                setMessages((prev) => {
                  const next = [...prev];
                  next[next.length - 1] = { role: "assistant", content: snapshot };
                  return next;
                });
              }
            } catch {
              /* partial chunk, skip */
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message.slice(0, 200));
        setMessages((prev) => prev.slice(0, -1));
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  function saveKey() {
    localStorage.setItem(KEY_LS, apiKey.trim());
    setShowSettings(false);
    setError("");
  }

  if (mini) {
    return (
      <div className="pet-mini" data-tauri-drag-region onMouseDown={startDrag}>
        <button
          className="pet-avatar"
          style={{ borderColor: pet.color }}
          onClick={toggleMini}
          title={`${pet.name} — click to open chat`}
        >
          {busy ? <Icon d={ICON_CHAT} /> : pet.emoji}
        </button>
      </div>
    );
  }

  return (
    <div className="shell">
      <header className="bar" data-tauri-drag-region onMouseDown={startDrag}>
        <button
          className="pet-badge"
          style={{ borderColor: pet.color }}
          onClick={() => setShowPets((s) => !s)}
          title="Choose pet"
        >
          {pet.emoji}
        </button>
        <span className="title">
          {pet.name} · {MODEL}
        </span>
        <div className="actions">
          <button title="Minimize to pet" onClick={toggleMini}>
            <Icon d={ICON_MINI} />
          </button>
          <button title="Settings" onClick={() => setShowSettings((s) => !s)}>
            <Icon d={ICON_GEAR} />
          </button>
          <button title="Close" onClick={closeApp}>
            <Icon d={ICON_X} />
          </button>
        </div>
      </header>

      {showPets && (
        <div className="pets">
          {PETS.map((p) => (
            <button
              key={p.id}
              className={`pet-opt ${p.id === petId ? "sel" : ""}`}
              style={{ borderColor: p.id === petId ? p.color : "transparent" }}
              onClick={() => pickPet(p.id)}
              title={p.name}
            >
              <span className="pet-emoji">{p.emoji}</span>
              <span className="pet-name">{p.name}</span>
            </button>
          ))}
        </div>
      )}

      {showSettings && (
        <div className="settings">
          <input
            type="password"
            placeholder="Poolside API key"
            value={apiKey}
            onChange={(e) => setApiKey(e.currentTarget.value)}
            onKeyDown={(e) => e.key === "Enter" && saveKey()}
          />
          <button onClick={saveKey}>Save</button>
        </div>
      )}

      <div className="list" ref={listRef}>
        {messages.length === 0 && (
          <div className="welcome">
            <div className="welcome-pet" style={{ borderColor: pet.color }}>
              {pet.emoji}
            </div>
            <p>
              Hi, I'm {pet.name}! Ask anything — I'll stay on top.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === "assistant" && <span className="msg-pet">{pet.emoji}</span>}
            <pre>{m.content || (busy && i === messages.length - 1 ? "⋯" : "")}</pre>
          </div>
        ))}
      </div>

      {error && <div className="err">{error}</div>}

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <textarea
          rows={2}
          placeholder={`Ask ${pet.name}… (Enter send, Shift+Enter newline)`}
          value={input}
          onChange={(e) => setInput(e.currentTarget.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        {busy ? (
          <button type="button" onClick={() => abortRef.current?.abort()}>
            Stop
          </button>
        ) : (
          <button type="submit">Send</button>
        )}
      </form>
    </div>
  );
}
