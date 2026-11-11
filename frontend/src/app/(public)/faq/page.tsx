import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dúvidas frequentes — SAFEpass",
  description: "Respostas às dúvidas mais comuns sobre cadastro, planos e uso do SAFEpass.",
};

const QUESTIONS = [
  {
    question: "O que é o SAFEpass?",
    answer: "O SAFEpass conecta pessoas, famílias, prestadores e empresas a serviços e benefícios de saúde e bem-estar. As funcionalidades disponíveis dependem da etapa de integração de cada módulo.",
  },
  {
    question: "Como criar uma conta?",
    answer: "Use o botão “Criar Conta Grátis” no menu superior e selecione o seu perfil. Informe nome, e-mail e uma senha com pelo menos oito caracteres, incluindo letras e números.",
  },
  {
    question: "Quais são os planos disponíveis?",
    answer: "Os planos Free, Aura e Aura+ aparecem na seção “Nossos Planos”. Preços, limites e benefícios são carregados da API e podem ser atualizados pela administração.",
  },
  {
    question: "O pagamento dos planos está ativo?",
    answer: "Nesta versão do projeto, a contratação usa um gateway de demonstração. Nenhuma cobrança real é feita e nenhum dado de cartão é solicitado. A cobrança real depende da escolha e configuração de um provedor de pagamentos.",
  },
  {
    question: "Esqueci minha senha. Como recupero o acesso?",
    answer: "Na janela de login, selecione “Esqueceu sua senha?”. Se o e-mail estiver cadastrado, as instruções serão enviadas para ele. Em ambiente local, consulte a caixa de e-mails de desenvolvimento configurada pelo projeto.",
  },
  {
    question: "Como indicar um profissional?",
    answer: "Na página inicial, use o botão de indicação, informe o nome do profissional e, se souber, a especialidade e um contato. A equipe pode acompanhar a indicação no painel administrativo.",
  },
  {
    question: "Como falo com a equipe?",
    answer: "Envie um e-mail para safepass.contato@gmail.com ou use o link de WhatsApp disponível no rodapé do site.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-14 sm:py-20">
      <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-brand-green">Central de ajuda</p>
      <h1 className="font-display text-3xl font-bold text-brand-blue sm:text-4xl">Dúvidas frequentes</h1>
      <p className="mb-10 mt-3 max-w-2xl leading-relaxed text-slate-500">
        Veja respostas rápidas sobre a plataforma e seus recursos nesta versão do SAFEpass.
      </p>
      <div className="space-y-4">
        {QUESTIONS.map(({ question, answer }) => (
          <details key={question} className="group rounded-2xl border border-brand-blue-soft bg-white p-5 open:bg-brand-blue-soft/20">
            <summary className="cursor-pointer list-none pr-6 font-semibold text-ink marker:hidden">
              <span className="flex items-center justify-between gap-4">{question}<span className="text-xl text-brand-blue transition group-open:rotate-45">+</span></span>
            </summary>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">{answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
