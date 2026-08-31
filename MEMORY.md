# kris-labs — MEMORY (SSOT)

## Fila viva — sessão 2026-08-31 (build M1 Trilha)

- Objetivo: M1 completo e demoável — scaffold Turborepo + apps/trilha (Expo) + GPS foreground service → outbox SQLite → lista ao vivo, offline.
- Regras da sessão: confirmar antes de instalar pacotes; nada de BioTabular; push como ocilab25 (`gh auth setup-git`); packages/sync genérico; parar após M1.
- [x] Ler CLAUDE.md, TRILHA-BUILD-PLAN.md, ARCHITECTURE.md.
- [x] Verificar ambiente: node 24.16, pnpm 11.0.9 OK; SEM Android SDK/JDK/adb na máquina; gh ativo = ocilab25.
- [x] Verificar libs GPS no npm: "Anchor" inexistente; "Tracelet" só como @rapide-om/expo-tracelet 0.1.5 (wrapper imaturo); expo-location/expo-task-manager disponíveis (57.0.14); transistorsoft 5.5.0 (pago p/ release Android).
- [x] Decisões do operador: expo-location+task-manager; SDK+emulador local (em C:, D: só tem 18 GB); lote de pacotes aprovado.
- [x] Scaffold monorepo (Turborepo + pnpm) + Biome + TS strict + packages/{schemas,sync,ui,config}; typecheck 4/4 e Biome verdes.
- [x] Logger GPS foreground service → outbox expo-sqlite → lista ao vivo (apps/trilha/src/{db,outboxStore,locationTask,tracking}.ts + App.tsx); prebuild validou as 6 permissões no manifest.
- [x] Toolchain Android: JDK 17 Temurin (zip user-space em %LOCALAPPDATA%\Java, winget travou sem elevação) + SDK em %LOCALAPPDATA%\Android\Sdk + AVD "trilha" (Pixel 7, API 35); JAVA_HOME/ANDROID_HOME/PATH persistidos (user).
- [x] Build release + prova offline no emulador: modo avião ON, 15 pontos gravados em movimento; tela desligada (mWakefulness=Asleep) → 42 pontos, zero crash. Screenshots em .demo/ (local, fora do git).
- [ ] Commit + push como ocilab25; parar e mostrar resultado (não iniciar M2).

## Aprendizados desta sessão (para M2+)

- pnpm 11 ignora `.npmrc` do projeto p/ node-linker — configurar `nodeLinker: hoisted` no pnpm-workspace.yaml. Sem hoisted, o layout .pnpm estoura o limite de path do ninja/CMake no Windows (build nativo falha: "build.ninja still dirty").
- expo-task-manager agenda job persistido → app PRECISA declarar `android.permission.RECEIVE_BOOT_COMPLETED` no app.json (a lib registra o receiver de boot mas não a uses-permission); sem ela, crash em runtime no 1º lote de localizações.
- Emulador: `adb emu geo fix <lon> <lat>` congela a posição enquanto a tela está desligada (pontos continuam chegando com a última coord) — quirk do mock, testar movimento real em device físico.
- Screenshot robusto no Windows: `adb shell screencap` + `adb pull` (pipe binário do PowerShell corrompe).

## Fatos duráveis

- Máquina sem toolchain Android (sem SDK/JDK/adb) em 2026-08-31; instalar exige aprovação (STOP).
- Background location NÃO funciona no Expo Go — exige dev build (expo-dev-client + expo run:android ou EAS).
