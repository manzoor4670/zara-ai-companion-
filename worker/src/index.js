// Zara virtual try-on API adapter. No image model is configured by default.
// Configure TRYON_PROVIDER_URL and TRYON_PROVIDER_TOKEN as Cloudflare secrets.
// Provider must accept {avatar,dress,instructions} and return {image: dataURL|httpsURL}.
const ORIGIN="https://manzoor4670.github.io";
const cors={"Access-Control-Allow-Origin":ORIGIN,"Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Vary":"Origin"};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}});
export default {async fetch(request,env){
  const origin=request.headers.get("Origin");
  if(origin&&origin!==ORIGIN)return json({error:"Origin not allowed"},403);
  const url=new URL(request.url);
  if(request.method==="OPTIONS")return origin===ORIGIN?new Response(null,{status:204,headers:cors}):json({error:"Origin not allowed"},403);
  if(request.method==="GET"&&url.pathname==="/"){let configured=false;try{configured=!!env.TRYON_PROVIDER_URL&&new URL(env.TRYON_PROVIDER_URL).protocol==="https:";}catch{}return json({service:"Zara try-on",ready:configured,notice:configured?"Provider endpoint configured; image generation not yet verified":"Image model not configured"});}
  if(request.method!=="POST"||url.pathname!=="/")return json({error:"Not found"},404);
  if(!origin)return json({error:"Browser origin required"},403);
  if(!env.TRYON_PROVIDER_URL)return json({error:"AI try-on provider is not configured yet"},503);
  const length=Number(request.headers.get("Content-Length")||0);
  if(length>4_000_000)return json({error:"Images too large"},413);
  let body;try{body=await request.json();}catch{return json({error:"Invalid JSON"},400);}
  const validImage=s=>typeof s==="string"&&s.length<2_700_000&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s);
  if(!validImage(body.avatar)||!validImage(body.dress))return json({error:"Upload avatar and dress images under the size limit"},400);
  let provider;try{provider=new URL(env.TRYON_PROVIDER_URL);}catch{return json({error:"Invalid try-on provider URL"},503);}
  if(provider.protocol!=="https:")return json({error:"Provider must be HTTPS"},503);
  try{
    const response=await fetch(provider.toString(),{method:"POST",headers:{"Content-Type":"application/json",...(env.TRYON_PROVIDER_TOKEN?{"Authorization":"Bearer "+env.TRYON_PROVIDER_TOKEN}:{})},body:JSON.stringify({avatar:body.avatar,dress:body.dress,instructions:"Create a realistic, clothed, full-body adult avatar wearing the reference dress. Preserve the avatar's likeness and proportions. No nudity."}),signal:AbortSignal.timeout(55000)});
    if(!response.ok)return json({error:"Image service did not complete the request",status:response.status},502);
    const result=await response.json();const image=result.image||result.imageUrl;
    if(typeof image!=="string"||!(/^data:image\/(?:png|jpeg|webp);base64,/.test(image)||/^https:\/\//.test(image)))return json({error:"Image service returned an unsupported format"},502);
    return json({image});
  }catch{return json({error:"Image service request failed"},502);}
}};