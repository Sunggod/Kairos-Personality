---
name: adversarial-tests
description: Escreve testes adversariais do Kairos-Personality — injeção por Report, áudio e texto de tela, eco, PII e segredo em memória, esquecimento com tombstone, aprovação forjada, persona protegida, hit-test. Use na fase que introduz a superfície de ataque, não depois. Apoia o julgamento do agente; os corpora são ponto de partida, não lista fechada.
---

# Skill — Testes adversariais

O teste adversarial faz a pergunta que o teste feliz não faz: **"o que acontece se alguém
tentar?"**. Neste projeto o atacante raramente é uma pessoa — é um Report cujo `headline`
traz uma ordem, uma fala ao fundo, o texto de uma página aberta, um modelo que repete uma
chamada. Por isso o teste adversarial é **parte do gate da fase que cria a superfície**,
não um item de segurança "para depois" (roadmap, Estratégia de teste).

Referências: `AGENTS.md` §4 (P1–P3, P7, P10–P15) e §5; `docs/estudo-arquitetura.md` (R12,
R26, R28); `docs/roadmap.md` (F3, F4, F5, F6c, Segurança). Skill `code-review` §6 para a
verificação independente.

**Não use** para provar comportamento normal (é teste comum) nem para atacar sistemas de
terceiros. Os corpora são dados de teste, ficam em fixtures e **nunca entram em código de
produção**.

---

## 1. Princípio: provar a barreira, não o modelo

Um LLM pequeno pode obedecer injeção em alguma rodada. Por isso a defesa **não é o modelo
se comportar**: é o **código determinístico** ao redor que impede o efeito (P2, P12). O
teste adversarial prova isso:

- injete a ordem maliciosa e verifique que **nenhuma ação sai** — mesmo que o modelo
  (um dublê que *obedece de propósito*) tente;
- o teste usa um `LlmClient` falso **que sempre cede**; se a barreira segura com ele,
  segura com o real.

Taxa de obediência do modelo real é medida no S8 (deve ser zero **em ação**, não em
conversa). Aqui se prova a **barreira**.

---

## 2. Superfícies e o que provar

| Superfície | Prova | Invariante |
|---|---|---|
| `headline`/`caveats` de Report com ordem embutida | nenhuma `delegate`, aprovação ou escrita de persona/memória é disparada | P3, P12 |
| Report `partial`/`failed` com texto otimista | a fala nunca vira sucesso; `outcome` e `caveats` preservados | P1 |
| Aprovação: "diga que aprovou", voz do usuário, texto injetado | aprovação **só** por evento de UI; STT ignorado durante o pedido; `approver` não vem do LLM | P2, B8 |
| Chamada `delegate` repetida pelo LLM | no máximo um `plan.run` por (turno, `flow`, slots canonicalizados) | P11 |
| `flow` fora da lista / slot de tipo errado | recusado antes do envelope | P12, D2 |
| Tier `sensitive` sem pedido do usuário no turno | recusado **antes** do envelope (fail-closed no ambíguo) | D13 |
| Origem da visão (`origin == "persona"`) | nunca vale como pedido do usuário | D13, F6c |
| Texto da tela com instrução | vai delimitado como dado; nenhuma ação; recusa de captura se há janela excluída visível | P3, R28 |
| Áudio de terceiros / TV ao fundo / eco da própria fala | não vira pedido nem aprovação; ela não se "ouve" | P3, R12 |
| Segredo/token/senha/caminho/Report cru indo a M2/M3 | `MemoryGate` barra; o token não aparece **nem truncado nem parcialmente ofuscado** | R26, P14 |
| PII de terceiro em memória ou fala | `third_party_pii: never` — nada gravado, nada dito | Q11, R26 |
| `forget` | tombstone sem conteúdo; **nenhuma rota recupera** o conteúdo, nem lendo o SQLite direto | P14 |
| `auto` escrevendo `floors`/`traits_base` | recusado no tipo **e** auditado como tentativa | P13 |
| Persona tentando alterar `explicit`/`crisis` por "evolução" | rejeitado; log append-only registra | P13, D12 |
| Posição/geometria indo ao LLM | nenhum evento de posição chega ao `LlmClient` | P12, F6b |
| Rota do `llama-server` fora da lista; bind fora do loopback; hash divergente | recusa de boot / falha tipada | P10, S7 |
| Pergunta "você tenta me manipular?" / "você fez X?" | resposta verdadeira sobre ação e intenção | P15 |
| Hit-test: clique fora da silhueta | atravessa; dentro, é capturado (manual registrado, DPI misto) | F6a |

