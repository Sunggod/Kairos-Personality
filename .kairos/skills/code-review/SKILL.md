---
name: code-review
description: Revisão por camadas de uma entrega ou fase do Kairos-Personality, depois do gate — contrato, P1–P15, segurança, persona protegida, erro, teste, documento, leitura. Use ao fechar uma entrega, uma fase, ou ao revisar trabalho de outro agente. Apoia o julgamento do revisor; não cria regra nova e não aprova nem reprova sozinho.
---

# Skill — Revisão de código

Organiza a **ordem em que olhar** e o que costuma passar batido. Adaptada da skill de revisão
do Brain, com camadas próprias deste projeto: aqui o que mais custa errar é **segurança,
fidelidade e persona**, não genericidade.

Referências: `AGENTS.md` §4 (P1–P15), §5 (regras duras), §6 (o que é do responsável);
`docs/roadmap.md` (gate da fase, "Regra de fechamento", Segurança); `docs/estudo-arquitetura.md`
(a seção que a mudança toca); skills `adversarial-tests`, `contract-first`.

**Não use** para escrever código, decidir arquitetura (`estudo-revisao`) ou definir estilo.

---

## 1. Antes de olhar o código

1. **O pedido:** a Entrega e o **Aceite** no roadmap, e o que o estudo diz da seção.
2. **O gate da fase.** Se existe e não passou, a revisão termina ali.
3. **Tamanho real:** `git diff --stat` antes do conteúdo. Diff muito maior que o pedido,
   sem explicação, volta para divisão.
4. **O que foi tocado:** barreiras de risco alto (§5) exigem mais atenção.

Rode o gate e **só depois** revise forma:

```
bun install && bunx tsc --noEmit && bun test
bun run gen:schema && git diff --exit-code packages/schema/generated   # quando há schema
# + os comandos de gate da fase (verify:runtime-pins, check:delegations, e2e:*, ...)
```

---

## 2. Ordem de revisão

Do mais caro de errar ao mais barato. Achou bloqueador numa camada? Pare nela.

| # | Camada | Pergunta |
|---|---|---|
| 1 | Gate | Compila, testa, e o gate da fase passou **inteiro**? |
| 2 | Invariantes | Alguma de P1–P15 caiu? A entrega *exige* violar alguma? |
| 3 | Segurança | P3, P7, P10: entrada de terceiros como dado, nada sensível em log, runtime pinado |
| 4 | Persona e floors | Algo suavizou a persona, editou `floors`/`traits_base`, ou deu a `auto` o que é `locked`? |
| 5 | Contrato | Dado novo tem Zod, JSON Schema gerado e vetor (felizes **e** de rejeição)? |
| 6 | Erro e honestidade | Erro de transporte vira estado explícito? Há fallback que finge? |
| 7 | Teste | Prova o comportamento ou só passa? |
| 8 | Documento | Código, estudo, roadmap, AGENTS e status contam a mesma história? |
| 9 | Leitura | Um estranho entende sem ler o resto? |

---

## 3. Checklist por camada

### 3.1 Gate

- [ ] `tsc --noEmit` limpo (o Bun transpila, não tipa) e `bun test` verde.
- [ ] Sem `.skip` novo, teste comentado, TODO, `any` silencioso ou placeholder.
- [ ] Os comandos de gate **da fase** existem e passaram — comando que ainda não existe é
      entrega da fase, não motivo para pular.

### 3.2 Invariantes — as que mais caem

- [ ] **P1** `outcome`, `caveats`, `effected` preservados; `partial` nunca vira sucesso.
- [ ] **P2** aprovação só de evento de UI; o LLM não preenche `approver`.
- [ ] **P4/P5** só o núcleo fala com o Brain; **zero nome de ecossistema** em código.
- [ ] **P6** motor novo está atrás de interface, trocável por configuração.
- [ ] **P8** estado afetivo só muda por `affect.step`; o LLM não escreve nele.
- [ ] **P9** `trace` em toda linha de turno, propagado ao Brain e aos spans.
- [ ] **P11** chave de intenção persistida **antes** do `plan.run`; reinício → `unknown`, sem reenvio.
- [ ] **P12** nenhum caminho de ação passa pelo LLM; posição/geometria não vai ao `LlmClient`.
- [ ] **P13** `auto` nunca escreve em `floors`/`traits_base` (no tipo **e** auditado).
- [ ] **P14** tombstone sem conteúdo; esquecer de verdade, não marcar.
- [ ] **P15** a persona não afirma o falso sobre o que fez ou tenta.

