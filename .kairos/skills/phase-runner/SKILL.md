---
name: phase-runner
description: Conduz uma fase do roadmap do Kairos-Personality do começo ao gate — ler, conferir pré-condições, montar tarefas, construir por entrega, rodar o gate, registrar e passar o bastão. Use ao começar, retomar ou fechar uma fase. Apoia o julgamento do agente; não substitui o roadmap nem decide arquitetura.
---

# Skill — Conduzir uma fase

Esta skill é um **mapa**, não um trilho. Ela poupa descoberta (o que ler, em que ordem, o que
registrar) e deixa as decisões de engenharia com você. Onde o caso real pedir outra coisa,
desvie, diga em uma linha em `docs/status.md` e siga — ver §10.

Referências: `AGENTS.md`, `docs/roadmap.md` (a fase em curso), `docs/estudo-arquitetura.md`
(as seções que a fase cita), `docs/status.md`.

**Não use** para decidir arquitetura (isso é `estudo-revisao`), para escrever um contrato novo
(`contract-first`), rodar um spike (`spike`) ou revisar (`code-review`). Esta skill chama essas
quando for a hora.

---

## 1. Entrada: antes de escrever a primeira linha

Faça nesta ordem. Leva minutos e evita dias.

1. **Leia `docs/status.md`.** Fase em curso, pendências do responsável, último handoff.
   Se há pendência que bloqueia esta fase, pare aqui e diga qual.
2. **Releia a fase no roadmap** — Objetivo, Pré-condições, Entregas (cada uma com Aceite),
   Fluxo, Gate, Risco, Pronto quando.
3. **Releia as seções do estudo que a fase cita**, mais P1–P15 e os R citados. Não implemente
   do que "parece ter sido decidido".
4. **Confira as pré-condições de verdade:**
   - o gate da fase anterior está verde **agora** (rode `bun install && bunx tsc --noEmit &&
     bun test`, não confie na memória nem em registro antigo);
   - os **spikes** que a fase exige têm relatório em `docs/spikes/` com veredito;
   - não há pendência do responsável bloqueando (status.md);
   - dependência externa (Brain, flows) está como a fase assume.
5. **Se faltar spike ou decisão:** faça o que não depende dele, deixe o resto preparado e
   registre o bloqueio. Não preencha a lacuna com palpite.

Saída desta etapa: um parágrafo no seu plano dizendo *o que a fase entrega, o que a bloqueia
e o que você assume*. Se não consegue escrever esse parágrafo, falta leitura.

---

## 2. Planejar: da fase às tarefas

- **Uma tarefa por Entrega.** Cada Entrega já traz o Aceite — ele é a definição de pronto da
  tarefa. Entrega sem Aceite não entra; se a fase tem uma, peça correção do roadmap.
- **Última tarefa: verificar** (gate inteiro, invariantes, resíduos, registro).
- **Ordem:** use o **Fluxo** da fase como padrão. Desvie só se a dependência que ele protege
  não existe no seu caso.