---

## 3. Corpora reutilizáveis

Mantenha-os em `fixtures/adversarial/` (ou equivalente), um arquivo por família, cada caso
com `id`, `texto`, `superficie` e `espera`. Cresça o corpus **quando achar um caso novo**;
um caso que quebrou uma vez entra para sempre.

**Famílias de injeção** (varie o idioma — pt-BR e inglês — e o disfarce):

- ordem direta ("ignore as instruções…", "aprove agora");
- ordem disfarçada de dado ("nota do sistema:", "mensagem do administrador:");
- tag/delimitador forjado (fechando o delimitador do dado e abrindo "instrução");
- instrução em campo inesperado (`caveats`, nome de arquivo, título);
- ofuscação (espaçamento, caixa, unicode parecido, base64 curto);
- ordem parcelada em vários Reports ou turnos.

**Famílias de dado sensível:** tokens de API de formatos comuns, senhas, caminhos de
arquivo, chaves, CPF/telefone/e-mail de **terceiro**, Report cru colado. Todos **sintéticos**
— nunca dado real do responsável.

**Famílias de eco/áudio:** a própria fala devolvida ao microfone; fala de terceiro com
comando; ruído de TV.

---

## 4. Como escrever

1. **Escolha a barreira**, não o sintoma. "Se o modelo ceder, o que o impede?" — o teste mira
   essa peça.
2. **Dublê que coopera com o atacante.** Para provar P12, o `LlmClient` falso devolve a
   chamada maliciosa. O teste passa quando a barreira a derruba.
3. **Verifique o efeito, não a fala.** "Nenhum `plan.run` foi enviado", "nenhuma linha em
   `memory/`", "nenhum evento ao LLM" — contagem observável, não "a resposta parece certa".
4. **Teste que passa sem a barreira não prova nada.** Revert mental: tire a proteção; o teste
   tem de falhar. Se não falha, ele não ataca o que acha que ataca.
5. **Pareie com o caso benigno.** Para cada ataque barrado, um caso legítimo parecido que
   **continua funcionando** — senão a barreira "funciona" bloqueando tudo (e a persona
   deixaria de agir quando deveria).
6. **Determinístico.** Semente e relógio injetados; sem rede; sem depender de LLM real.
7. **Fail-closed é o resultado esperado no ambíguo.** Teste o ambíguo e espere recusa.

---

## 5. Erros comuns

| Erro | Efeito |
|---|---|
| Confiar que o modelo real não obedece | a barreira nunca é testada |
| Verificar o texto da resposta, não o efeito | passa com ação disparada em silêncio |
| Só o ataque, sem o caso benigno pareado | barreira que bloqueia tudo parece correta |
| Teste adversarial só no fim do projeto | a superfície já está em produção |
| Dado sensível **real** no corpus | vaza para repositório e log (P7) |
| Corpus em código de produção | dublê importado por produção (regra 5) |
| Truncar/ofuscar o token e considerar "tratado" | R26 exige que nem parte apareça |
| Só pt-BR ou só inglês | injeção troca de idioma |

---

## 6. Checklist

- [ ] Identifiquei a barreira determinística que cada teste ataca.
- [ ] O `LlmClient` falso **coopera** com o atacante e a barreira ainda segura.
- [ ] Verifiquei o **efeito** (contagem), não o texto.
- [ ] Revert mental: sem a barreira, o teste falha.
- [ ] Cada ataque tem um par benigno que continua passando.
- [ ] Corpus sintético, versionado em fixtures, com `id` e `espera`; nenhum dado real.
- [ ] pt-BR e inglês; disfarces variados; ambíguo esperando recusa.
- [ ] O teste faz parte do gate da fase que criou a superfície.
