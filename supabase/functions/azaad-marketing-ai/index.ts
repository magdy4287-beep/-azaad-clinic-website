import "jsr:@supabase/functions-js@2/edge-runtime.d.ts";
const C={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,content-type,apikey","Access-Control-Allow-Methods":"POST,OPTIONS"};
const json=(d:unknown,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{...C,"Content-Type":"application/json","Cache-Control":"no-store"}});
async function auth(req:Request){const h=req.headers.get('authorization')||'';if(!h.startsWith('Bearer '))return false;const token=h.slice(7);const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;const r=await fetch(`${url}/auth/v1/user`,{headers:{Authorization:`Bearer ${token}`,apikey:key}});if(!r.ok)return false;const u=await r.json();return !!u?.id}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:C});
 if(req.method!=='POST')return json({error:'POST required'},405);
 if(!(await auth(req)))return json({error:'Unauthorized'},401);
 const body=await req.json().catch(()=>({}));
 const topic=String(body.topic||'Azaad Clinic').slice(0,300);const objective=String(body.objective||'').slice(0,800);const platforms=Array.isArray(body.platforms)?body.platforms.slice(0,10):[];const language=body.language==='en'?'en':'ar';
 const key=Deno.env.get('GEMINI_API_KEY');
 if(!key){
   const ar=`${topic}\n\nفي Azaad Clinic نهتم بتقديم رعاية نفسية مهنية، إنسانية، وسرية. ${objective||'احجز موعدك وتعرّف على خدماتنا وفريقنا.'}\n\n📅 احجز موعدك من الموقع.`;
   const en=`${topic}\n\nAt Azaad Clinic, we provide professional, human, and confidential mental-health care. ${objective||'Explore our services and team and book an appointment.'}\n\n📅 Book your appointment from our website.`;
   const tags=['AzaadClinic','MentalHealth','Psychotherapy','MentalHealthCare','BookAppointment'];
   return json({caption:language==='en'?en:ar,hashtags:tags,provider:'local-free-fallback',platforms});
 }
 const prompt=`You are Azaad Clinic's marketing copilot. Create one safe, professional social caption for a mental-health clinic. Never diagnose, promise outcomes, reveal patient information, or make unsupported medical claims. Keep it human and suitable for Facebook, Instagram, LinkedIn, TikTok and the clinic website. Return JSON only: {caption:string,hashtags:string[]}. Language: ${language}. Topic: ${topic}. Objective/context: ${objective}. Platforms: ${JSON.stringify(platforms)}`;
 try{
   const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${encodeURIComponent(key)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({contents:[{parts:[{text:prompt}]}],generationConfig:{responseMimeType:'application/json',temperature:0.5}})});
   if(!r.ok)return json({error:'AI provider unavailable'},502);
   const data=await r.json();const text=data?.candidates?.[0]?.content?.parts?.[0]?.text||'{}';let parsed={};try{parsed=JSON.parse(text)}catch{}
   return json({caption:String(parsed?.caption||''),hashtags:Array.isArray(parsed?.hashtags)?parsed.hashtags:[],provider:'gemini-free-tier',platforms});
 }catch(_){return json({error:'AI generation failed'},502)}
});