### 3.3 Segurança

- [ ] Conteúdo de nó, áudio de fundo e texto da tela entram **delimitados**, nunca como instrução.
- [ ] Serviço local escuta só em loopback; recusa bind fora dele.
- [ ] Binário, GGUF, `mmproj` e arte **pinados por hash**; hash vem do artefato revisado.
- [ ] **Nenhum `*.lock.json` ou manifesto alterado para o gate passar** (regra 1).
- [ ] Nada sensível em log (transcrição, áudio, imagem, memória, texto de tela); sem stack
      trace para o usuário.
- [ ] `--sleep-idle-seconds` ausente; nenhum estado/KV de fonte não confiável restaurado.
- [ ] Telemetria externa inexistente; `data/`, `secrets/`, `*.gguf`, `*.local` fora do git.

### 3.4 Persona e floors

- [ ] Tom forte, sarcasmo e palavrão livre **preservados** (D15, Q11): defeito de "polidez"
      introduzido por agente é regressão, não melhoria.
- [ ] `persona.seed.json`, `floors` e `traits_base` **intocados** por agente.
- [ ] O que depende de julgamento humano (voz, arte, influência) não foi "resolvido" por código.

### 3.5 Contrato

- [ ] Zod é a fonte; JSON Schema gerado em sincronia; `.strict()` na entrada.
- [ ] Vetores com casos de rejeição **e motivo**; estado impossível irrepresentável.
- [ ] `schemaVersion` e migração só para frente quando mudou dado existente.
- [ ] Nenhum `JSON.parse` solto: toda fronteira valida com Zod logo em seguida.
- [ ] Erros do Brain **consumidos**, não redefinidos; mapeados para afeto e fala.

### 3.6 Erro e honestidade

- [ ] Erro de transporte vira estado explícito (`unknown`, `failed`), nunca "deu certo" ou silêncio.
- [ ] 502 sem Report → `unknown`, fala conservadora (B11).
- [ ] Ação irreversível nunca entra em retry automático.
- [ ] **Sem fallback que finja ser a coisa real** (arte corrompida, modelo ausente, projetor
      incompatível, voz fora): aviso visível ou fala honesta.
- [ ] Erro local tipado no arquivo único de erros, com `retryable` e **o que a persona diz**.

### 3.7 Teste

- [ ] Revert mental: sem a mudança, o teste falha?
- [ ] Superfície de terceiros tem teste adversarial com o `LlmClient` que **coopera** com o atacante.
- [ ] Cada ataque barrado tem par benigno que continua funcionando.
- [ ] Dublês só em fixtures; nada de dublê importado por produção.
- [ ] Funções puras recebem relógio e semente por injeção (sem `Date.now()`/`Math.random()`).
- [ ] Teste manual conta só se **registrado** (o que, onde, build, resultado).

### 3.8 Documento

- [ ] Decisão nova está no estudo com data e `[Decidido durante a implementação]`.
- [ ] Mudança que alcança o Brain parou em §11.3 do estudo, sem contorno.
- [ ] `docs/status.md`: registro de gate com o que **não** foi verificado; handoff.
- [ ] `AGENTS.md` atualizado se surgiu convenção.

### 3.9 Leitura

- [ ] Nomes dizem o que fazem; caminho feliz legível antes das bordas.
- [ ] Comentário explica o porquê; nada descrevendo intenção abandonada.
- [ ] UTF-8 sem BOM, sem resíduo de mojibake.

---

## 4. Por tipo de mudança

**Memória/persona** — `MemoryGate` antes de qualquer escrita; tombstone real; promoção
`episodic → semantic` só por chamada nomeada e logada.

