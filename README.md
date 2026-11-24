# Meu Controle Diário — PWA

Aplicativo web instalável para acompanhar água e suplementação. Não requer conta nem servidor de banco de dados: os registros são salvos localmente no navegador do dispositivo.

## Recursos
- Meta diária de água e registro em ml.
- Checklist de suplementos, horários e observações editáveis.
- Histórico dos últimos sete dias e resumo de dias registrados.
- Lembretes locais enquanto o aplicativo está aberto.
- Exportação e importação de backup JSON.
- Cache offline via Service Worker.

## Como publicar gratuitamente pelo GitHub Pages
1. Extraia este ZIP no computador.
2. Crie uma conta em https://github.com/ se ainda não tiver.
3. Crie um repositório novo, por exemplo `meu-controle-diario`.
4. Envie todos os arquivos e a pasta `icons` para a raiz do repositório.
5. Abra **Settings → Pages**.
6. Em **Build and deployment**, escolha **Deploy from a branch**.
7. Selecione a branch `main` e a pasta `/ (root)`; salve.
8. Aguarde a publicação. O GitHub mostrará um endereço HTTPS semelhante a `https://vitorfqueiroz.github.io/routine-control/`.

## Instalar no Android
1. Abra o endereço HTTPS no Google Chrome do Android.
2. Aguarde o carregamento inicial com internet.
3. Abra o menu ⋮ do Chrome.
4. Toque em **Instalar aplicativo** ou **Adicionar à tela inicial**.
5. Confirme. O ícone Meu Controle aparecerá na tela inicial.

## Notificações: limitações importantes
- O navegador precisa permitir notificações e o usuário precisa conceder a permissão.
- Nesta versão, os lembretes são verificados pelo JavaScript enquanto o app está aberto/em execução. O Android pode suspender a página em segundo plano ou encerrada.
- Notificações confiáveis em horários exatos mesmo com o app fechado exigem notificações push com servidor e agendamento remoto. Esta versão não inclui esse serviço.
- O lembrete de água é intervalar dentro da janela definida; os lembretes de suplementos usam o horário configurado para cada item.
- Não há sincronização entre aparelhos. Exporte/importa o backup JSON para transferir seus dados.

## Privacidade e armazenamento
- Dados armazenados em `localStorage` no navegador, neste dispositivo e nesta origem.
- Limpar os dados do site/navegador pode apagar os registros. Exporte backups periodicamente.
- Não há envio de dados a terceiros.
- Se publicar uma nova versão, o Service Worker atualizará o cache na próxima ativação.

## Desenvolvimento local
Service Workers e instalação PWA exigem HTTPS ou `localhost`. Para teste local, sirva a pasta por um servidor HTTP local (por exemplo, `python -m http.server 8000`) e abra `http://localhost:8000`.
