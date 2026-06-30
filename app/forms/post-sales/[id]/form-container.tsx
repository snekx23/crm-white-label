"use client";

import { useState, useTransition } from "react";
import { submitLogisticsForm } from "./form-actions";

export function FormContainer({ leadId }: { leadId: string }) {
  const [pending, start] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showTime, setShowTime] = useState("");
  const [address, setAddress] = useState("");
  const [technicalRider, setTechnicalRider] = useState("");
  const [billingCnpj, setBillingCnpj] = useState("");
  const [billingName, setBillingName] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!showTime || !address || !billingName || !billingCnpj) {
      setError("Por favor, preencha todos os campos obrigatórios (*).");
      return;
    }
    setError(null);

    start(async () => {
      const res = await submitLogisticsForm(leadId, {
        showTime,
        address,
        technicalRider,
        billingCnpj,
        billingName,
      });

      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error || "Ocorreu um erro ao enviar os dados. Tente novamente.");
      }
    });
  }

  if (success) {
    return (
      <div className="text-center py-8 px-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 mb-6 border border-emerald-200">
          <svg className="w-10 h-10 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Obrigado!</h2>
        <p className="mt-3 text-slate-600 text-lg leading-relaxed">
          As informações de logística foram recebidas com sucesso. Nossa equipe já foi notificada e dará andamento ao pós-venda.
        </p>
        <div className="mt-8 text-sm text-slate-400">
          Você pode fechar esta janela.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm font-medium">
          ⚠️ {error}
        </div>
      )}

      {/* Horário */}
      <div className="space-y-2">
        <label htmlFor="showTime" className="block text-lg font-semibold text-slate-700">
          Horário do Show *
        </label>
        <input
          id="showTime"
          type="text"
          placeholder="Ex: 22:00h às 02:00h"
          value={showTime}
          onChange={(e) => setShowTime(e.target.value)}
          disabled={pending}
          required
          className="w-full text-lg py-3 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm"
        />
      </div>

      {/* Endereço */}
      <div className="space-y-2">
        <label htmlFor="address" className="block text-lg font-semibold text-slate-700">
          Endereço / Local do Show *
        </label>
        <input
          id="address"
          type="text"
          placeholder="Ex: Clube Harmonia, Av. Central 123 - Centro, Gramado/RS"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          disabled={pending}
          required
          className="w-full text-lg py-3 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm"
        />
      </div>

      {/* Rider Técnico */}
      <div className="space-y-2">
        <label htmlFor="technicalRider" className="block text-lg font-semibold text-slate-700">
          Rider Técnico & Observações (Opcional)
        </label>
        <textarea
          id="technicalRider"
          rows={4}
          placeholder="Indique necessidades de som, palco, alimentação ou observações especiais."
          value={technicalRider}
          onChange={(e) => setTechnicalRider(e.target.value)}
          disabled={pending}
          className="w-full text-lg py-3 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm resize-none"
        />
      </div>

      <div className="border-t border-slate-100 pt-6 my-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          💳 Dados para Faturamento / Nota Fiscal
        </h3>

        <div className="grid gap-4 md:grid-cols-2">
          {/* CNPJ / CPF */}
          <div className="space-y-2">
            <label htmlFor="billingCnpj" className="block text-base font-semibold text-slate-700">
              CNPJ ou CPF *
            </label>
            <input
              id="billingCnpj"
              type="text"
              placeholder="00.000.000/0001-00"
              value={billingCnpj}
              onChange={(e) => setBillingCnpj(e.target.value)}
              disabled={pending}
              required
              className="w-full text-base py-3 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm"
            />
          </div>

          {/* Razão Social */}
          <div className="space-y-2">
            <label htmlFor="billingName" className="block text-base font-semibold text-slate-700">
              Razão Social / Nome Completo *
            </label>
            <input
              id="billingName"
              type="text"
              placeholder="Ex: Associação Recreativa..."
              value={billingName}
              onChange={(e) => setBillingName(e.target.value)}
              disabled={pending}
              required
              className="w-full text-base py-3 px-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg shadow-lg hover:shadow-xl active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {pending ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Enviando...
          </>
        ) : (
          "Enviar Informações"
        )}
      </button>
    </form>
  );
}
