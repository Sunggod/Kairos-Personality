# S7 — Hardening do runtime

Data: 2026-11-21   Máquina: piso (RTX 3050 8 GB, i5-10400F, 15,9 GB)   Build: llama.cpp b12359 (commit `b1b770d90d94cad9e9ea5b993bdbc383a522fb28`, release v1.0.0)   Modelo de teste: `Qwen3.5-4B-Q4_K_M.gguf` (SHA-256 `00fe7986…ef11a4`)

## Pergunta

O `llama-server` pinado cumpre P10 e os CVEs divulgados estão corrigidos no build?

## Hipótese e critério (definidos antes de medir)

Hipótese do estudo (R13): o build estável atual corrige os CVEs ou, onde a correção não existe, o hardening de P10 reduz a superfície a um risco aceitável.

Confirma se: (1) todo CVE de CVE-2026-43622…43632 (exceto 43625) estiver corrigido no b12359 ou não for alcançável pelas rotas do `llama-server` sob o launch de P10; (2) o servidor escutar só em loopback, exigir API key nas rotas de chat e não usar `--sleep-idle-seconds`; (3) os hashes do binário e do GGUF forem estáveis e reproduzíveis.

Reprova se: qualquer CVE remotamente alcançável ficar sem correção e sem mitigação; o bind não for loopback; a API key não for exigida; ou o build não puder ser pinado por hash.

## Método

- **Build**: release estável v1.0.0 = b12359; artefatos oficiais `llama-b12359-bin-win-cuda-12.4-x64.zip` e `cudart-llama-bin-win-cuda-12.4-x64.zip`, baixados do GitHub da `ggml-org` e extraídos localmente.
- **Fonte**: clone raso no commit `b1b770d9`; inspeção dos guards por CVE. As faixas do NVD foram tratadas como o **snapshot testado pelo pesquisador**, não como commits de correção; a evidência decisiva é o código do build.
- **Modelo**: `Qwen3.5-4B-Q4_K_M.gguf` (unsloth), 2.740.937.888 bytes, usado como carga de teste do runtime. A escolha final do modelo é do S5; este pin é provisório.
- **Hash**: SHA-256 dos arquivos baixados e dos binários extraídos, medido duas vezes.
- **Runtime**: `llama-server.exe` em `127.0.0.1:8099`, com `--api-key`, `-ngl 99`, `-c 4096`, `--parallel 1`, `-ctk q8_0`, `-ctv q8_0`, `--no-webui`, `--no-slots`, `--jinja`; **sem** `--sleep-idle-seconds` e **sem** slot save/restore.
- **Rotas**: duas rodadas de `/health`, `/v1/chat/completions` e `/tokenize`, com e sem chave; `/props`, `/slots`, `/metrics` e rota inexistente; `netstat` para o bind; `nvidia-smi` antes/depois para confirmar o offload.
- **DRY**: requisição de chat com `dry_allowed_length = INT32_MIN`, o vetor do CVE-2026-43628.

## Resultados

### CVEs

| CVE | Faixa do NVD | Evidência no b12359 | Situação |
|---|---|---|---|
| 43622 | b1886–b7445 | JNI Android reescrito no b7446; não faz parte do artefato Windows | Não aplicável |
| 43623 | microtar ≤ 0.1.0 | microtar não está na árvore do llama.cpp; é projeto terceiro | Não aplicável |
| 43624 | F5-TTS ≤ 1.1.20 | F5-TTS não está na árvore do llama.cpp; é projeto terceiro | Não aplicável |
| 43626 | — | Rejeitado; substituído por CVE-2026-70640 | Não aplicável |
| 43627 | b1283–b9058 | `llama_batch_init()` em `src/llama-batch.cpp:1147-1174` ainda não valida overflow nas multiplicações | **Sem correção na biblioteca**; não alcançável pelo HTTP do servidor (ver abaixo) |
| 43628 | b3978–b9058 | O schema do servidor impõe `dry_allowed_length` em `0..INT32_MAX` (`tools/server/server-schema.cpp:151-153`); `INT32_MIN` foi rejeitado com 400 | **Mitigado na borda HTTP**; o sampler em si (`src/llama-sampler.cpp:3620`) não tem clamp |
| 43629 | b4882–b9058 | `state_read_data()` valida `cell_count > cells.size()` (`src/llama-kv-cache.cpp:2731`), tipo/tamanho de linha e runs; exige acesso de escrita ao slot save, que não é habilitado | Corrigido/defendido; não alcançável |
| 43630 | b4882–b8487 | `seq_id` validado em `src/llama-memory-recurrent.cpp:1081-1084`; `cell_count` em `:1120` | Corrigido no b12359 |
| 43631 | b7492–b9060 | `server_res_generator` chama `wait_until_no_sleep()` e segura o inflight (`tools/server/server-context.cpp:5304-5319`); `sleep_idle_seconds = -1` por padrão (`common/common.h:682`) | Corrigido/defendido; o launch não usa a flag |
| 43632 | b7492–b9060 | Os seis handlers chamam `create_response()` antes de tocar em `vocab` (`server-context.cpp:5952, 6434, 6439, 6466, 6507, 6529`), e `create_response()` espera o fim do sleep | Corrigido no b12359 |

