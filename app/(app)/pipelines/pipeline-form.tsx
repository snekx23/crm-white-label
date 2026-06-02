import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createPipeline } from "./actions";

export function PipelineForm() {
  return (
    <form action={createPipeline} className="flex flex-wrap items-center gap-3">
      <Input name="name" required placeholder="Nome do novo funil" className="w-64" />
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input name="is_default" type="checkbox" className="h-4 w-4 accent-[hsl(var(--brand))]" />
        Tornar principal
      </label>
      <Button type="submit">
        <Plus className="mr-2 h-4 w-4" />
        Criar funil
      </Button>
    </form>
  );
}
