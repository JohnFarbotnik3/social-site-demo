import{t as j,a,c as g}from"../chunks/CghSzh9C.js";import{p as N,s as D,t as O,f as z,g as E,j as b,r as k,i as r,aA as m,m as v,k as x,l as A}from"../chunks/BHUsKUmi.js";import{s as L}from"../chunks/DJWQxmpV.js";import{s as G}from"../chunks/CqqEqyuc.js";import{p as F,i as H}from"../chunks/ZOBCVC-6.js";import{b as c,i as I,e as M}from"../chunks/CmaycYwG.js";import{s as J,a as K,c as Q}from"../chunks/D1hb-OSk.js";import{a as R,c as U}from"../chunks/DbOWqKF8.js";const V=!0,W=!1,ce=Object.freeze(Object.defineProperty({__proto__:null,prerender:V,ssr:W},Symbol.toStringTag,{value:"Module"}));var X=j("<a><!></a>");function h(p,e){N(e,!0);let o=D(F(location.pathname));R(()=>E(o,F(location.pathname)));var t=X(),d=b(t);L(d,()=>e.children),k(t),O(()=>{J(t,"href",e.href),K(t,Q(e.href===r(o)?"active":""),"svelte-19sja1")}),a(p,t),z()}var Y=j('<!> <!> <span class="spacer svelte-2wg4kt"></span> <span id="name" class="svelte-2wg4kt"> </span> <!>',1),Z=j('<nav class="svelte-2wg4kt"><!> <span class="spacer svelte-2wg4kt"></span> <!></nav>');function ee(p,e){N(e,!0);var o=Z(),t=b(o);const d=v(()=>c("/"));h(t,{get href(){return r(d)},children:(s,n)=>{m();var i=g("Front page");a(s,i)},$$slots:{default:!0}});var y=x(t,4);{var $=s=>{var n=Y(),i=A(n);const l=v(()=>c("/posts"));h(i,{get href(){return r(l)},children:(_,S)=>{m();var u=g("My Posts");a(_,u)},$$slots:{default:!0}});var P=x(i,2);const T=v(()=>c("/friends"));h(P,{get href(){return r(T)},children:(_,S)=>{m();var u=g("Friends");a(_,u)},$$slots:{default:!0}});var w=x(P,4),q=b(w,!0);k(w);var B=x(w,2);const C=v(()=>c("/profile"));h(B,{get href(){return r(C)},children:(_,S)=>{m();var u=g("Profile");a(_,u)},$$slots:{default:!0}}),O(()=>G(q,e.display_name)),a(s,n)},f=s=>{const n=v(()=>c("/login"));h(s,{get href(){return r(n)},children:(i,l)=>{m();var P=g("Sign in");a(i,P)},$$slots:{default:!0}})};H(y,s=>{e.is_logged_in?s($):s(f,!1)})}k(o),a(p,o),z()}var te=j('<div id="nav" class="svelte-1p98soz"><!></div> <div id="body" class="svelte-1p98soz"><!></div>',1);function pe(p,e){N(e,!0);const o=["/","/login","/posts"].map(l=>c(l)),t=v(()=>M.token),d=v(()=>{var l;return(l=M)==null?void 0:l.nickname});function y(){!r(t)&&!o.includes(location.pathname)&&I("/login")}y(),U(y);var $=te(),f=A($),s=b(f);ee(s,{get is_logged_in(){return r(t)},get display_name(){return r(d)}}),k(f);var n=x(f,2),i=b(n);L(i,()=>e.children),k(n),a(p,$),z()}export{pe as component,ce as universal};
