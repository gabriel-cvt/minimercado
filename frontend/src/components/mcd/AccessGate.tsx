import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { KeyRound, LogIn } from "lucide-react";
import { ApiError, getOperationalKey, setOperationalKey, verifyOperationalAccess } from "@/lib/api";
import { BrandLogo } from "@/branding/BrandLogo";

export function AccessGate({ pathname, children }: { pathname: string; children: ReactNode }) {
  const isPublic = pathname.startsWith("/painel");
  const [status, setStatus] = useState<"checking" | "locked" | "open">(
    isPublic ? "open" : "checking",
  );
  const [key, setKey] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isPublic) {
      setStatus("open");
      return;
    }
    if (!getOperationalKey()) {
      setStatus("locked");
      return;
    }
    verifyOperationalAccess()
      .then(() => setStatus("open"))
      .catch(() => {
        setOperationalKey("");
        setStatus("locked");
      });
  }, [isPublic]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setOperationalKey(key.trim());
    try {
      await verifyOperationalAccess();
      setStatus("open");
    } catch (requestError) {
      setOperationalKey("");
      setError(
        requestError instanceof ApiError ? requestError.message : "Não foi possível validar.",
      );
    }
  };

  if (status === "open") return children;
  if (status === "checking") {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Validando acesso…
      </div>
    );
  }
  return (
    <main className="grid min-h-screen place-items-center bg-background p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-3xl border bg-card p-7 shadow-elegant"
      >
        <BrandLogo />
        <div className="mt-6 flex items-center gap-2 text-primary">
          <KeyRound className="size-5" />
          <span className="text-sm font-bold uppercase tracking-wide">Acesso operacional</span>
        </div>
        <h1 className="mt-2 text-2xl font-black">Informe a chave de acesso</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Necessária para pedidos, produtos, cozinha, resultados e configurações.
        </p>
        <input
          autoFocus
          type="password"
          value={key}
          onChange={(event) => setKey(event.target.value)}
          className="input mt-5"
          placeholder="Chave operacional"
        />
        {error && <p className="mt-3 text-sm font-semibold text-destructive">{error}</p>}
        <button
          disabled={!key.trim()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-40"
        >
          <LogIn className="size-4" />
          Entrar
        </button>
      </form>
    </main>
  );
}