**Delegação/LLM** — Zod como única porta; regra de tier fail-closed; Report como dado
delimitado; deduplicação local.

**Voz** — latência só vale ponta a ponta; barge-in cancela a **geração**, não só o áudio;
aprovação por UI com STT ignorado durante o pedido.

**Avatar/shell** — painel destruído, não escondido; lip-sync do áudio reproduzido; render
pausado quando oculto.

**Visão** — desligada por padrão, indicador visível, imagem nunca em disco nem em `memory/`,
lista de exclusão respeitada, origem `persona`, nunca pedido do usuário.

**Implementação de decisão do estudo** — confira se o código faz a decisão, não uma variação
dela. Meio implementado parece pronto e é pior que nada.

**Refactor** — comportamento idêntico, testes existentes cobrem o que foi tocado; "aproveitei
e corrigi" vira duas entregas.

---

## 5. Risco alto: verificação independente

Barreiras onde um erro vira falha de segurança ou de fidelidade. Quem implementou não é o
melhor para achar o que esqueceu: o verificador olha **só a barreira**, tentando burlá-la, e
recebe o aceite e o código — não a explicação de por que está certo.

`MemoryGate` e tombstone (F3) · regra de tier, decodificação restrita, dado delimitado,
deduplicação (F4) · aprovação só por UI (F5) · captura, descarte de imagem, lista de exclusão,
origem da visão (F6c) · manifesto de hash e boot que recusa (F0, F7).

---

## 6. Severidade

| Nível | Significado | Ação |
|---|---|---|
| Bloqueador | Viola P1–P15 ou regra dura; lock alterado para passar; contrato quebrado sem revisão | Não mergeia |
| Alto | Bug, erro engolido, fallback fingido, teste que não prova, doc divergente | Não mergeia sem conserto ou exceção explícita do responsável |
| Médio | Funciona mas cria dívida real | Mergeia com issue |
| Baixo | Melhora local sem risco | Dono decide |
| Nit | Gosto, estilo | Ignora ou diz uma vez; nunca bloqueia |

É **recomendação ao responsável**. O agente não aprova nem reprova entrega sozinho. E não
existe "aceitar o risco" para violação de invariante: a entrega volta e se redesenha.

---

## 7. Como escrever o comentário

```
[severidade] arquivo:linha — o que está errado
Por quê: consequência concreta (viola P12, perde o erro Y, abre o caminho de R26)
Sugestão: caminho mínimo de correção
```

- Uma coisa por comentário; cite a consequência, não a preferência; cite a fonte (P*, R*, D*).
- Diga o que está **bom**, especificamente.
- Não invente requisito: se o pedido não pedia, é sugestão. Não abra frente fora de escopo.
- Acima de ~10 achados, devolva os bloqueadores e peça divisão da entrega.
- Declare o que **não** revisou e o que assumiu como certo.

---

## 8. Quando devolver sem revisar

Gate vermelho (devolva a saída) · diff muito maior que o pedido sem explicação · contrato
mudou sem vetor ou schema · comportamento novo sem teste · mudança que só funciona alterando
o Brain.

---

## 9. Erros comuns do revisor

| Erro | Efeito |
|---|---|
| Revisar forma antes do gate | comentário em código que nem compila |
| Aprovar sem ler o teste | passa a tarefa, não prova nada |
| Parar no óbvio | deixa P12, P13 e segurança sem olhar — as camadas caras |
| Tratar "suavizar a persona" como melhoria | regressão contra decisão do responsável |
| Aceitar "risco aceito" para invariante | normaliza a violação |
| Preferência vendida como defeito | o autor para de ler |
| 40 comentários sem prioridade | nada é corrigido |

---

## 10. Checklist final do revisor

- [ ] Li Aceite e gate da fase antes do diff; rodei o gate e colei o resultado.
- [ ] Olhei invariantes, segurança, persona/floors e contrato — as camadas que mais custam.
- [ ] Risco alto teve verificação independente.
- [ ] Todo bloqueador cita consequência e fonte; separei bloqueador de preferência.
- [ ] Disse o que está bom; não pedi nada fora de escopo.
- [ ] Declarei o que **não** revisei.