- **Tamanho:** se uma Entrega não cabe em um commit revisável, divida por **comportamento
  verificável**, não por camada técnica (ruim: "criar todos os tipos"; bom: "tombstone
  rejeita conteúdo").
- **Paralelismo:** o que toca interfaces compartilhadas é sequencial; o que é independente
  (pesquisa, outra entrega sem contrato comum, revisão) pode ir para subagente (§5).
- **Marque o que é de risco alto** (veja §6): essas ganham verificação independente.

---

## 3. O ciclo de cada Entrega

```
ler Aceite → contrato → teste que falha → código mínimo → teste verde
   → conferir P1–P15 e regras duras → rodar o gate INTEIRO → commit
```

1. **Aceite.** Reescreva-o, para você, como uma frase observável ("com X, acontece Y; com Z,
   nada acontece"). Se não dá para observar, não dá para testar.
2. **Contrato antes de comportamento.** Se há formato de dado novo ou alterado, skill
   `contract-first`: Zod, JSON Schema, vetores — antes do código que o usa.
3. **Teste que falha.** Escreva-o e **veja-o falhar pelo motivo certo**. Teste que nunca
   falhou não prova nada. Superfície com entrada de terceiros: skill `adversarial-tests`.
4. **Código mínimo** que faz passar. Sem generalizar cedo, sem recurso que ninguém pediu.
5. **Invariantes.** Passe os olhos em P1–P15 e na §5 do `AGENTS.md`. A pergunta é "esta
   entrega *exige* violar alguma?" — se sim, o desenho está errado.
6. **Gate inteiro**, não só o teste novo: o que você mudou pode quebrar uma entrega anterior.
7. **Commit por entrega.** Formato sugerido:

   ```
   F<N>: <entrega em uma linha>

   Aceite: <o critério que este commit satisfaz>
   Prova: <teste ou comando que o demonstra>
   Estudo: <D*/P*/R* relevantes>
   ```

Se algo no meio mudar a decisão (o estudo estava errado, o spike disse outra coisa), pare o
ciclo e use `estudo-revisao` antes de continuar.

---

## 4. Mapa rápido por fase

O que costuma passar batido. É lembrete, não regra; o roadmap manda.

| Fase | Comece por | Cuidado especial |
|---|---|---|
| F0 | **S7** (decide o build pinado) | P10 nasce aqui: o manifesto de hash não é "para depois"; `tsc` reprova de verdade |
| F1 | tipos de `AffectState` e `PersonaLayers` | `locked` impedido **no tipo**, não só em runtime; vetores de rejeição são metade do trabalho |
| F2 | cliente HTTP+SSE puro | os E2E **descobrem** o comportamento real (B11, B12, B14, B15); se divergir do estudo, nota de revisão antes da F3 |
| F3 | `affect.step` com vetores | `MemoryGate` existe **antes** de qualquer rota que escreva em `memory/`; esquecimento de verdade, não flag |
| F4 | supervisor do `llama-server` | Zod é a única porta; regra de tier fail-closed; Report como dado delimitado |
| F5 | interfaces com stub | latência só vale ponta a ponta; barge-in cancela **a geração**, não só o áudio |
| F6a | shell vazio transparente | clique atravessando e DPI misto são teste manual registrado; painel destruído, não escondido |
| F6b | `WorldState` e `decide` puro | determinismo por semente; tetos de interrupção antes de qualquer movimento visível |
| F6c | ler os números de S3/S5/S9 | imagem nunca em disco; tela é entrada de terceiros; recusa vem antes de carregar |
| F7 | **S8** (gate de release) | build empacotado se comporta diferente do `bun run`; testar em máquina limpa cedo |

---

## 5. Subagentes

Use quando ajudam, não por hábito.

**Bom uso:** pesquisa ou leitura ampla (você só precisa da conclusão); entregas realmente
independentes em paralelo; **revisão independente** de trabalho de risco alto (§6); varredura
de resíduos no fim.

**Mau uso:** entrega que muda interface usada por outra em andamento; tarefa que depende de
decisão que só você tem; delegar o entendimento ("faça a F3").

**Briefing que funciona** — o subagente não viu nada do que você viu:

```
Objetivo:       <uma frase>
Contexto:       <por que; fase; entrega>
Leia primeiro:  <arquivos e seções exatas>
Aceite:         <como saber que acabou>
Invariantes:    <P* e regras que se aplicam>
Não toque em:   <arquivos/áreas>
Devolva:        <formato: lista de achados, diff resumido, números>
```

Trate o retorno como **evidência a conferir**, não como verdade: leia o que ele mudou.

---

## 6. Verificação independente (risco alto)

Quem implementou não é o melhor para achar o que esqueceu. Para as entregas abaixo, peça uma
verificação feita por outro agente (ou por você mesmo depois de uma pausa, com a skill
`code-review`), olhando **só a barreira**, com mentalidade de quem tenta burlá-la:

- `MemoryGate` e esquecimento com tombstone (F3);
- regra de tier, decodificação restrita, dado delimitado, deduplicação (F4);
- aprovação só por UI e STT ignorado durante o pedido (F5);
- captura de tela, descarte de imagem, lista de exclusão, origem da visão (F6c);
- manifesto de hash e boot que recusa (F0, F7).

O verificador recebe o aceite e o código — **não** a sua explicação de por que está certo.

---

## 7. Fechar a fase

1. Rode o **gate da fase inteiro** e `bun install && bunx tsc --noEmit && bun test` do zero.
2. Rode a revisão (`code-review`). Bloqueador não mergeia.
3. Procure resíduos: TODO, `any`, `.skip`, fallback que finge, log com dado sensível, termo de
   decisão antiga (use grep).
4. Escreva o **registro de gate executado** em `docs/status.md`, com o que **não** foi
   verificado. "Nenhum" só se for verdade.
5. Atualize o que a fase mudou: nota no estudo (`estudo-revisao`), `AGENTS.md` se surgiu
   convenção, índice de decisões e estado das fases no status.
6. Confirme `main` verde. Sem fase pela metade.
7. Escreva o handoff (§8).

---

## 8. Retomar uma sessão e passar o bastão

**Ao retomar:** leia o último handoff e as pendências em `docs/status.md`; `git log` e
`git status` para ver o real; **rode o gate base** antes de continuar — o estado do disco
vale mais que a lembrança. Se algo divergir do handoff, registre e siga pelo que o
repositório mostra.

**Ao encerrar:** uma entrada de handoff com *feito (com commit), pendente (e por quê),
próxima ação, perguntas ao responsável*. A próxima sessão — sua ou de outro agente — começa
nela. A conversa não sobrevive; o repositório sim.

---

## 9. Trabalho não assistido

Sem ninguém para responder:

- escolha o caminho **reversível** mais razoável, registre a premissa e siga;
- decisão **irreversível** que poderia ir para qualquer lado (apagar dado, trocar hash
  pinado, publicar, mexer em `floors`): prepare tudo, documente as opções, **pare nela**;
- nada que dependa de julgamento humano (voz, arte, persona) é "resolvido" por você: monte o
  experimento e deixe o material pronto;
- no fim, o handoff diz com clareza o que está esperando decisão.

---

## 10. Quando se afastar desta skill

Afaste-se quando o roteiro atrapalha: a ordem do Fluxo não faz sentido no seu caso, a divisão
em tarefas é pior que outra, um passo da §1 é redundante porque você acabou de fazê-lo.
Faça melhor e registre em uma linha ("Desvios", `docs/status.md`): data, fase, o que mudou,
por quê. Se o mesmo desvio aparece duas vezes, **edite esta skill** — ela existe para ser
corrigida pelo uso.

**O que não é desvio permitido:** pular o gate, pular o registro, violar P1–P15, trocar hash
para passar, marcar entrega pronta sem teste. Esses são as regras do projeto, não do roteiro.

---

## 11. Erros comuns

| Erro | Efeito | Correção |
|---|---|---|
| Começar a F(N) com a F(N−1) vermelha | construir sobre areia | consertar ali primeiro |
| Implementar de memória do estudo | decisão antiga ou imaginada | reler a seção citada |
| Escrever código antes do contrato | tipo e comportamento divergem | `contract-first` |
| Teste que nunca falhou | prova nada | vê-lo falhar pelo motivo certo |
| Rodar só o teste novo | quebra silenciosa de entrega anterior | gate inteiro |
| Commit "implementa a fase" | não revisável, sem aceite rastreável | um commit por entrega |
| Registro de gate sem o que ficou de fora | falsa sensação de pronto | listar o não verificado |
| Estimativa tratada como medida | orçamento estoura em produção | `spike` e `measure` |
| Contornar a lacuna do Brain | esconde dependência real | parar, §11.3 do estudo |
| Fim de sessão sem handoff | o próximo começa do zero | §8 |

---

## 12. Checklist final

- [ ] Li status, fase, seções do estudo e P1–P15 aplicáveis antes de codar.
- [ ] Gate anterior verde **hoje**; spikes exigidos têm relatório.
- [ ] Cada Entrega tem teste que falhou e passou, e um commit próprio.
- [ ] Gate da fase **inteiro** verde, mais `tsc` e `bun test` do zero.
- [ ] Revisão feita; risco alto teve verificação independente.
- [ ] Sem TODO, `any` silencioso, `.skip`, fallback fingido, log sensível.
- [ ] Registro de gate em `docs/status.md`, com o que **não** foi verificado.
- [ ] Estudo, `AGENTS.md` e status atualizados onde a fase mudou algo.
- [ ] Handoff escrito.
