"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";
import type { StockMovementKind } from "@/lib/supabase/database.types";

const productSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0),
  cost: z.number().min(0),
  stock_quantity: z.number().int().min(0),
  min_stock: z.number().int().min(0),
});

export async function createProduct(formData: FormData) {
  const ctx = await requireContext();
  const supabase = await createClient();

  const parsed = productSchema.parse({
    name: formData.get("name"),
    sku: formData.get("sku") || undefined,
    description: formData.get("description") || undefined,
    price: Number(formData.get("price") ?? 0),
    cost: Number(formData.get("cost") ?? 0),
    stock_quantity: Number(formData.get("stock_quantity") ?? 0),
    min_stock: Number(formData.get("min_stock") ?? 0),
  });

  const { error } = await supabase.from("products").insert({
    tenant_id: ctx.tenantId,
    name: parsed.name,
    sku: parsed.sku ?? null,
    description: parsed.description ?? null,
    price_cents: Math.round(parsed.price * 100),
    cost_cents: Math.round(parsed.cost * 100),
    stock_quantity: parsed.stock_quantity,
    min_stock: parsed.min_stock,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/estoque");
}

export async function deleteProduct(id: string) {
  const ctx = await requireContext();
  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId);
  if (error) throw new Error(error.message);
  revalidatePath("/estoque");
}

export async function recordMovement(input: {
  productId: string;
  kind: StockMovementKind;
  quantity: number;
  reason?: string;
}) {
  const ctx = await requireContext();
  const supabase = await createClient();
  const { error } = await supabase.from("stock_movements").insert({
    tenant_id: ctx.tenantId,
    product_id: input.productId,
    user_id: ctx.userId,
    kind: input.kind,
    quantity: input.quantity,
    reason: input.reason ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/estoque");
  revalidatePath(`/estoque/${input.productId}`);
}
