// =====================================================
// CÓDIGO PRONTO PARA COLAR NO GOOGLE APPS SCRIPT
// =====================================================
// 1. Acesse https://script.google.com
// 2. Clique em "Novo projeto"
// 3. APAGUE todo o código existente
// 4. COLE este código abaixo
// 5. Clique em SALVAR (ícone de disquete 💾)
// 6. Dê um nome ao projeto (ex: "Upload Anexos Blog")
// 7. Clique em "Implantar" > "Nova implantação"
// 8. Tipo: "App da Web"
// 9. Executar como: "Eu"
// 10. Quem tem acesso: "Qualquer pessoa"
// 11. Clique em "Implantar"
// 12. COPIE a URL gerada
// 13. Cole no arquivo src/admin/index.njk na variável APPS_SCRIPT_URL
// =====================================================

const PASTA_ID = '1qnTkMsRtpQ7NyULMobJG4zDD04isXsnn';

function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return jsonResponse({ error: 'Nenhum arquivo recebido' }, 400);
    }

    const data = JSON.parse(e.postData.contents);
    
    if (!data.file || !data.fileName) {
      return jsonResponse({ error: 'Dados do arquivo inválidos' }, 400);
    }

    const fileBytes = Utilities.base64Decode(data.file);
    const blob = Utilities.newBlob(fileBytes, data.fileType || 'application/octet-stream', data.fileName);

    const pasta = DriveApp.getFolderById(PASTA_ID);
    const arquivo = pasta.createFile(blob);

    arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = arquivo.getId();
    const urlPublica = 'https://drive.google.com/uc?export=download&id=' + fileId;

    return jsonResponse({
      success: true,
      anexo: {
        id: fileId,
        nome: data.fileName,
        tamanho: data.fileSize || arquivo.getSize(),
        tipo: data.fileType || arquivo.getMimeType(),
        url: urlPublica,
        driveId: fileId
      }
    });

  } catch (error) {
    console.error('Erro no upload:', error);
    return jsonResponse({ 
      error: 'Erro ao processar arquivo', 
      details: error.toString() 
    }, 500);
  }
}

function doGet(e) {
  return jsonResponse({ 
    status: 'ok', 
    message: 'Upload de anexos ativo - Blog URE Marília',
    pastaId: PASTA_ID
  });
}

function jsonResponse(data, status) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
