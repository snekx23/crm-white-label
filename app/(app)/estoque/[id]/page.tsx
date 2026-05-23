import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowDown, ArrowUp, RefreshCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyBRL } from "@/lib/utils";
import { MovementForm } from "./movement-form";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireContext();
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId)
    .single();
  if (!product) notFound();

  const { data: movements } = await supabase
    .from("stock_movements")
    .select("*")
    .eq("product_id", id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="p-6">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link href="/estoque"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
      </Button>

      <header className="mb-6">
        <h1 className="text-2xl font-bold">{product.name}</h1>
        <p className="text-sm text-muted-foreground">
          SKU: {product.sku ?? "-"} - {formatCurrencyBRL(product.price_cents)}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Estoque atual</CardTitle></CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{product.stock_quantity}</p>
            <p className="text-xs text-muted-foreground">minimo: {product.min_stock}</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Registrar movimentacao</CardTitle></CardHeader>
          <CardContent>
            <MovementForm productId={product.id} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader><CardTitle>Historico</CardTitle></CardHeader>
          <CardContent>
            <ul className="divide-y">
              {(movements ?? []).length === 0 && (
                <p className="py-4 text-sm text-muted-foreground">Sem movimentacoes ainda.</p>
              )}
              {movements?.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="flex items-center gap-2">
                    {m.kind === "in" && <ArrowDown className="h-4 w-4 text-green-600" />}
                    {m.kind === "out" && <ArrowUp className="h-4 w-4 text-red-600" />}
                    {m.kind === "adjust" && <RefreshCcw className="h-4 w-4 text-blue-600" />}
                    <span className="font-medium">
                      {m.kind === "in" ? "Entrada" : m.kind === "out" ? "Saida" : "Ajuste"}
                    </span>
                    <span className="text-muted-foreground">{m.reason ?? ""}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-semibold">{m.quantity}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.created_at).toLocaleString("pt-BR")}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
