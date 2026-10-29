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
  if(request.method==="GET"&&url.pathname==="/"){let configured=false;try{configured=env.TRYON_PROVIDER==="replicate"?!!env.REPLICATE_API_TOKEN:!!env.TRYON_PROVIDER_URL&&new URL(env.TRYON_PROVIDER_URL).protocol==="https:";}catch{}return json({service:"Zara try-on",ready:false,providerConfigured:configured,notice:configured?"Provider endpoint configured; image generation not yet verified":"Image model not configured"});}
  if(request.method!=="POST"||url.pathname!=="/")return json({error:"Not found"},404);
  if(!origin)return json({error:"Browser origin required"},403);
  const useReplicate=env.TRYON_PROVIDER==="replicate";
  if(useReplicate&&!env.REPLICATE_API_TOKEN)return json({error:"Replicate token is not configured"},503);
  if(!useReplicate&&!env.TRYON_PROVIDER_URL)return json({error:"AI try-on provider is not configured yet"},503);
  const length=Number(request.headers.get("Content-Length")||0);
  if(length>4_000_000)return json({error:"Images too large"},413);
  let body;try{const raw=await request.text();if(raw.length>4_000_000)return json({error:"Images too large"},413);body=JSON.parse(raw);if(!body||typeof body!=="object"||Array.isArray(body))return json({error:"Invalid image request"},400);}catch{return json({error:"Invalid JSON"},400);}
  const validImage=s=>typeof s==="string"&&s.length<2_700_000&&/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s);
  if(!validImage(body.avatar)||!validImage(body.dress))return json({error:"Upload avatar and dress images under the size limit"},400);
  if(useReplicate){
    const api="https://api.replicate.com/v1/models/prunaai/p-image-try-on/predictions";
    const headers={"Authorization":"Bearer "+env.REPLICATE_API_TOKEN,"Content-Type":"application/json","Prefer":"wait=55"};
    try{
      let response=await fetch(api,{method:"POST",headers,body:JSON.stringify({input:{person_image:body.avatar,garment_images:[body.dress]}}),signal:AbortSignal.timeout(58000)});
      if(!response.ok)return json({error:"Try-on provider rejected the request",status:response.status},502);
      let result=await response.json();
      // Replicate returns output when synchronous wait succeeds; otherwise return a clear retry error.
      if(result.status!=="succeeded")return json({error:result.status==="failed"?"Image service failed":"Image generation is still processing; request may incur a charge. Do not submit again immediately.",providerStatus:result.status},502);
      const output=Array.isArray(result.output)?result.output[0]:result.output;
      const image=typeof output==="string"?output:output?.url;
      if(typeof image!=="string"||!/^https:\/\/replicate\.delivery\//.test(image))return json({error:"Try-on provider returned an unsupported image URL"},502);
      return json({image});
    }catch{return json({error:"Try-on provider request failed"},502);}
  }
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