// Keep the main app's embedded studio in sync with the standalone page.
import {readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const path=new URL('index.html',root);
let index=readFileSync(path,'utf8');
const pattern=/const embeddedPages=(\{[^\n]+\});/;
const pages=JSON.parse(index.match(pattern)[1]);
const previous=Buffer.from(pages.avatar,'base64').toString('utf8');
const styles=[...previous.matchAll(/<style>[\s\S]*?<\/style>/g)];
const theme=styles.slice(1).map(x=>x[0]).join('');
const navigation=previous.match(/<script>document\.addEventListener\('click',[\s\S]*?<\/script>/)?.[0];
if(!navigation)throw Error('Embedded studio navigation adapter missing');
const avatar=readFileSync(new URL('avatar.html',root),'utf8');
pages.avatar=Buffer.from(avatar.replace('</head>',theme+'</head>').replace('</body>',navigation+'</body>')).toString('base64');
index=index.replace(pattern,()=>`const embeddedPages=${JSON.stringify(pages)};`);
writeFileSync(path,index);
console.log('Main Dress Studio synced from avatar.html');
