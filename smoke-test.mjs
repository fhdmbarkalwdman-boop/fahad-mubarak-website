// اختبار اتصال حي: الموقع المنشور ↔ Supabase (قراءة فقط، لا يكتب أي بيانات)
// التشغيل: node scripts/smoke-test.mjs   (يتطلب Node 18+ وإنترنت)
const SITE = 'https://fahad-mubarak.netlify.app';
const SB   = 'https://jujkckphabzsfjcodefy.supabase.co';
const KEY  = 'sb_publishable_yo1_aLrYJhMXPKZdvcNVYw_8SuyBQp3'; // مفتاح عام (publishable) مصمم للمتصفح
const H = { apikey: KEY };
const results = [];
const check = async (name, fn) => {
  try { const r = await fn(); results.push([r === true ? 'PASS' : 'FAIL', name, r === true ? '' : String(r)]); }
  catch (e) { results.push(['FAIL', name, e.message]); }
};

await check('الموقع يعمل (HTTP 200)', async () => { const r = await fetch(SITE); return r.status === 200 || `status ${r.status}`; });
await check('الصفحة تحمّل supabase-auth.js و supabase-data.js', async () => {
  const t = await (await fetch(SITE)).text();
  return (t.includes('/supabase-auth.js') && t.includes('/supabase-data.js')) || 'الوسمان غير موجودين';
});
await check('وسم Google Search Console موجود', async () => {
  const t = await (await fetch(SITE)).text();
  return t.includes('zcwF5VnyjQbcCp30LYQqi0iDiqMfiDVsqyaATnltOBE') || 'الوسم غير موجود في النسخة المنشورة';
});
await check('الموقع المنشور يشير إلى مشروع Supabase نفسه', async () => {
  const t = await (await fetch(SITE + '/supabase-auth.js')).text();
  return t.includes(SB) || 'عنوان Supabase مختلف في النسخة المنشورة';
});
await check('Supabase Auth يستجيب (البريد/كلمة المرور مفعّل)', async () => {
  const r = await fetch(`${SB}/auth/v1/settings`, { headers: H }); const j = await r.json();
  return (r.ok && j?.external?.email === true) || `status ${r.status}`;
});
await check('REST: قراءة إعدادات الصفحة الرئيسية للزائر (site_settings)', async () => {
  const r = await fetch(`${SB}/rest/v1/site_settings?select=key`, { headers: H }); const j = await r.json();
  return (r.ok && j.some(x => x.key === 'homepage')) || `status ${r.status}`;
});
await check('RLS: الزائر لا يرى رسائل التواصل (القائمة فارغة)', async () => {
  const r = await fetch(`${SB}/rest/v1/contact_messages?select=id`, { headers: H }); const j = await r.json();
  return (r.ok && Array.isArray(j) && j.length === 0) || `تحذير: status ${r.status}`;
});
await check('RLS: الزائر لا يرى الاستشارات', async () => {
  const r = await fetch(`${SB}/rest/v1/consultations?select=id`, { headers: H }); const j = await r.json();
  return (r.ok && Array.isArray(j) && j.length === 0) || `تحذير: status ${r.status}`;
});
await check('Storage: نقطة الوصول العامة تستجيب', async () => {
  const r = await fetch(`${SB}/storage/v1/object/public/site-media/_probe-not-exist.png`);
  return [400, 404].includes(r.status) || `status ${r.status}`;
});
await check('Realtime: فتح اتصال WebSocket', async () => {
  if (typeof WebSocket === 'undefined') return 'WebSocket غير متاح (استخدم Node 22+)';
  return await new Promise(res => {
    const ws = new WebSocket(`${SB.replace('https', 'wss')}/realtime/v1/websocket?apikey=${KEY}&vsn=1.0.0`);
    const t = setTimeout(() => { try { ws.close(); } catch {} res('انتهت المهلة'); }, 8000);
    ws.onopen = () => { clearTimeout(t); ws.close(); res(true); };
    ws.onerror = () => { clearTimeout(t); res('فشل الاتصال'); };
  });
});

let fail = 0;
for (const [s, n, d] of results) { if (s === 'FAIL') fail++; console.log(`${s === 'PASS' ? '✅' : '❌'} ${n}${d ? ' — ' + d : ''}`); }
console.log(`\n${results.length - fail}/${results.length} اختبارات ناجحة`);
process.exit(fail ? 1 : 0);