CVE-2026-70638, 70639 e 70640 são os IDs reatribuídos dos problemas de JNI Android (70640 substitui 43626); também não se aplicam ao artefato Windows. Nenhuma correção de terceiro foi adotada.

### Runtime medido

| Métrica | Resultado | Condição |
|---|---|---|
| Bind | `127.0.0.1:8099` (LISTENING), nada em `0.0.0.0` | `netstat -ano` |
| `/health` sem chave | 200 `{"status":"ok"}` nas duas rodadas | loopback |
| `/v1/chat/completions` sem chave | 401 `Invalid API Key` nas duas rodadas | loopback |
| `/v1/chat/completions` com chave | 200 nas duas rodadas | loopback |
| `/tokenize` sem chave / com chave | 401 / 200 | loopback |
| `/slots` e `/metrics` com chave | 501 (`not supported`) | `--no-slots`, sem `--metrics` |
| Rota inexistente | 404 | loopback |
| `dry_allowed_length = INT32_MIN` | 400 citando o campo e o limite `0 <= value <= 2147483647` | rota de chat com chave |
| `--sleep-idle-seconds` | ausente da linha de comando; default `-1` (desabilitado) | `--help` e `Win32_Process.CommandLine` |
| GPU | CUDA0 RTX 3050; 33/33 camadas no GPU; modelo 2603,50 MiB; KV 68 MiB; compute 80,02 MiB | log `-lv 4`, `-ngl 99` |
| VRAM do processo | 678 MiB ocioso → 3584 MiB com o servidor (delta ≈ 2,9 GB) | `nvidia-smi`, antes/depois |

### Hashes (duas medições iguais)

| Artefato | Tamanho (bytes) | SHA-256 |
|---|---:|---|
| `llama-b12359-bin-win-cuda-12.4-x64.zip` | 318.976.332 | `E9C0ABF442E8339C06728366C1AD2C711332F9939C0C00603FB75D85FD44C914` |
| `cudart-llama-bin-win-cuda-12.4-x64.zip` | 391.443.627 | `8C79A9B226DE4B3CACFD1F83D24F962D0773BE79F1E7B75C6AF4DED7E32AE1D6` |
| `llama-server.exe` extraído | 9.728 | `38C5AFFB81C9A8F88F5538C7D11BC445E13BC46A2C6EDA05694B8B31A8D45995` |
| `Qwen3.5-4B-Q4_K_M.gguf` | 2.740.937.888 | `00FE7986FF5F6B463E62455821146049DB6F9313603938A70800D1FB69EF11A4` |

## O que não foi medido

- Fuzzing da API C, de GGUF malicioso ou de arquivo de estado/KV corrompido.
- Os CVEs de JNI Android (não fazem parte do artefato Windows).
- Soak de estabilidade e orçamento formal de VRAM (S3/F7).
- Transição real de sleep com `--sleep-idle-seconds` ligado: P10 proíbe a flag; o guard foi verificado no código, não exercitado.
- Os endpoints `/infill`, `/rerank`, `/apply-template` e `/anthropic/count_tokens` sob transição de sleep; apenas inspeção de código.
- Ataque a partir de outra máquina: o bind é loopback e o firewall não foi testado.

## Veredito

**Segue o estudo.** O b12359 corrige ou torna inalcançável, sob o launch de P10, todo CVE relevante ao `llama-server` no Windows. As duas lacunas na biblioteca — 43627 e 43628 — não passam pela superfície HTTP configurada: 43628 é rejeitado na borda (400 medido) e 43627 depende de `n_seq_max` controlado pelo chamador da API C, que o servidor não expõe. O bind é só loopback, a API key é exigida e o sleep não é usado.

## Consequências

- `runtime.lock.json` deve pinar b12359, o commit `b1b770d9…`, os hashes dos archives e dos binários extraídos.
- `models.lock.json` pode pinar o GGUF de teste acima, **provisoriamente**; o S5 escolhe o modelo final e a regra de conversão local do D16/S7 vale para ele.
- A F0 pode fechar o gate de hash; a F4 deve manter o launch e a lista de rotas (`/health` e `/v1/chat/completions` apenas) e nunca habilitar sleep ou slot save.
- Não expor a API C do llama.cpp a chamador não confiável: o 43627 continua na biblioteca.
- Nenhuma correção de terceiro foi adotada; se o upstream corrigir 43627/43628, o pin muda por commit novo, com o artefato obtido e conferido antes.

## Julgamento pendente do responsável

Nenhum para o S7. A escolha do modelo final e a homologação das revisões v3.1/v3.2 continuam no S5 e na pendência 1, respectivamente.
