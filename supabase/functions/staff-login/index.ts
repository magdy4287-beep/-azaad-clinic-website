import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL=(Deno.env.get('SUPABASE_URL')||'').trim();
function resolveKey(raw:string,prefix:string){const value=raw.trim();if(!value)return '';try{const parsed=JSON.parse(value);if(typeof parsed==='string')return parsed.trim();if(Array.isArray(parsed)){const p=parsed.find(v=>typeof v==='string'&&v.trim().startsWith(prefix));return String(p||parsed.find(v=>typeof v==='string'&&v.trim())||'').trim();}if(parsed&&typeof parsed==='object'){const d=parsed.default;if(typeof d==='string'&&d.trim())return d.trim();const vals=Object.values(parsed).filter((v):v is string=>typeof v==='string'&&v.trim());const p=vals.find(v=>v.trim().startsWith(prefix));return String(p||vals[0]||'').trim();}}catch(_){}return value;}
function readKey(names:string[],prefix:string){for(const name of names){const k=resolveKey(Deno.env.get(name)||'',prefix);if(k)return k;}return '';}
const SECRET_KEY=(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'').trim()||readKey(['SUPABASE_SECRET_KEYS','SUPABASE_SECRET_KEY'],'sb_secret_');
const PUBLISHABLE_KEY=readKey(['SUPABASE_PUBLISHABLE_KEYS','SUPABASE_PUBLISHABLE_KEY','SUPABASE_ANON_KEY'],'sb_publishable_');
const AUTH_KEY=PUBLISHABLE_KEY||SECRET_KEY;
const ORIGINS=new Set(['https://magdy4287-beep.github.io','https://azaad-clinic-website.vercel.app','https://azaad-clinic-website-magdy-team.vercel.app','https://azaad-clinic-website-git-main-magdy-team.vercel.app','http://localhost:3000','http://localhost:5173','http://localhost:4173','http://127.0.0.1:3000','http://127.0.0.1:4173']);
function cors(req:Request){const origin=req.headers.get('Origin')||'';return {'Access-Control-Allow-Origin':ORIGINS.has(origin)?origin:'https://azaad-clinic-website.vercel.app','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type, accept','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Credentials':'true','Cache-Control':'no-store',Vary:'Origin'};}
function json(body:unknown,status=200,req?:Request){return new Response(JSON.stringify(body),{status,headers:{...(req?cors(req):{}),'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});}
const authClient=SUPABASE_URL&&AUTH_KEY?createClient(SUPABASE_URL,AUTH_KEY,{auth:{persistSession:false,autoRefreshToken:false}}):null;
const dbClient=SUPABASE_URL&&SECRET_KEY?createClient(SUPABASE_URL,SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}}):null;

async function lookupStaff(username:string){
  if(!dbClient)throw new Error('STAFF_DB_CONFIGURATION_MISSING');
  let lastError='STAFF_LOOKUP_FAILED';
  for(let attempt=1;attempt<=3;attempt+=1){
    try{
      const {data,error}=await dbClient.rpc('staff_login_lookup',{p_username:username,p_email:username.includes('@')?username:null});
      if(!error)return Array.isArray(data)?data[0]||null:null;
      lastError=error.message||'STAFF_LOOKUP_FAILED';
      console.error('staff-login stage=rpc_lookup_error',{attempt,code:error.code,status:(error as any).status,message:lastError});
    }catch(error){
      lastError=error instanceof Error?error.message:'STAFF_LOOKUP_FAILED';
      console.error('staff-login stage=rpc_lookup_exception',{attempt,error:lastError});
    }
    if(attempt<3)await new Promise(resolve=>setTimeout(resolve,[1000,2000][attempt-1]));
  }
  throw new Error(lastError);
}

Deno.serve(async(req:Request)=>{if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors(req)});if(req.method!=='POST')return json({error:'Method not allowed'},405,req);try{if(!authClient||!dbClient||!SUPABASE_URL||!SECRET_KEY)return json({error:'تسجيل الدخول غير متاح حاليًا.',code:'STAFF_LOGIN_CONFIGURATION'},503,req);let body:Record<string,unknown>;try{body=await req.json();}catch(_){return json({error:'طلب تسجيل الدخول غير صالح.',code:'INVALID_JSON'},400,req);}const username=String(body.username||'').trim().toLowerCase();const password=String(body.password||'');if(!username||!password)return json({error:'اسم المستخدم وكلمة المرور مطلوبان.'},400,req);let staff:Record<string,unknown>|null;try{staff=await lookupStaff(username);}catch(error){console.error('staff-login stage=lookup_exception',error instanceof Error?error.message:String(error));return json({error:'خدمة بيانات الموظفين غير متاحة حاليًا.',code:'STAFF_LOOKUP_UNAVAILABLE'},503,req);}if(!staff)return json({error:'بيانات الدخول غير صحيحة أو الحساب غير موجود.'},401,req);if(staff.active!==true)return json({error:'الحساب غير فعال.'},403,req);const email=typeof staff.email==='string'?staff.email.trim():'';const authUserId=typeof staff.auth_user_id==='string'?staff.auth_user_id.trim():'';if(!email||!authUserId)return json({error:'حساب الموظف غير مكتمل.'},403,req);const auth=await authClient.auth.signInWithPassword({email,password});if(auth.error||!auth.data.session||!auth.data.user){console.error('staff-login stage=auth',{status:auth.error?.status,code:auth.error?.code,message:auth.error?.message});return json({error:'بيانات الدخول غير صحيحة.',code:'AUTH_SIGNIN_FAILED'},401,req);}return json({success:true,user:auth.data.user,session:{access_token:auth.data.session.access_token,refresh_token:auth.data.session.refresh_token,expires_in:auth.data.session.expires_in,expires_at:auth.data.session.expires_at,token_type:auth.data.session.token_type},staff},200,req);}catch(error){console.error('staff-login stage=exception',error instanceof Error?error.message:String(error));return json({error:'تعذر تجهيز تسجيل الدخول. حاول مرة أخرى.',code:'STAFF_LOGIN_FAILED'},500,req);}});
