import { SearchX, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

import type { CreateUserInput, UserListItem } from "@andre/shared";

import { StatusCard } from "@/components/app/status-card";
import { UserDialog } from "@/components/app/user-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/http";

export function UsersPage() {
  const { token, user } = useAuth();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || user?.role !== "admin") {
      setLoading(false);
      return;
    }

    api.getUsers(token)
      .then(setUsers)
      .catch((error) => toast.error(error instanceof Error ? error.message : "Falha ao carregar usuarios."))
      .finally(() => setLoading(false));
  }, [token, user?.role]);

  async function handleCreateUser(input: CreateUserInput) {
    if (!token) {
      return;
    }

    const created = await api.createUser(input, token);
    setUsers((current) => [created, ...current]);
    toast.success("Usuario criado com sucesso.");
  }

  if (user?.role !== "admin") {
    return (
      <StatusCard
        title="Acesso restrito"
        description="Apenas administradores podem acessar a gestao de usuarios."
        icon={ShieldAlert}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle>Usuarios do sistema</CardTitle>
          <CardDescription>Controle basico de acesso para administradores e leitores.</CardDescription>
        </div>
        <UserDialog onSubmit={handleCreateUser} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!users.length ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <StatusCard
                      title="Nenhum usuario adicional"
                      description="Crie um usuario para delegar acesso administrativo ou somente leitura."
                      icon={SearchX}
                      className="border-0 shadow-none"
                    />
                  </TableCell>
                </TableRow>
              ) : null}
              {users.map((currentUser) => (
                <TableRow key={currentUser.id}>
                  <TableCell className="font-medium">{currentUser.name}</TableCell>
                  <TableCell>{currentUser.email}</TableCell>
                  <TableCell>
                    <Badge variant={currentUser.role === "admin" ? "default" : "secondary"}>
                      {currentUser.role === "admin" ? "Administrador" : "Leitor"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={currentUser.active ? "secondary" : "outline"}>
                      {currentUser.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
