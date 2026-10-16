const allowedEquipment = new Set(['Ultraformer MPT', 'Ultraformer III', 'CO₂ Fracionado Hegon', 'Lavieen', 'Soprano Ice Platinum']);
const text = (value, max = 180) => typeof value === 'string' ? value.trim().replace(/[\x00-\x1f]/g, ' ').slice(0, max) : '';
function normalize(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Cadastro inválido.');
  if (body.website) throw new Error('Não foi possível validar o cadastro.');
  const out = {};
  for (const key of ['nome', 'whatsapp', 'cargo', 'email', 'instagram', 'razao_social', 'documento', 'cep', 'uf', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'energia_220v', 'ar_condicionado', 'consentimento', 'canal', 'request_id', 'pagina']) out[key] = text(body[key]);
  out.observacoes = text(body.observacoes, 1000);
  out.whatsapp = out.whatsapp.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  out.documento = out.documento.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  out.cep = out.cep.replace(/\D/g, '');
  out.equipamentos = [...new Set(Array.isArray(body.equipamentos) ? body.equipamentos : [])].filter(item => allowedEquipment.has(item));
  const required = ['nome','whatsapp','cargo','email','razao_social','documento','cep','uf','logradouro','numero','bairro','cidade','energia_220v','ar_condicionado'];
  if (required.some(key => !out[key])) throw new Error('Preencha todos os campos obrigatórios.');
  if (!/^\d{10,11}$/.test(out.whatsapp)) throw new Error('Confira seu telefone com DDD.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email)) throw new Error('Confira seu e-mail.');
  if (!/^(?:\d{11}|[A-Z0-9]{12}\d{2})$/.test(out.documento)) throw new Error('Confira o CPF / CNPJ.');
  if (!/^\d{8}$/.test(out.cep)) throw new Error('Confira o CEP.');
  if (!/^[A-Z]{2}$/.test(out.uf)) throw new Error('Confira o estado.');
  if (!out.equipamentos.length) throw new Error('Escolha pelo menos um equipamento.');
  for (const key of ['energia_220v','ar_condicionado']) if (!['Sim','Não','Preciso verificar'].includes(out[key])) throw new Error('Confira as informações de estrutura.');
  if (out.consentimento !== 'Sim') throw new Error('É necessário autorizar o uso dos dados para o cadastro.');
  if (!/^[a-f0-9-]{36}$/i.test(out.request_id)) throw new Error('Atualize a página e tente novamente.');
  out.atribuicao = {};
  for (const key of ['utm_source','utm_medium','utm_campaign','utm_content','utm_term']) out.atribuicao[key] = text(body.atribuicao?.[key]);
  out.canal = out.canal || 'Lead MPT';
  return out;
}
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'GET') return res.status(200).json({disponivel: Boolean(process.env.CONEXT_CADASTRO_URL && process.env.CONEXT_CADASTRO_TOKEN)});
  if (req.method !== 'POST') { res.setHeader('Allow','GET, POST'); return res.status(405).json({sucesso:false,mensagem:'Método não permitido.'}); }
  const origin = req.headers.origin;
  if (origin && origin !== `https://${req.headers.host}` && !(process.env.NODE_ENV !== 'production' && /^http:\/\/localhost(?::\d+)?$/.test(origin))) return res.status(403).json({sucesso:false,mensagem:'Origem não permitida.'});
  const endpoint = process.env.CONEXT_CADASTRO_URL;
  const token = process.env.CONEXT_CADASTRO_TOKEN;
  if (!endpoint || !token) return res.status(503).json({sucesso:false,mensagem:'O cadastro online está temporariamente indisponível. Nossa equipe pode concluir seu cadastro pelo WhatsApp.'});
  let payload;
  try {
    if (Number(req.headers['content-length'] || 0) > 16000) throw new Error('Cadastro muito extenso.');
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (JSON.stringify(body || {}).length > 16000) throw new Error('Cadastro muito extenso.');
    payload = normalize(body);
  } catch (err) { return res.status(400).json({sucesso:false,mensagem:err instanceof SyntaxError ? 'Cadastro inválido.' : err.message}); }
  try {
    if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint)) throw new Error('CONFIG_ENDPOINT');
    const upstream = await fetch(endpoint, {method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({...payload,tipo:'cadastro_primeira_reserva',token}),signal:AbortSignal.timeout(35000),redirect:'follow'});
    if (!upstream.ok) throw new Error('UPSTREAM_HTTP');
    const result = await upstream.json();
    if (result.sucesso !== true || result.tipo !== 'cadastro_primeira_reserva' || !/^CN-CAD-[a-f0-9-]{36}$/i.test(result.idCadastro || '')) throw new Error('UPSTREAM_NOT_CONFIRMED');
    return res.status(200).json({sucesso:true,idCadastro:result.idCadastro});
  } catch (err) {
    console.error('cadastro: envio não confirmado', {code:err.name === 'TimeoutError' ? 'TIMEOUT' : 'UPSTREAM_FAILURE',request_id:payload.request_id});
    return res.status(502).json({sucesso:false,mensagem:'Não conseguimos confirmar seu cadastro agora. Tente novamente; seu protocolo permanece o mesmo.'});
  }
};
module.exports.normalize = normalize;
