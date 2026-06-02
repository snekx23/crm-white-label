type Definition = {
  key: string;
  field_type: "text" | "number" | "date" | "select" | "boolean" | "file";
  is_required: boolean;
};

export function normalizeCustomFieldValues(
  definitions: Definition[],
  values: Record<string, unknown>,
) {
  return Object.fromEntries(definitions.flatMap((definition) => {
    const raw = values[definition.key];
    if ((raw === undefined || raw === null || raw === "") && definition.is_required) {
      throw new Error(`Campo obrigatorio: ${definition.key}`);
    }
    if (raw === undefined || raw === null || raw === "") return [];
    if (definition.field_type === "number") {
      const number = Number(raw);
      if (!Number.isFinite(number)) throw new Error(`Numero invalido: ${definition.key}`);
      return [[definition.key, number]];
    }
    if (definition.field_type === "boolean") return [[definition.key, raw === true || raw === "true"]];
    return [[definition.key, String(raw)]];
  }));
}
