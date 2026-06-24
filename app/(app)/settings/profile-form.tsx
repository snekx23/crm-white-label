"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfileName } from "./actions";

export function ProfileForm({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setMsg(null);
    start(async () => {
      try {
        await updateProfileName(name);
        setMsg("Nome atualizado com sucesso.");
      } catch (err) {
        setMsg((err as Error).message);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="profile-name">Seu nome</Label>
        <Input
          id="profile-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Digite seu nome"
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{msg}</p>
        <Button type="submit" variant="brand" disabled={pending || !name.trim()}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
            </>
          ) : (
            "Salvar"
          )}
        </Button>
      </div>
    </form>
  );
}
