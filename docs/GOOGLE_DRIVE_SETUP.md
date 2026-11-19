# Configuração do Google Drive para Anexos

Este guia explica como configurar o Google Drive para armazenar anexos dos posts do blog.

## Arquitetura

```
Admin (browser) → Edge Function (Supabase) → Google Drive API → Arquivo público
```

Os arquivos anexados no admin são enviados para uma pasta específica no Google Drive
e recebem permissão pública automática ("Qualquer pessoa com o link pode visualizar").

## Passo 1: Google Cloud Console

### 1.1 Criar projeto e ativar faturamento

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto (ex: "Blog URE Marília")
3. Vá em **Billing** → Adicione cartão de crédito (verificação apenas, sem cobrança)
4. Configure **alerta de orçamento** para R$ 1,00 (garante que não haverá cobranças)

> **Nota:** O Google exige cartão mesmo para uso gratuito. Você NÃO será cobrado
> se ficar dentro do Free Tier (15 GB no Drive, 12.000 req/dia na API).

### 1.2 Ativar Google Drive API

1. No menu lateral, vá em **APIs e serviços** → **Biblioteca**
2. Busque por "Google Drive API"
3. Clique em **Ativar**

### 1.3 Criar Service Account

1. Vá em **IAM e admin** → **Service Accounts**
2. Clique em **Criar conta de serviço**
3. Nome: `blog-anexos` (ou qualquer nome)
4. Clique em **Criar e continuar**
5. Papel: pode pular (não precisa)
6. Clique em **Concluir**
7. Clique na conta de serviço criada
8. Vá na aba **Chaves** → **Adicionar chave** → **Criar nova chave** → **JSON**
9. O arquivo JSON será baixado — guarde-o em local seguro

### 1.4 Criar pasta no Google Drive

1. Acesse [Google Drive](https://drive.google.com/)
2. Crie uma pasta chamada `Blog URE Marília`
3. Dentro dela, crie outra pasta chamada `Anexos`
4. Copie o **ID da pasta** (último segmento da URL):
   - URL: `https://drive.google.com/drive/folders/1ABC123xyz...`
   - ID: `1ABC123xyz...`

### 1.5 Compartilhar pasta com Service Account

1. No arquivo JSON baixado, copie o campo `client_email`
2. No Google Drive, clique com botão direito na pasta `Anexos` → **Compartilhar**
3. Cole o e-mail da Service Account
4. Defina permissão como **Editor**
5. Clique em **Enviar**

## Passo 2: Configurar Secrets no Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard/)
2. Vá no seu projeto → **Functions** → **Secrets**
3. Adicione os seguintes secrets:

| Secret | Valor |
|--------|-------|
| `GDRIVE_CLIENT_EMAIL` | Campo `client_email` do JSON da Service Account |
| `GDRIVE_PRIVATE_KEY` | Campo `private_key` do JSON (incluindo `-----BEGIN PRIVATE KEY-----`) |
| `GDRIVE_FOLDER_ID` | ID da pasta `Anexos` copiado no passo 1.4 |

## Passo 3: Deploy da Edge Function

A Edge Function já está em `supabase/functions/upload-anexo/index.ts`.

Para fazer deploy:

```bash
# Instale o Supabase CLI se ainda não tiver
npm install -g supabase

# Login no Supabase
supabase login

# Link seu projeto
supabase link --project-ref SEU_PROJECT_ID

# Deploy da função
supabase functions deploy upload-anexo
```

Ou pelo Supabase Dashboard:
1. Vá em **Edge Functions** → **Deploy**
2. Faça upload do arquivo `index.ts`

## Passo 4: Aplicar migração do banco

Execute o SQL em `supabase/migrations/006_anexos.sql` no **SQL Editor** do Supabase,
ou use o CLI:

```bash
supabase db push
```

## Passo 5: Testar

1. Acesse `/admin/index.html` no seu blog
2. Faça login como admin
3. Crie ou edite uma postagem
4. Clique em **📎 Adicionar arquivo**
5. Selecione um arquivo (PDF, DOC, imagem, etc.)
6. Aguarde o upload
7. Salve a postagem
8. Visualize o post público — os anexos devem aparecer na seção "📎 Anexos"

## Limites e Custos

| Recurso | Limite Gratuito |
|---------|-----------------|
| Armazenamento | 15 GB (compartilhado com Gmail/Drive) |
| API Google Drive | 12.000 requisições/dia |
| Tamanho máx. arquivo | 50 MB (limitado na Edge Function) |
| Edge Functions Supabase | 500.000 invocations/mês (Free Tier) |

## Troubleshooting

### Erro "Configuração do Google Drive incompleta"
- Verifique se os secrets `GDRIVE_CLIENT_EMAIL`, `GDRIVE_PRIVATE_KEY` e `GDRIVE_FOLDER_ID` estão configurados no Supabase

### Erro "Falha ao obter access token"
- Verifique se a Service Account tem permissão na pasta do Drive
- Verifique se o `private_key` está correto (deve incluir as quebras de linha)

### Erro "Falha no upload"
- Verifique se o tamanho do arquivo é menor que 50MB
- Verifique se a pasta do Drive tem espaço disponível (limite de 15GB)

### Anexos não aparecem no post público
- Verifique se o script `sync-posts.js` foi executado após adicionar anexos
- Verifique se o template `post.njk` inclui a seção de anexos

## Segurança

- Os arquivos ficam **públicos** no Google Drive (qualquer pessoa com o link pode baixar)
- A Edge Function valida o JWT do admin antes de permitir upload
- Apenas usuários com papel `admin` ou `editor` podem enviar anexos
- As credenciais do Google ficam protegidas nos Secrets do Supabase

## Alternativa: Supabase Storage

Se preferir não usar Google Drive, o projeto também suporta anexos via Supabase Storage
(bucket `anexos`). Veja o README principal para detalhes.
