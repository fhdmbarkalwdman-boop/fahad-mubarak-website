/* Supabase Auth bridge — real authentication; roles are read only from app_metadata. */
(() => {
  'use strict';
  const URL = 'https://jujkckphabzsfjcodefy.supabase.co';
  const KEY = 'sb_publishable_yo1_aLrYJhMXPKZdvcNVYw_8SuyBQp3';
  const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  const FM = window.FM;
  const initialAuthHash = location.hash;
  const initialAuthSearch = location.search;
  let inviteFlow = /type=invite/i.test(initialAuthHash) || (initialAuthHash.startsWith('#forgot') && new URLSearchParams(initialAuthSearch).has('code'));
  let client = null, authUser = null, profile = null, ready = false, recoveryMode = false;
  const $ = (s, r=document) => r.querySelector(s);
  const toast = (m, bad=false) => FM?.toast(m, bad);
  const msg = e => e?.message || 'تعذر إكمال العملية. حاول مرة أخرى.';
  const roleOf = u => ['owner','editor'].includes(u?.app_metadata?.role) ? u.app_metadata.role : 'member';
  const mapped = () => authUser ? ({id:authUser.id,name:profile?.display_name || authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'عضو',username:profile?.username || authUser.email?.split('@')[0] || '',email:authUser.email || '',phone:authUser.user_metadata?.phone || authUser.phone || '',avatar:profile?.avatar_url || '',bio:profile?.bio || '',role:roleOf(authUser),active:true,permissions:roleOf(authUser)==='owner'?['admin','content','consultations','comments','settings','users','backups','activity']:roleOf(authUser)==='editor'?['content','manage_content']:[]}) : null;
  function sync() { if (FM) { FM.refresh(); if (recoveryMode && location.hash.startsWith('#forgot')) setTimeout(renderRecoveryForm,0); document.dispatchEvent(new CustomEvent('fm:supabase-auth',{detail:{ready,user:mapped()}})); } }
  function renderRecoveryForm() { const old=$('form[data-admin-form=\"forgot\"]'); if(!old)return; old.outerHTML='<form data-fm-recovery-form novalidate><div class=\"form-grid\"><div class=\"field\"><label>كلمة المرور الجديدة</label><input name=\"password\" type=\"password\" minlength=\"8\" required autocomplete=\"new-password\"></div><div class=\"field\"><label>تأكيد كلمة المرور</label><input name=\"confirm\" type=\"password\" minlength=\"8\" required autocomplete=\"new-password\"></div></div><div class=\"form-actions\"><button class=\"btn btn-primary\" type=\"submit\">حفظ كلمة المرور الجديدة</button></div></form>'; const h=$('.fm-admin-app h1'); if(h)h.textContent='تعيين كلمة مرور جديدة'; const p=$('.fm-admin-app .panel > p'); if(p)p.textContent='أدخل كلمة مرور جديدة لحسابك.'; }
  async function loadProfile() {
    profile = null;
    if (!authUser) return;
    const {data,error} = await client.from('profiles').select('display_name,username,avatar_url,bio').eq('id',authUser.id).maybeSingle();
    if (!error) profile = data;
    if (!profile) {
      const display_name = authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'عضو';
      const {data:created,error:createError} = await client.from('profiles').upsert({id:authUser.id,display_name},{onConflict:'id'}).select('display_name,username,avatar_url,bio').maybeSingle();
      if (!createError) profile = created;
    }
  }
  function setAuth(user) { authUser = user || null; profile = null; }
  function field(form,n) { return String(new FormData(form).get(n)||'').trim(); }
  function blockLocalAuth(form) {
    const kind = form?.dataset?.adminForm;
    if (!['login','register','setup','forgot','password','profile'].includes(kind)) return false;
    return true;
  }
  async function handle(form) {
    const kind = form.dataset.adminForm;
    const email = field(form,'identity') || field(form,'email');
    try {
      if (kind === 'setup') { toast('إعداد المالك يتم عبر Supabase Auth فقط. سجّل بالبريد المعتمد للمالك بعد ضبط تأكيد البريد.',true); FM.navigate('register'); return; }
      if (kind === 'login') {
        if (!/^\S+@\S+\.\S+$/.test(email)) return toast('استخدم البريد الإلكتروني المسجل في الحساب.',true);
        const {data,error} = await client.auth.signInWithPassword({email,password:field(form,'password')});
        if (error) throw error;
        setAuth(data.user); await loadProfile(); toast('تم تسجيل الدخول بنجاح.'); FM.navigate(roleOf(data.user)==='owner'||roleOf(data.user)==='editor'?'admin':'profile'); sync(); return;
      }
      if (kind === 'register') {
        const name=field(form,'name'), pass=field(form,'password'), confirm=field(form,'confirm');
        if (!name) return toast('أدخل الاسم.',true);
        if (!/^\S+@\S+\.\S+$/.test(email)) return toast('أدخل بريدًا إلكترونيًا صحيحًا.',true);
        if (pass.length<8) return toast('كلمة المرور يجب أن تكون 8 أحرف على الأقل.',true);
        if (pass!==confirm) return toast('تأكيد كلمة المرور غير مطابق.',true);
        if (!new FormData(form).get('consent')) return toast('يلزم الموافقة على الشروط وسياسة الخصوصية.',true);
        const {data,error}=await client.auth.signUp({email,password:pass,options:{data:{display_name:name,username:field(form,'username'),phone:field(form,'phone')}}});
        if (error) throw error;
        if (data.session) { setAuth(data.user); await loadProfile(); FM.navigate('profile'); sync(); }
        else { toast('تم إرسال رسالة تأكيد إلى بريدك الإلكتروني. أكّد الحساب ثم سجّل الدخول.'); FM.navigate('login'); }
        return;
      }
      if (kind === 'forgot') {
        if (!/^\S+@\S+\.\S+$/.test(email)) return toast('أدخل بريدًا إلكترونيًا صحيحًا.',true);
        const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname+'#forgot'});
        if(error) throw error;
        toast('إذا كان البريد مسجلًا فستصلك رسالة لاستعادة كلمة المرور.'); return;
      }
      if (kind === 'password') {
        const pass=field(form,'password'),confirm=field(form,'confirm');
        if(pass.length<8||pass!==confirm) return toast('تحقق من كلمة المرور الجديدة وتأكيدها (8 أحرف على الأقل).',true);
        const {error}=await client.auth.updateUser({password:pass}); if(error) throw error;
        toast('تم تحديث كلمة المرور.'); form.reset(); return;
      }
      if (kind === 'profile') {
        const name=field(form,'name'); if(!name) return toast('أدخل الاسم.',true);
        const {error}=await client.from('profiles').update({display_name:name,updated_at:new Date().toISOString()}).eq('id',authUser.id);
        if(error) throw error; await loadProfile(); toast('تم تحديث الملف الشخصي.'); sync(); return;
      }
    } catch(e) { toast(msg(e),true); }
  }
  function logout() { client.auth.signOut().then(({error})=>{if(error)toast(msg(error),true);setAuth(null);sync();FM.navigate('login');}); }
  function boot() {
    if (!window.supabase?.createClient) { toast('تعذر تحميل مكتبة تسجيل الدخول. تحقق من اتصال الإنترنت.',true); return; }
    client=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    FM.user = () => mapped();
    FM.setSession = () => {};
    FM.clearSession = () => { logout(); };
    document.addEventListener('submit',e=>{const rf=e.target.closest('form[data-fm-recovery-form]');if(rf){e.preventDefault();e.stopImmediatePropagation();const d=new FormData(rf),p=String(d.get('password')||''),c=String(d.get('confirm')||'');if(p.length<8||p!==c)return toast('تحقق من كلمة المرور وتأكيدها (8 أحرف على الأقل).',true);client.auth.updateUser({password:p}).then(({error})=>{if(error)throw error;recoveryMode=false;toast('تم تحديث كلمة المرور بنجاح.');FM.navigate('login');}).catch(x=>toast(msg(x),true));return;}const f=e.target.closest('form[data-admin-form]');if(!f||!blockLocalAuth(f))return;e.preventDefault();e.stopImmediatePropagation();if(!ready)return toast('جارٍ تهيئة الاتصال الآمن. أعد المحاولة بعد لحظة.',true);handle(f);},true);
    document.addEventListener('click',e=>{const b=e.target.closest('[data-admin-action="logout"],.logout-btn,[data-fx-logout]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();logout();},true);
    client.auth.onAuthStateChange((event,session)=>{
      const acceptingInvite = inviteFlow && !!session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION');
      recoveryMode = event === 'PASSWORD_RECOVERY' || acceptingInvite || recoveryMode;
      setAuth(session?.user||null);
      Promise.resolve().then(async()=>{await loadProfile();ready=true;if(event==='PASSWORD_RECOVERY'||acceptingInvite){inviteFlow=false;FM.navigate('forgot');}sync();});
    });
    client.auth.getSession().then(async({data,error})=>{if(error)throw error;setAuth(data.session?.user||null);await loadProfile();ready=true;sync();}).catch(e=>{ready=true;toast(msg(e),true);sync();});
    window.FahadSupabase={client,get user(){return mapped();},get ready(){return ready;},signOut:logout,async refreshProfile(){await loadProfile();FM?.refresh();return mapped();},async updateProfile(values={}){if(!authUser)throw new Error('سجّل الدخول أولاً.');const patch={display_name:String(values.display_name||mapped().name||'عضو').trim().slice(0,100),bio:String(values.bio||'').trim().slice(0,240),updated_at:new Date().toISOString()};if(values.avatar_url)patch.avatar_url=values.avatar_url;const {data,error}=await client.from('profiles').upsert({id:authUser.id,...patch},{onConflict:'id'}).select('display_name,username,avatar_url,bio').single();if(error)throw error;profile=data;sync();return mapped();}};
  }
  const s=document.createElement('script');s.src=CDN;s.async=true;s.onload=boot;s.onerror=()=>toast('تعذر تحميل مكتبة Supabase.',true);document.head.appendChild(s);
})();
