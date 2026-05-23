"use client";

import { useState, useTransition } from "react";
import Papa from "papaparse";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { importLeadsCSV } from "./actions";

export function ImportCsvDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (parsed) => {
        const rows = parsed.data.map((r) => ({
          name: r.name ?? r.nome ?? "",
          phone: r.phone ?? r.telefone ?? r.celular ?? "",
          email: r.email ?? "",
          source: r.source ?? r.origem ?? "",
        }));
        start(async () => {
          const { count } = await importLeadsCSV(rows);
          setResult(`${count} leads importados`);
          setTimeout(() => {
            setOpen(false);
            setResult(null);
            setFile(null);
          }, 1200);
        });
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4" /> Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Importar leads (CSV)</DialogTitle>
          <DialogDescription>
            Cabecalhos esperados: <code>name, phone, email, source</code> (aceita tambem nome/telefone/origem).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          {result && <p className="text-sm text-brand">{result}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand" disabled={!file || pending}>
              {pending ? "Importando..." : "Importar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
