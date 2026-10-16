# Cadastro de primeira reserva CO NEXT

Página: `/cadastro/`. Fonte padrão: `Lead MPT`. Para outro canal, use `?canal=Lead%20UF3` ou `?canal=Lead%20Hegon`. UTMs são preservadas no registro. Nenhum dado pessoal é enviado em URLs, Pixel, analytics ou logs do servidor. O documento é mascarado no resumo. Não há persistência de formulário no navegador.

## Destino e modelo de dados

Mesmo arquivo Google Sheets `CO NEXT | Banco de Dados` (ID `1M-9pr0B05qTjayLIRE-dwxdM4FLI3NC6CTITN3TWgi0`). O novo receptor cria a aba `📝 11 | Cadastros` com campos completos e adiciona o lead à aba existente `📈 10 | CRM`, por nome dos cabeçalhos. Não altera cadastros anteriores, não escreve na aba de clínicas, não marca reserva confirmada e não substitui o receptor do workshop.

O formulário só mostra sucesso após resposta positiva do receptor e um ID de cadastro válido. Até a configuração abaixo, a API responde 503, e a página oferece atendimento no WhatsApp sem alegar que salvou os dados. Não usar o endpoint antigo do workshop como substituto: ele descarta os novos campos e fixa a campanha Workshop CO₂.

## Ativação necessária na conta do proprietário

1. Criar um novo projeto em https://script.google.com/home/start e colar o conteúdo de `cadastro-primeira-reserva.gs`.
2. Em Configurações do projeto > Propriedades do script, adicionar `CONEXT_CADASTRO_TOKEN` com uma chave aleatória forte e privada (pelo menos 32 caracteres). Não colocar a chave no código, GitHub ou chat.
3. Implantar > Nova implantação > Aplicativo da Web. Executar como proprietário da planilha e permitir acesso a Qualquer pessoa. Autorizar o acesso à planilha CONEXT. Copiar a URL que termina em `/exec`.
4. No projeto Vercel `conext`, cadastrar as variáveis de produção `CONEXT_CADASTRO_URL` (URL `/exec`) e `CONEXT_CADASTRO_TOKEN` (mesma chave da propriedade do script). Fazer novo deploy para carregar as variáveis.
5. Enviar um cadastro identificado como teste. Verificar os campos completos em `📝 11 | Cadastros` e a referência em `📈 10 | CRM`. Repetir com o mesmo request_id deve retornar o mesmo protocolo sem inserir outra linha.

Não prometer coleta operacional até esse teste real. O único teste realizado antes da autorização do novo receptor é simulado com fixture, sem escrever dados falsos na base real.

## Proteção e operação

Chave compartilhada fica exclusivamente nos servidores. Validação no servidor e no receptor, limite de tamanho, honeypot, verificação de origem e proteção de fórmulas. Idempotência por UUID com lock de script; em falha parcial, o reenvio completa o CRM sem duplicar o cadastro. Revisar registros repetidos por CPF/telefone no fluxo comercial, sem sobrescrever clientes existentes automaticamente.

Sem endpoint de leitura pública. Não registrar payloads contendo documentos. O token é restrito a este receptor; se comprometido, rotacionar em Apps Script e Vercel. Não conectar notificações a clientes automaticamente.
