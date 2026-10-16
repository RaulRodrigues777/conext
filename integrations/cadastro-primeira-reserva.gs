/**
 * Receptor específico de primeira reserva. Criar NOVO projeto Apps Script.
 * Não substituir o receptor já utilizado pelo workshop ou pela agenda.
 * Propriedade de script necessária: CONEXT_CADASTRO_TOKEN (mesmo valor na Vercel).
 * Web app: executar como proprietário; acesso Qualquer pessoa.
 * A URL do web app é configurada somente no servidor Vercel.
 */
const PLANILHA_CADASTRO = '1M-9pr0B05qTjayLIRE-dwxdM4FLI3NC6CTITN3TWgi0';
const ABA_CADASTROS = '📝 11 | Cadastros';
const ABA_CRM_CADASTRO = '📈 10 | CRM';
const ABA_CLINICAS_CADASTRO = '🏥 04 | Clínicas Parceiras';
const CAMPOS_CADASTRO = ['ID Cadastro','Data/Hora do Cadastro','Nome','WhatsApp','Razão Social','CPF/CNPJ','Cargo','Instagram','Email','CEP','Logradouro','Número','Complemento','Bairro','Cidade','UF','220V','Ar Condicionado','Equipamentos de Interesse','Canal','Status','Observações','Consentimento LGPD','UTM Source','UTM Medium','UTM Campaign','UTM Content','UTM Term','Página','ID Lead CRM'];
function doGet() { return jsonCadastro_({sucesso:true,tipo:'cadastro_primeira_reserva',versao:2}); }
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const d = JSON.parse(e.postData.contents);
    const token = PropertiesService.getScriptProperties().getProperty('CONEXT_CADASTRO_TOKEN');
    if (!token || d.token !== token || d.tipo !== 'cadastro_primeira_reserva') throw new Error('Acesso não autorizado.');
    const equipment = ['Ultraformer MPT','Ultraformer III','CO₂ Fracionado Hegon','Lavieen','Soprano Ice Platinum'];
    if (!/^[a-f0-9-]{36}$/i.test(String(d.request_id || ''))) throw new Error('Protocolo inválido.');
    ['nome','whatsapp','razao_social','documento','cargo','email','cep','logradouro','numero','bairro','cidade','uf'].forEach(k => { if (!d[k] || typeof d[k] !== 'string' || d[k].length > 180) throw new Error('Campo inválido.'); });
    if (!/^\d{10,11}$/.test(d.whatsapp) || !/^(?:\d{11}|[A-Z0-9]{12}\d{2})$/.test(d.documento) || !/^\d{8}$/.test(d.cep)) throw new Error('Dados inválidos.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) throw new Error('E-mail inválido.');
    if (!Array.isArray(d.equipamentos) || !d.equipamentos.length || d.equipamentos.some(v => equipment.indexOf(v) < 0)) throw new Error('Equipamentos inválidos.');
    ['energia_220v','ar_condicionado'].forEach(k => { if (['Sim','Não','Preciso verificar'].indexOf(d[k]) < 0) throw new Error('Estrutura inválida.'); });
    if (d.consentimento !== 'Sim') throw new Error('Consentimento necessário.');
    lock.waitLock(20000);
    const ss = SpreadsheetApp.openById(PLANILHA_CADASTRO);
    const crm = ss.getSheetByName(ABA_CRM_CADASTRO);
    if (!crm) throw new Error('CRM não encontrado.');
    let cad = ss.getSheetByName(ABA_CADASTROS);
    if (!cad) { cad = ss.insertSheet(ABA_CADASTROS); cad.getRange(1,1,1,CAMPOS_CADASTRO.length).setValues([CAMPOS_CADASTRO]); cad.setFrozenRows(1); cad.getRange(1,1,1,CAMPOS_CADASTRO.length).setBackground('#17120e').setFontColor('#f4ebde').setFontWeight('bold'); cad.setColumnWidths(1,CAMPOS_CADASTRO.length,160); }
    const actual = cad.getRange(1,1,1,CAMPOS_CADASTRO.length).getValues()[0];
    if (JSON.stringify(actual) !== JSON.stringify(CAMPOS_CADASTRO)) throw new Error('Estrutura de cadastro alterada.');
    const id = 'CN-CAD-' + d.request_id;
    const idLead = 'CN-RES-' + d.request_id;
    let cadRow = 0;
    if (cad.getLastRow() > 1) { const found = cad.getRange(2,1,cad.getLastRow()-1,1).createTextFinder(id).matchEntireCell(true).findNext(); if (found) cadRow = found.getRow(); }
    const now = Utilities.formatDate(new Date(),'America/Sao_Paulo','dd/MM/yyyy HH:mm:ss');
    const safe = v => { const s = String(v == null ? '' : v).slice(0,1500); return /^[=+\-@\t\r]/.test(s) ? "'" + s : s; };
    const utm = d.atribuicao || {};
    const addr = d.logradouro+', '+d.numero+(d.complemento ? ', '+d.complemento : '')+' | '+d.bairro+' | '+d.cidade+'/'+d.uf+' | CEP '+d.cep;
    if (!cadRow) {
      // All sensitive values are plain text, including documents and phone numbers.
      const row = [id,now,d.nome,d.whatsapp,d.razao_social,d.documento,d.cargo,d.instagram,d.email,d.cep,d.logradouro,d.numero,d.complemento,d.bairro,d.cidade,d.uf,d.energia_220v,d.ar_condicionado,d.equipamentos.join(', '),d.canal || 'Lead MPT','Cadastro recebido',d.observacoes,'Sim',utm.utm_source,utm.utm_medium,utm.utm_campaign,utm.utm_content,utm.utm_term,d.pagina,''];
      cadRow = cad.getLastRow()+1;
      cad.getRange(cadRow,1,1,row.length).setNumberFormat('@').setValues([row.map(safe)]);
      SpreadsheetApp.flush();
    }
    const headers = crm.getRange(1,1,1,crm.getLastColumn()).getValues()[0];
    ['ID Lead','Nome','WhatsApp','Tecnologia de Interesse','Campanha/Evento','Observações'].forEach(h => { if (headers.indexOf(h)<0) throw new Error('Estrutura CRM incompatível.'); });
    const idColumn = headers.indexOf('ID Lead')+1;
    const exists = crm.getLastRow()>1 && crm.getRange(2,idColumn,crm.getLastRow()-1,1).createTextFinder(idLead).matchEntireCell(true).findNext();
    if (!exists) {
      const notes = ['Cadastro de primeira reserva. Reserva ainda não confirmada.','Razão social: '+d.razao_social,'Cargo: '+d.cargo,'220V: '+d.energia_220v,'Ar-condicionado: '+d.ar_condicionado,'Cadastro completo: '+id,d.observacoes || ''].filter(Boolean).join('\n');
      const data = {'ID Lead':idLead,'Data/Hora do Cadastro':now,'Nome':d.nome,'WhatsApp':d.whatsapp,'Instagram':d.instagram,'Endereço de Atendimento':addr,'Tecnologia de Interesse':d.equipamentos.join(', '),'Origem do Lead':d.canal || 'Lead MPT','Campanha/Evento':'Cadastro 1ª Reserva','UTM Source':utm.utm_source,'UTM Medium':utm.utm_medium,'UTM Campaign':utm.utm_campaign,'Status do Lead':'Novo','Prioridade':'Média','Responsável':'Raul','Observações':notes,'Consentimento LGPD':'Sim','Última Atualização':now,'Link/Referência':d.pagina,'Email':d.email};
      const row = headers.map(h => safe(data[h] || ''));
      crm.getRange(crm.getLastRow()+1,1,1,row.length).setNumberFormat('@').setValues([row]);
    }
    cad.getRange(cadRow,30).setNumberFormat('@').setValue(idLead);
    // Under the same lock: a retry completes all destinations without duplicating clinics.
    sincronizarClinicaCadastro_(ss, d, id, addr);
    SpreadsheetApp.flush();
    return jsonCadastro_({sucesso:true,tipo:'cadastro_primeira_reserva',idCadastro:id});
  } catch (err) { return jsonCadastro_({sucesso:false,tipo:'cadastro_primeira_reserva',mensagem:'Não foi possível concluir o cadastro.'}); }
  finally { if (lock.hasLock()) lock.releaseLock(); }
}
/** Adds only the operational fields. Existing clinics are never overwritten. */
function sincronizarClinicaCadastro_(ss, d, id, endereco) {
  const sheet = ss.getSheetByName(ABA_CLINICAS_CADASTRO);
  if (!sheet) throw new Error('Aba de clínicas não encontrada.');
  const expected = ['ID Cadastro','Nome/Contato','Razão Social','CPF/CNPJ','E-mail','WhatsApp','Endereço','Canal/Origem','Instagram','Tipo de Cadastro','Status','Fonte'];
  const headers = sheet.getRange(1,1,1,expected.length).getValues()[0];
  if (headers.some(h => expected.indexOf(h) < 0) || new Set(headers).size !== expected.length) throw new Error('Estrutura de clínicas incompatível.');
  const documento = v => String(v || '').replace(/[^A-Z0-9]/gi,'').toUpperCase();
  const telefone = v => String(v || '').replace(/\D/g,'').replace(/^55(?=\d{10,11}$)/,'');
  const doc = documento(d.documento);
  const phone = telefone(d.whatsapp);
  const clinicId = 'CLI-WEB-' + id.replace(/^CN-CAD-/,'');
  if (sheet.getLastRow() > 1) {
    const rows = sheet.getRange(2,1,sheet.getLastRow()-1,expected.length).getDisplayValues();
    const found = rows.some(row => row[headers.indexOf('ID Cadastro')] === clinicId ||
      (doc && documento(row[headers.indexOf('CPF/CNPJ')]) === doc) ||
      (phone && telefone(row[headers.indexOf('WhatsApp')]) === phone));
    // A document OR phone match avoids duplicates, including shared clinic contacts.
    // Ambiguous matches remain in Cadastros/CRM for human review, without overwrites.
    if (found) return;
  }
  const data = {'ID Cadastro':clinicId,'Nome/Contato':d.nome,'Razão Social':d.razao_social,'CPF/CNPJ':d.documento,'E-mail':d.email,'WhatsApp':d.whatsapp,'Endereço':endereco,'Canal/Origem':d.canal || 'Lead MPT','Instagram':d.instagram || '', 'Tipo de Cadastro':'Clínica/Cliente','Status':'Aguardando validação','Fonte':'Cadastro pelo site | '+id};
  const safe = v => { const s = String(v == null ? '' : v).slice(0,1500); return /^[=+\-@\t\r]/.test(s) ? "'" + s : s; };
  const targetRow = sheet.getLastRow()+1;
  if (targetRow > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(),1);
  sheet.getRange(targetRow,1,1,expected.length).setNumberFormat('@').setValues([headers.map(h => safe(data[h]))]);
}
function jsonCadastro_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
