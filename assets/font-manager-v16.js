/* 字習工坊 V16：共用注音字型管理、瀏覽器快取與本機上傳。 */
(()=>{
'use strict';
const PREF='zixi_font_source_v16',CACHE='zixi_font_cache_v16',DB='zixi_teacher_font_v16';
const FONT=new URL('./BpmfZihiKaiStd-Regular.woff2',document.currentScript?.src||document.baseURI).href;
const TTF=new URL('./BpmfZihiKaiStd-Regular.ttf',document.currentScript?.src||document.baseURI).href;
let task=null,face=null,busy=false;
const el=id=>document.getElementById(id);
function getPref(){try{return localStorage.getItem(PREF)}catch{return null}}
function savePref(v){try{if(el('fmRemember').checked)localStorage.setItem(PREF,v);else localStorage.removeItem(PREF)}catch{}}
function progress(msg,p){if(el('fmStatus'))el('fmStatus').textContent=msg;if(Number.isFinite(p)&&el('fmBar'))el('fmBar').style.width=p+'%'}
function open(){progress(zihiFontReady?'✓ 字型已載入':'請選擇字型來源。',zihiFontReady?100:0);if(!el('fontManagerV16').open)el('fontManagerV16').showModal()}
function close(){if(!busy&&el('fontManagerV16').open)el('fontManagerV16').close()}
function lock(v){busy=v;document.querySelectorAll('[data-fm-action],#fmClose').forEach(b=>b.disabled=v)}
function dbOpen(){return new Promise((ok,no)=>{try{let r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('fonts');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}catch(e){no(e)}})}
async function dbSave(file){let db=await dbOpen();try{await new Promise((ok,no)=>{let t=db.transaction('fonts','readwrite');t.objectStore('fonts').put({blob:file,name:file.name},'font');t.oncomplete=ok;t.onerror=()=>no(t.error)})}finally{db.close()}}
async function dbLoad(){let db=await dbOpen();try{return await new Promise((ok,no)=>{let r=db.transaction('fonts','readonly').objectStore('fonts').get('font');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)})}finally{db.close()}}
function applyFont(f,mode,name){if(face)document.fonts.delete(face);face=f;zihiFace=f;zihiFontMode=mode;zihiFontReady=true;document.documentElement.style.setProperty('--annotation-font',"'"+name+"'");renderPaper();applyZoom();fitDraftPreview()}
function message(t,level='ok'){reportZihiStatus(t,level);progress(t,100)}
async function acquire(){let cache=null,res=null,hit=false;
 if('caches' in window&&location.protocol==='https:'){try{cache=await caches.open(CACHE);res=await cache.match(FONT);hit=!!res}catch{}}
 if(!res){progress('正在取得網站內建字型，首次使用可能需要稍等…',5);res=await fetch(FONT,{cache:'force-cache'});if(!res.ok)res=await fetch(TTF,{cache:'force-cache'});if(!res.ok)throw Error('HTTP '+res.status);
  let bytes=new Uint8Array(await res.arrayBuffer());if(cache){try{await cache.put(FONT,new Response(bytes.slice(),{headers:{'Content-Type':'font/woff2'}}))}catch{}}return {bytes:bytes.buffer,hit:false}
 }progress('正在讀取本機快取的字型…',75);return {bytes:await res.arrayBuffer(),hit};
}
async function builtin(persist=true){if(task)return task;if(zihiFontReady&&zihiFontMode==='builtin'){close();return true}
 zihiFontMode='builtin';zihiFontReady=false;task=(async()=>{try{let {bytes,hit}=await acquire();progress('正在解析直式注音字型…',90);let f=await new FontFace('ZixiV16Builtin',bytes,{weight:'400'}).load();document.fonts.add(f);applyFont(f,'builtin','ZixiV16Builtin');if(persist)savePref('builtin');message(hit?'✓ 從本機快取載入完成，不需再次下載。':'✓ 內建字型已載入，並嘗試保存到瀏覽器快取。');return true}catch(e){zihiFontReady=false;message('⚠ 載入內建字型失敗：'+(e.message||e),'warn');return false}finally{task=null}})();return task
}
async function custom(file,persist=true){if(!file)return false;
 if(!/\.(ttf|otf|woff2?)$/i.test(file.name)||file.size>30*1024*1024){progress('請選擇 30 MB 以下的 TTF、OTF、WOFF 或 WOFF2 字型。',0);return false}
 try{progress('正在載入本機字型…',45);let f=await new FontFace('ZixiV16Custom',await file.arrayBuffer(),{weight:'400'}).load();document.fonts.add(f);applyFont(f,'custom','ZixiV16Custom');let stored=false;if(persist){try{await dbSave(file);stored=true}catch{}}
  if(stored)savePref('custom');else if(persist){try{localStorage.removeItem(PREF)}catch{}}
  message(stored?'✓ 已儲存教師自訂字型，下次可從這台瀏覽器恢復。':'✓ 已使用教師字型，但尚未持久保存；下次可能需要重新上傳。');return true
 }catch(e){progress('⚠ 字型檔案無法使用，請重新選擇。',0);return false}
}
function later(){zihiFontMode='later';zihiFontReady=false;document.documentElement.style.setProperty('--annotation-font',"'DFKai-SB'");savePref('later');message('已選擇稍後再設定，仍可使用一般注音填空。','warn');renderPaper();applyZoom();fitDraftPreview();close()}
async function restore(){let p=getPref();if(p==='builtin'){await builtin(false)}else if(p==='custom'){try{let s=await dbLoad();if(!s?.blob)throw Error('lost');let f=s.blob instanceof File?s.blob:new File([s.blob],s.name||'自訂字型.ttf');if(!await custom(f,false))throw Error('invalid');message('✓ 已從本機恢復教師自訂字型。')}catch{message('⚠ 找不到已儲存的教師字型，請重新上傳。','warn');open()}}else if(p==='later'){message('已設定為稍後選擇字型。','warn')}else{message('首次使用，請選擇字型來源。','warn');open()}}
function init(){
 let style=document.createElement('style');style.textContent='.fm-v16{border:0;border-radius:20px;padding:24px;background:white;color:#203e40;width:min(530px,94vw);max-height:92vh;overflow:auto;box-shadow:0 25px 100px #18313d55}.fm-v16::backdrop{background:#123047aa}.fm-v16 h2{margin:0 0 8px;font-size:22px}.fm-v16 p{font-size:13px;color:#52726e;line-height:1.6;margin:0 0 15px}.fm-v16 .fm-choice{display:block;text-align:left;background:#f8fdfb;border:1.5px solid #cadfd9;border-radius:12px;width:100%;padding:13px;margin:10px 0;cursor:pointer;color:#21494a}.fm-v16 .fm-choice:hover{background:#e5f6ef;border-color:#64ac9f}.fm-v16 .fm-choice strong{display:block;font-size:15px}.fm-v16 .fm-choice small{display:block;font-size:12px;color:#607e78;line-height:1.6;margin-top:4px}.fm-v16 .meter{height:7px;overflow:hidden;border-radius:15px;background:#e7f2ef;margin:9px 0}.fm-v16 #fmBar{display:block;width:0;height:100%;background:#29aa9d;transition:width .2s}.fm-v16 #fmStatus{min-height:20px;font-size:12px;color:#216c64;line-height:1.5;margin-top:14px}.fm-v16 .fm-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:12px}.fm-v16 .fm-note{font-size:11px;margin-top:12px;color:#637975}@media print{.fm-v16,.fm-open{display:none!important}}';document.head.append(style);
 document.body.insertAdjacentHTML('beforeend','<dialog id="fontManagerV16" class="fm-v16" aria-label="網站字型設定"><h2>字習工坊｜字型設定</h2><p>請選擇網站內建字嗨字型或上傳自己的字型。所有學習單模式共用這項設定。</p><button class="fm-choice" data-fm-action="builtin"><strong>↓ 使用網站內建字嗨字型</strong><small>推薦・首次下載約 7.7 MB，之後優先讀取瀏覽器快取。</small></button><button class="fm-choice" data-fm-action="custom"><strong>↑ 上傳自己的字型</strong><small>支援 TTF、OTF、WOFF、WOFF2；可儲存於本機瀏覽器。</small></button><button class="fm-choice" data-fm-action="later"><strong>→ 稍後再選擇</strong><small>先使用一般注音填空，日後再開啟完整注音例字。</small></button><input id="fmUpload" type="file" accept=".ttf,.otf,.woff,.woff2" hidden><div role="status" id="fmStatus" aria-live="polite">請選擇字型來源。</div><div class="meter"><span id="fmBar"></span></div><div class="fm-foot"><label><input type="checkbox" id="fmRemember" checked> 記住此瀏覽器的選擇</label><button type="button" class="btn outline" id="fmClose">關閉</button></div><p class="fm-note">清除網站資料、無痕模式或換電腦後可能需重新下載；教師上傳的檔案不會傳到網站伺服器。</p></dialog>');
 for(let sel of ['#screenHome .flow-tools','#screenDraft .flow-header','#editorScreen .topactions']){let host=document.querySelector(sel);if(!host)continue;let btn=document.createElement('button');btn.type='button';btn.className='btn small outline fm-open';btn.textContent='⚙ 字型設定';btn.addEventListener('click',open);host.append(btn)}
 document.querySelector('[data-fm-action="builtin"]').onclick=async()=>{lock(true);try{await builtin()}finally{lock(false);if(zihiFontReady&&zihiFontMode==='builtin')close()}};
 document.querySelector('[data-fm-action="custom"]').onclick=()=>el('fmUpload').click();
 document.querySelector('[data-fm-action="later"]').onclick=later;
 el('fmClose').onclick=close;
 el('fontManagerV16').addEventListener('cancel',e=>{if(busy)e.preventDefault()});
 el('fmUpload').onchange=async e=>{let f=e.target.files?.[0];if(!f)return;lock(true);try{await custom(f)}finally{lock(false);e.target.value='';if(zihiFontReady&&zihiFontMode==='custom')close()}};
 document.querySelectorAll('[data-reset-zihi]').forEach(btn=>btn.addEventListener('click',async e=>{e.stopImmediatePropagation();await builtin()},true));
 for(let id of ['bpmfFontDraft','bpmfFontEditor']){let inp=el(id);if(inp)inp.addEventListener('change',async e=>{e.stopImmediatePropagation();await custom(inp.files?.[0])},true)}
 restore();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();