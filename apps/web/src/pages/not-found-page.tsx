import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-3xl font-semibold">Pagina nao encontrada</h1>
      <p className="text-muted-foreground">A rota solicitada nao existe neste frontend.</p>
      <Button asChild>
        <Link to="/">Voltar ao dashboard</Link>
      </Button>
    </div>
  );
}
