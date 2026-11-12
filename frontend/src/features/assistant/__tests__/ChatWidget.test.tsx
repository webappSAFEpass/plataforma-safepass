import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { atendimento, replyFrames, sseResponse } from "@/mocks/assistant";
import { server } from "@/mocks/node";

import { renderWithUser } from "../../../../tests/render";
import { ChatWidget } from "..";
import type { Card } from "../lib/contracts";

const provider: Card = {
  type: "providers",
  total: 1,
  data: [
    {
      id: "p1",
      nome: "Clínica Equilíbrio",
      categoria: "Psicologia",
      registroProfissional: "CRP 06/112233",
      descricao: "Atendimento humanizado",
      tags: ["ansiedade"],
      modalidade: "Online",
      localizacao: "São Paulo - SP",
      faixaPreco: "R$ 150 a R$ 200",
      avaliacao: 4.9,
      qtdAvaliacoes: 36,
      telefone: "(11) 99821-1144",
    },
  ],
};

const documents: Card = {
  type: "documents",
  data: [
    {
      id: "d1",
      titularId: "89",
      titularNome: "Ana",
      tipo: "Carteirinha",
      validade: "2026-12-01",
      status: "vencendo",
    },
  ],
};

async function startChat(message = "Quero um psicólogo") {
  const rendered = renderWithUser(<ChatWidget />);
  const { user } = rendered;
  await user.click(screen.getByRole("button", { name: "Abrir assistente virtual" }));
  await user.type(screen.getByLabelText("Nome"), "Ana Souza");
  await user.type(screen.getByLabelText("Telefone"), "(61) 99999-0000");
  await user.type(screen.getByLabelText("Como podemos ajudar?"), message);
  await user.click(screen.getByRole("button", { name: "Iniciar conversa" }));
  return rendered;
}

function conversation() {
  return screen.getByRole("log", { name: "Conversa com o assistente" });
}

describe("ChatWidget", () => {
  it("abre, faz a triagem e mostra a resposta do assistente", async () => {
    await startChat();

    expect(await within(conversation()).findByText("Olá! Como posso ajudar?")).toBeInTheDocument();
    expect(within(conversation()).getByText("Quero um psicólogo")).toBeInTheDocument();
    expect(screen.getByText("Atendendo Ana")).toBeInTheDocument();
  });

  it("valida a triagem antes de abrir o atendimento", async () => {
    const { user } = renderWithUser(<ChatWidget />);
    await user.click(screen.getByRole("button", { name: "Abrir assistente virtual" }));

    await user.type(screen.getByLabelText("Telefone"), "123");
    await user.click(screen.getByRole("button", { name: "Iniciar conversa" }));

    expect(screen.getByText("Informe seu nome.")).toBeInTheDocument();
    expect(screen.getByText("Informe um telefone válido.")).toBeInTheDocument();
    expect(screen.getByText("Conte como podemos ajudar.")).toBeInTheDocument();
  });

  it("volta ao formulário, com os dados, se não conseguir abrir o atendimento", async () => {
    server.use(http.post("/api/lead", () => HttpResponse.json({ error: "x" }, { status: 503 })));

    await startChat();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível iniciar o atendimento.",
    );
    expect(screen.getByLabelText("Nome")).toHaveValue("Ana Souza");
  });

  it("continua a conversa pelo campo de mensagem", async () => {
    const { user } = await startChat();
    await within(conversation()).findByText("Olá! Como posso ajudar?");
    server.use(
      http.post("/api/chat", () => sseResponse(replyFrames("Encontrei 1 prestador.", [provider]))),
    );

    await user.type(screen.getByRole("textbox", { name: "Mensagem" }), "E em São Paulo?{Enter}");

    expect(await within(conversation()).findByText("Encontrei 1 prestador.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Clínica Equilíbrio" })).toBeInTheDocument();
  });

  it("pede consentimento e refaz a pergunta depois do sim", async () => {
    const consent: Card = { type: "consent", data: { message: "Posso consultar seus dados?" } };
    const replies = [
      replyFrames("Preciso da sua autorização.", [consent]),
      replyFrames("Sua carteirinha vence em dezembro.", [documents]),
    ];
    server.use(http.post("/api/chat", () => sseResponse(replies.shift() ?? replyFrames("fim"))));
    const { user } = await startChat("Meus documentos");

    await user.click(await screen.findByRole("button", { name: "Sim, autorizo" }));

    expect(
      await within(conversation()).findByText("Sua carteirinha vence em dezembro."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Carteirinha" })).toBeInTheDocument();
  });

  it("responde sem consultar dados quando o usuário nega", async () => {
    const consent: Card = { type: "consent", data: { message: "Posso consultar seus dados?" } };
    server.use(
      http.post("/api/chat", () =>
        sseResponse(replyFrames("Preciso da sua autorização.", [consent])),
      ),
    );
    const { user } = await startChat("Meus documentos");

    await user.click(await screen.findByRole("button", { name: "Não" }));

    expect(
      await screen.findByText(/Sem a sua autorização eu não consulto seus dados/),
    ).toBeInTheDocument();
  });

  it("oferece recado quando o assistente falha e envia o recado", async () => {
    server.use(http.post("/api/chat", () => HttpResponse.json({ error: "fora" }, { status: 500 })));
    const { user } = await startChat();

    expect(await screen.findByText(/Tive um problema para responder agora/)).toBeInTheDocument();
    expect(screen.getByText(atendimento.mensagemForaDoHorario)).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Seu recado" }), "Me liguem amanhã");
    await user.click(screen.getByRole("button", { name: "Deixar recado" }));

    expect(await screen.findByText(/Recado enviado/)).toBeInTheDocument();
  });

  it("não oferece recado quando é só excesso de mensagens", async () => {
    server.use(
      http.post("/api/chat", () => HttpResponse.json({ error: "calma" }, { status: 429 })),
    );
    await startChat();

    expect(await screen.findByText(/muitas mensagens seguidas/)).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Seu recado" })).not.toBeInTheDocument();
  });

  it("mostra o link do WhatsApp dentro do horário", async () => {
    const whatsapp: Card = {
      type: "whatsapp",
      data: { withinHours: true, link: "https://wa.me/5561999990000", message: "Fale com a gente" },
    };
    server.use(
      http.post("/api/chat", () =>
        sseResponse(replyFrames("Vou te passar para um atendente.", [whatsapp])),
      ),
    );
    await startChat();

    expect(await screen.findByRole("link", { name: /Falar no WhatsApp/ })).toHaveAttribute(
      "href",
      "https://wa.me/5561999990000",
    );
  });

  it("volta ao formulário pelo botão de voltar e fecha pelo Esc", async () => {
    const { user } = await startChat();
    await within(conversation()).findByText("Olá! Como posso ajudar?");

    await user.click(screen.getByRole("button", { name: "Voltar à identificação" }));
    expect(screen.getByLabelText("Nome")).toHaveValue("");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
