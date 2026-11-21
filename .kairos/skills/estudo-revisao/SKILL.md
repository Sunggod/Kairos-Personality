---
name: estudo-revisao
description: Registra no estudo do Kairos-Personality uma decisão tomada durante a implementação ou uma revisão de decisão existente, e prepara candidato a ADR do Brain quando a mudança alcança o contrato dele. Use quando um spike reprova o estudo, a implementação encontra uma bifurcação não prevista, ou um B* do Brain se confirma/refuta. Apoia o julgamento do agente; não homologa nem aceita ADR.
---

# Skill — Revisar o estudo

O estudo **decide** (`AGENTS.md` §2). Quando a realidade o contradiz ou ele é omisso, a
correção entra **no estudo primeiro**, com nota datada, e só depois no roadmap, nas skills e
no código — nunca o contrário. Esta skill diz como registrar sem apagar o raciocínio antigo
e quando algo vira candidato a ADR no Brain.

Referências: `AGENTS.md` §6, §8 e §14; `docs/estudo-arquitetura.md` (cabeçalho §0, §11.2, §11.3);
`docs/roadmap.md` (protocolo, passos 7 e 10); `docs/status.md` (índice de decisões).

**Não use** para bug, refactor, teste/vetor novo, nome interno ou escolha de biblioteca
dentro da stack — isso não é revisão (§1).

---

## 1. É revisão ou não?

**É revisão:** muda uma decisão D*, uma invariante P*, um orçamento, a escolha de um motor, um
contrato interno, ou algo entra/sai de "fora de escopo"; um spike reprova a hipótese; um B*
do Brain é confirmado ou refutado por execução.

**Não é:** bug, refactor, teste novo, nome de variável, biblioteca dentro da stack da §3 do
`AGENTS.md`. Registre no commit, não no estudo.

Na dúvida, pergunte: "outra pessoa construindo esta fase tomaria uma decisão diferente por
não saber disto?". Se sim, é revisão.

---

## 2. Duas marcas — e o que cada uma exige

| Marca | Quando | Quem fecha |
|---|---|---|
| **`[Decidido durante a implementação]`** | Bifurcação que o estudo não previu e que **refina ou confirma** (um número medido, uma escolha dentro do que já foi decidido) | Vale já; o responsável vê no status |
| **`[Proposta de revisão]`** | **Muda decisão de produto** (D12–D17, Q*), invariante, escopo ou orçamento | **Só o responsável homologa.** Até lá, não construa em cima |

Agente **nunca** marca algo como homologado nem como ADR `aceito`.

---

## 3. Como registrar

1. **Edite no lugar certo.** Na seção da decisão afetada, **sem apagar** o texto antigo:
   risque ou marque como substituído e acrescente a nota logo abaixo. O raciocínio antigo é
   histórico útil.
2. **Use este modelo de nota:**

```markdown
> **Revisão — <AAAA-MM-DD> — <marca>** (<D*/P*/R*/Q*/B* afetados>)
> **O que mudou:** <uma frase>
> **Evidência:** <spike SN com número, E2E, leitura de arquivo — com caminho>
> **Alternativas descartadas:** <e por quê>
> **Consequência:** <o que isto libera, o que piora, o que fica a verificar>
> **Fase(s) afetada(s):** <F*, entregas>
```

3. **Propague na ordem:** estudo → roadmap (se o gate ou a entrega mudou) → `AGENTS.md` (se
   a regra operacional mudou) → skills afetadas → código. O roadmap **não** é editado só para
   registrar andamento; é editado quando a **especificação** muda.
4. **Índice:** acrescente uma linha em `docs/status.md`, "Decisões tomadas durante a
   implementação": data, seção, uma frase.
5. **Pendência do responsável:** se a marca é `[Proposta de revisão]`, acrescente-a à tabela
   de pendências do `status.md`, dizendo o que ela bloqueia.
6. **Número que era [Estimativa]** e foi medido: troque a marca por **[Medido]**, com data e
   referência ao relatório do spike.

---

## 4. Quando a revisão alcança o Brain

O Brain é de outro repositório e de outra autoridade (`ADR 0001` de lá). Este projeto **não o
altera e não esconde a lacuna**.

Sinal de que alcança o Brain: a entrega só funciona mudando `plan.run`, o manifesto, o
catálogo de erros, a autenticação do `approver`, `idempotencyKey`, cancelamento ou o planner.

Nesse caso:

1. **Pare** a entrega afetada (`AGENTS.md` §8, item 3); não crie contorno silencioso.
2. Registre em `estudo-arquitetura.md` **§11.3** como **candidato a ADR**: letra (A, B, D, E, F
   ou nova), proposta em uma frase, motivo com o B*/R* de origem, urgência e o que a v1 faz
   enquanto isso (conservadora, `unknown`, fala honesta).
3. Se quiser, **redija o rascunho** do ADR para o responsável levar ao repositório do Brain —
   com `Status: proposto`. O ADR em si vive lá; só o responsável o aceita.
4. Diga na fase afetada, no PR e no handoff **que a entrega fecha contra o fluxo de teste** (ou
   conservadora), não como "pronto" disfarçado.

Não exigem ADR: o canal de aprovação (já existe), nomes `user.notify`/`user.ask`, o valor de
`workspace`, criação de fluxos em `flows/` (trabalho no Brain, mas é dado).

---

## 5. Casos recorrentes

| Situação | Ação |
|---|---|
| Spike reprova a hipótese | Nota de revisão **antes** da fase seguinte; marca conforme muda ou não decisão de produto |
| F2 refuta B14/B15/B11/B12 | Nota no estudo (e §11.2 atualizado: "confirmado por execução") antes da F3 |
| Número medido difere da estimativa | Troca [Estimativa] por [Medido]; se a diferença quebra um orçamento, é `[Proposta de revisão]` |
| Decisão pedia algo que a stack não faz | `[Decidido durante a implementação]` se a saída é interna; senão proposta |
| Descoberta que contradiz uma invariante P* | **Não** edite a invariante para caber: pare e leve ao responsável como proposta |
| Menção desatualizada no estudo (ex.: tecnologia já descartada) | Separe **histórico legítimo** de **resíduo**; corrija o resíduo com nota; histórico fica |

---

## 6. Erros comuns

| Erro | Efeito |
|---|---|
| Corrigir o código e "depois" o estudo | o estudo mente; o próximo agente herda a premissa que caiu |
| Apagar o texto antigo | perde o histórico e o porquê |
| Marcar `[Decidido…]` numa mudança de produto | passa por cima da homologação do responsável |
| Editar invariante para a entrega caber | normaliza a violação |
| Nota sem evidência | opinião, não revisão |
| Editar o roadmap só para registrar andamento | polui a especificação |
| Contornar o Brain em silêncio | esconde a dependência real |
| Marcar ADR como aceito | só o responsável aceita |

---

## 7. Checklist

- [ ] Confirmei que é revisão (§1) e escolhi a marca certa (§2).
- [ ] Editei **o estudo primeiro**, na seção da decisão, sem apagar o texto antigo.
- [ ] A nota tem o que mudou, evidência com caminho, alternativas descartadas, consequência e fases afetadas.
- [ ] Propaguei: roadmap (se a especificação mudou) → `AGENTS.md` → skills → código.
- [ ] `docs/status.md`: índice de decisões e, se for proposta, pendência do responsável.
- [ ] Se alcança o Brain: parei, registrei em §11.3, não contornei; ADR só como `proposto`.
- [ ] [Estimativa] medida virou [Medido] com referência.
