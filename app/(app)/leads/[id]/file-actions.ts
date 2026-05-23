"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";
import type { FileRow } from "@/lib/supabase/database.types";

export async function getTenantStoragePath(leadId: string): Promise<string> {
  const ctx = await requireContext();
  return `${ctx.tenantId}/${leadId}`;
}

export async function persistLeadFile(input: {
  leadId: string;
  name: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
}): Promise<FileRow> {
  const ctx = await requireContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("files")
    .insert({
      tenant_id: ctx.tenantId,
      lead_id: input.leadId,
      uploaded_by: ctx.userId,
      name: input.name,
      storage_path: input.storagePath,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  revalidatePath(`/leads/${input.leadId}`);
  return data as FileRow;
}

export async function deleteLeadFile(fileId: string, storagePath: string) {
  const ctx = await requireContext();
  const supabase = await createClient();
  await supabase.storage.from("lead-files").remove([storagePath]);
  await supabase.from("files").delete().eq("id", fileId).eq("tenant_id", ctx.tenantId);
}

export async function getSignedFileUrl(storagePath: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from("lead-files")
    .createSignedUrl(storagePath, 60 * 5);
  return data?.signedUrl ?? null;
}
