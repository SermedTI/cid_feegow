import { useState, type FormEvent } from "react";

import type { CreateUserInput, UserRole } from "@andre/shared";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface UserDialogProps {
  onSubmit: (input: CreateUserInput) => Promise<void>;
}

const INITIAL_STATE: CreateUserInput = {
  name: "",
  email: "",
  password: "",
  role: "reader",
};

export function UserDialog({ onSubmit }: UserDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateUserInput>(INITIAL_STATE);
  const [saving, setSaving] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setForm(INITIAL_STATE);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
      setForm(INITIAL_STATE);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  function setRole(role: UserRole) {
    setForm((current) => ({ ...current, role }));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Novo usuario</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar usuario</DialogTitle>
          <DialogDescription>Cadastro basico com papel administrativo ou de leitura.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <Input placeholder="Nome completo" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          <Input placeholder="Email" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          <Input placeholder="Senha provisoria" type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
          <fieldset className="flex flex-col gap-3">
            <legend className="text-sm font-medium text-foreground">Perfil de acesso</legend>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={form.role === "reader" ? "default" : "outline"}
                aria-pressed={form.role === "reader"}
                onClick={() => setRole("reader")}
              >
                Leitor
              </Button>
              <Button
                type="button"
                variant={form.role === "admin" ? "default" : "outline"}
                aria-pressed={form.role === "admin"}
                onClick={() => setRole("admin")}
              >
                Administrador
              </Button>
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar usuario"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
