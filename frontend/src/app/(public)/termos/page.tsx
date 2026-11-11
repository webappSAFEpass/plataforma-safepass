import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Termos de Uso — SAFEpass",
  description: "Condições de uso da plataforma SAFEpass.",
};

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-4xl px-6 py-14 sm:py-20">
      <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-green">Informações legais</p>
      <h1 className="font-display text-3xl font-bold text-brand-blue sm:text-4xl">Termos de Uso</h1>
      <p className="mt-3 text-sm text-slate-500">Versão de demonstração do projeto acadêmico SAFEpass.</p>
      <div className="mt-8 rounded-xl border border-brand-amber/40 bg-brand-amber-soft/50 p-4 text-sm leading-relaxed text-slate-700">
        Este texto é uma minuta para validar o fluxo de aceite no protótipo. Antes de disponibilizar o serviço ao público, os termos devem ser revisados e aprovados pela equipe responsável e por assessoria jurídica.
      </div>
      <div className="mt-10 max-w-none">
        <h2 className="font-display text-xl font-bold text-brand-blue">1. Sobre a plataforma</h2>
        <p className="mt-3 leading-relaxed text-slate-600">O SAFEpass propõe conectar usuários, famílias, prestadores de serviços e empresas a informações e benefícios relacionados a saúde e bem-estar. A disponibilidade de cada funcionalidade pode variar conforme sua implementação e integração.</p>
        <h2 className="mt-8 font-display text-xl font-bold text-brand-blue">2. Cadastro e segurança da conta</h2>
        <p className="mt-3 leading-relaxed text-slate-600">A pessoa usuária deve fornecer informações verdadeiras, manter seus dados de acesso em sigilo e comunicar à equipe qualquer uso não autorizado da conta. Não é permitido utilizar a plataforma para atividades ilícitas ou para enviar informações de terceiros sem autorização.</p>
        <h2 className="mt-8 font-display text-xl font-bold text-brand-blue">3. Planos e pagamentos</h2>
        <p className="mt-3 leading-relaxed text-slate-600">Os recursos e limites de cada plano são apresentados na página de planos. Na versão de demonstração, a contratação é simulada e não gera cobrança financeira. Quando um provedor de pagamento real for configurado, condições de recorrência, cancelamento, reembolso e cobrança deverão ser detalhadas antes da ativação.</p>
        <h2 className="mt-8 font-display text-xl font-bold text-brand-blue">4. Privacidade e proteção de dados</h2>
        <p className="mt-3 leading-relaxed text-slate-600">Os dados devem ser utilizados apenas para as finalidades informadas e tratados com medidas de segurança adequadas. A versão de produção deverá disponibilizar uma política de privacidade específica, com informações sobre bases legais, retenção, compartilhamentos e canais para exercício dos direitos previstos na legislação aplicável.</p>
        <h2 className="mt-8 font-display text-xl font-bold text-brand-blue">5. Limites e disponibilidade</h2>
        <p className="mt-3 leading-relaxed text-slate-600">O projeto pode passar por manutenção, atualização ou indisponibilidade. As informações apresentadas pela plataforma não substituem orientação médica profissional nem representam garantia de disponibilidade de serviços de terceiros.</p>
        <h2 className="mt-8 font-display text-xl font-bold text-brand-blue">6. Contato</h2>
        <p className="mt-3 leading-relaxed text-slate-600">Dúvidas sobre estes termos podem ser encaminhadas para safepass.contato@gmail.com.</p>
      </div>
    </article>
  );
}
