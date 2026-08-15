/* AZAAD — friendly patient icon guard
 * Runs before admin-nextgen-fixes so the legacy 🤢 replacement cannot erase labels.
 */
(() => {
  'use strict';
  const PLACEHOLDER='\uE000';
  const $=id=>document.getElementById(id);
  const isPatientContext=node=>!!node?.parentElement?.closest('#patientsPanel,#frontdeskPanel,.tabs');
  const replaceTextNode=node=>{
    if(!node?.nodeValue||/^(SCRIPT|STYLE)$/i.test(node.parentElement?.tagName||''))return;
    if(!node.nodeValue.includes('🤢'))return;
    if(isPatientContext(node)) node.nodeValue=node.nodeValue.replaceAll('🤢',PLACEHOLDER);
  };
  function install(){
    const style=document.createElement('style');
    style.id='azaadFriendlyPatientGuardStyles';
    style.textContent=`
      .azaad-friendly-patient{display:inline-flex;align-items:center;justify-content:center;width:1.15em;height:1.15em;border-radius:50%;background:linear-gradient(135deg,#7ee787,#2ea043);color:#fff;font-weight:900;font-size:.78em;vertical-align:-.08em;box-shadow:0 1px 4px rgba(46,160,67,.25)}
      .azaad-friendly-patient::before{content:'☺';font-size:.72em}
    `;
    if(!$('azaadFriendlyPatientGuardStyles'))document.head.appendChild(style);
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(replaceTextNode);
    const observer=new MutationObserver(records=>records.forEach(r=>r.addedNodes.forEach(n=>{
      if(n.nodeType===3)replaceTextNode(n);
      else if(n.nodeType===1){const w=document.createTreeWalker(n,NodeFilter.SHOW_TEXT),xs=[];while(w.nextNode())xs.push(w.currentNode);xs.forEach(replaceTextNode);}
    })));
    observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(restore,800);
    setTimeout(restore,1800);
  }
  function restore(){
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),nodes=[];
    while(walker.nextNode())nodes.push(walker.currentNode);
    nodes.forEach(node=>{if(!node.nodeValue?.includes(PLACEHOLDER))return;const parts=node.nodeValue.split(PLACEHOLDER);if(parts.length===1)return;const frag=document.createDocumentFragment();parts.forEach((part,i)=>{if(part)frag.appendChild(document.createTextNode(part));if(i<parts.length-1){const s=document.createElement('span');s.className='azaad-friendly-patient';s.setAttribute('aria-label','مريض');s.title='مريض';frag.appendChild(s);}});node.parentNode?.replaceChild(frag,node);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
