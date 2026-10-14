# Regras de negócio do assistente

O arquivo `regras-negocio.json` concentra as regras que a PO pode mudar sem pedir código: horário do atendimento humano, número do WhatsApp, prazos, mensagens fixas, base de conhecimento e vocabulário da busca. O backend lê esse arquivo quando sobe.

## Como alterar

1. No GitHub, abra `regras/regras-negocio.json` e clique no lápis (Edit).
2. Mude só os valores, mantendo aspas, vírgulas e chaves.
3. Em "Commit changes", escolha **Create a new branch** e abra o pull request.
4. O CI valida o arquivo. Se algo estiver errado, o check mostra o campo e o motivo, por exemplo `atendimento_humano.abre: 'abre' precisa ser antes de 'fecha'`.
5. Com o check verde e o PR aprovado, o merge publica a mudança no próximo deploy.

Se o JSON estiver inválido, o backend não sobe. Assim, um erro de digitação nunca chega ao usuário.

## O que cada campo controla

| Campo | O que muda | Exemplo |
| --- | --- | --- |
| `atendimento_humano.whatsapp` | Número que recebe os atendimentos (DDI + DDD, só dígitos) | `5561999999999` |
| `atendimento_humano.dias` | Dias com atendimento humano | `["segunda", "terca", "quarta", "quinta", "sexta"]` |
| `atendimento_humano.abre` / `fecha` | Horário de Brasília, no formato HH:MM | `"08:00"` / `"18:00"` |
| `atendimento_humano.mensagem_whatsapp` | Texto que já vai preenchido no WhatsApp | usa `{nome}`, `{id_usuario}`, `{motivo}` |
| `atendimento_humano.mensagem_fora_do_horario` | Aviso exibido fora do horário, com o formulário de recado | |
| `documentos.dias_alerta_vencimento` | Quantos dias antes do vencimento o documento aparece como "vencendo" | `30` |
| `consentimento.validade_dias` | Por quantos dias a autorização LGPD vale | `365` |
| `consentimento.mensagem_pedido` | Texto do card que pede a autorização | |
| `consentimento.mensagem_revogacao` | Resposta quando o usuário revoga | |
| `assistente.mensagem_sem_resposta` | Resposta quando a IA não consegue responder | |
| `base_conhecimento` | Regras que a IA usa para responder dúvidas (carência, pagamento, dependentes...) | um item por regra |
| `busca_prestadores.sinonimos` | Termo informal → termo do cadastro | `"doguinho": "caes"` |
| `busca_prestadores.cidades` | Cidade → UF, para achar prestadores cadastrados só com a UF | `"Brasília": "DF"` |

Valores aceitos em `dias`: `segunda`, `terca`, `quarta`, `quinta`, `sexta`, `sabado`, `domingo`.

Valores aceitos em `base_conhecimento[].categoria`: `institutional`, `plan_rules`, `benefits`, `support`.

## Marcadores

Os textos podem usar marcadores, que o backend troca pelo valor atual das regras. Assim, ao mudar o horário, todos os textos que falam dele mudam junto.

| Marcador | Vira |
| --- | --- |
| `{horario_atendimento}` | "segunda a sexta, das 8h às 18h" (montado a partir de `dias`, `abre` e `fecha`) |
| `{dias_alerta_vencimento}` | `30` |
| `{validade_consentimento_dias}` | `365` |

Só a `mensagem_whatsapp` aceita também `{nome}`, `{id_usuario}` e `{motivo}`. Um marcador desconhecido é rejeitado. Para escrever uma chave literal, use `{{` e `}}`.

## O que não está aqui, e por quê

- **Preços e benefícios dos planos** vêm da tabela `planos` do Supabase, que já é a fonte oficial.
- **Regras de segurança da IA** (sem diagnóstico, sem remédio sem receita, emergência para o SAMU 192, resistência a prompt injection) ficam no código, em `app/assistant/prompt.py`. Mudá-las exige revisão técnica e a matriz de testes com o LLM real (`make test-live`).
- **Limites técnicos** (timeouts, mensagens por minuto, tamanho do histórico) são variáveis de ambiente em `app/config.py`.

## Depois de mudar a base de conhecimento

Com o RAG ligado (`EMBEDDINGS_API_KEY`), o índice vetorial precisa ser refeito:

```
python -m scripts.db ingest-kb --yes
```

Enquanto o índice não é refeito, o assistente percebe que o texto mudou e usa a base completa e atual. Ele nunca responde com a regra antiga.

Para validar localmente antes do PR, rode `make regras`.
