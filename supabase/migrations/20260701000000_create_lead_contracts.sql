-- Create lead_contracts table
CREATE TABLE IF NOT EXISTS public.lead_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL UNIQUE REFERENCES public.leads(id) ON DELETE CASCADE,
    
    -- Dados do Contratante
    contratante_razao TEXT,
    contratante_cnpj_cpf TEXT,
    contratante_ie TEXT,
    contratante_telefone TEXT,
    
    -- Responsável
    responsavel_nome TEXT,
    responsavel_cpf TEXT,
    responsavel_cargo TEXT,
    responsavel_telefone TEXT,
    responsavel_email TEXT,
    
    -- Logística do Show
    logistica_endereco TEXT,
    logistica_horario_show TEXT,
    logistica_horario_som TEXT,
    logistica_camarim TEXT,
    logistica_contato_local TEXT,
    
    -- Dados de Rádio / Som / Iluminação
    dados_radio TEXT,
    
    -- Uploads / Links de arquivos
    documento_url TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.lead_contracts ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists and create a new one
DROP POLICY IF EXISTS "Allow all actions for tenant members on lead_contracts" ON public.lead_contracts;
CREATE POLICY "Allow all actions for tenant members on lead_contracts" 
ON public.lead_contracts
FOR ALL 
USING (tenant_id = auth.jwt() ->> 'tenant_id'::text);
