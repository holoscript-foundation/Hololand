/* HoloScript Runtime v2.1.0 - https://holoscript.dev */
"use strict";var HoloScript=(()=>{var so=Object.defineProperty;var $h=Object.getOwnPropertyDescriptor;var Yh=Object.getOwnPropertyNames;var Kh=Object.prototype.hasOwnProperty;var qi=(n=>typeof require<"u"?require:typeof Proxy<"u"?new Proxy(n,{get:(e,t)=>(typeof require<"u"?require:e)[t]}):n)(function(n){if(typeof require<"u")return require.apply(this,arguments);throw Error('Dynamic require of "'+n+'" is not supported')});var jh=(n,e)=>{for(var t in e)so(n,t,{get:e[t],enumerable:!0})},Zh=(n,e,t,i)=>{if(e&&typeof e=="object"||typeof e=="function")for(let s of Yh(e))!Kh.call(n,s)&&s!==t&&so(n,s,{get:()=>e[s],enumerable:!(i=$h(e,s))||i.enumerable});return n};var Jh=n=>Zh(so({},"__esModule",{value:!0}),n);var a0={};jh(a0,{BrowserRuntime:()=>Qr,createRuntime:()=>Hh});var ln={LEFT:0,MIDDLE:1,RIGHT:2,ROTATE:0,DOLLY:1,PAN:2},hn={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Qh=0,mc=1,eu=2;var Ql=1,tu=2,mi=3,ri=0,It=1,Jt=2;var Li=0,Nn=1,gc=2,yc=3,xc=4,iu=5,Ji=100,nu=101,su=102,vc=103,_c=104,ru=200,ou=201,au=202,cu=203,Bo=204,zo=205,lu=206,hu=207,uu=208,du=209,pu=210,fu=211,mu=212,gu=213,yu=214,xu=0,vu=1,_u=2,or=3,bu=4,Su=5,wu=6,Mu=7,eh=0,Tu=1,Eu=2,Ii=0,Au=1,Ru=2,Cu=3,Pu=4,Lu=5,Iu=6,bc="attached",ku="detached",th=300,Un=301,Fn=302,Ho=303,Vo=304,Hr=306,sn=1e3,Ut=1001,us=1002,pt=1003,ar=1004;var os=1005;var Lt=1006,ba=1007;var Ni=1008;var ki=1009,Nu=1010,Du=1011,Sa=1012,ih=1013,Ci=1014,gi=1015,ds=1016,nh=1017,sh=1018,en=1020,Ou=1021,Vt=1023,Uu=1024,Fu=1025,tn=1026,Bn=1027,Bu=1028,rh=1029,zu=1030,oh=1031,ah=1033,ro=33776,oo=33777,ao=33778,co=33779,Sc=35840,wc=35841,Mc=35842,Tc=35843,ch=36196,Ec=37492,Ac=37496,Rc=37808,Cc=37809,Pc=37810,Lc=37811,Ic=37812,kc=37813,Nc=37814,Dc=37815,Oc=37816,Uc=37817,Fc=37818,Bc=37819,zc=37820,Hc=37821,lo=36492,Vc=36494,Gc=36495,Hu=36283,Wc=36284,Xc=36285,qc=36286,wa=2200,As=2201,Vu=2202,zn=2300,rn=2301,ho=2302,Cn=2400,Pn=2401,cr=2402,Ma=2500,Gu=2501,lh=0,Vr=1,Rs=2,hh=3e3,nn=3001,Wu=3200,Xu=3201,uh=0,qu=1,Gt="",st="srgb",mt="srgb-linear",Ta="display-p3",Gr="display-p3-linear",lr="linear",tt="srgb",hr="rec709",ur="p3";var dn=7680;var $c=519,$u=512,Yu=513,Ku=514,dh=515,ju=516,Zu=517,Ju=518,Qu=519,Go=35044;var Yc="300 es",Wo=1035,yi=2e3,dr=2001,ei=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){if(this._listeners===void 0)return!1;let i=this._listeners;return i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){if(this._listeners===void 0)return;let s=this._listeners[e];if(s!==void 0){let r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){if(this._listeners===void 0)return;let i=this._listeners[e.type];if(i!==void 0){e.target=this;let s=i.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,e);e.target=null}}},Et=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Kc=1234567,as=Math.PI/180,Hn=180/Math.PI;function Qt(){let n=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Et[n&255]+Et[n>>8&255]+Et[n>>16&255]+Et[n>>24&255]+"-"+Et[e&255]+Et[e>>8&255]+"-"+Et[e>>16&15|64]+Et[e>>24&255]+"-"+Et[t&63|128]+Et[t>>8&255]+"-"+Et[t>>16&255]+Et[t>>24&255]+Et[i&255]+Et[i>>8&255]+Et[i>>16&255]+Et[i>>24&255]).toLowerCase()}function St(n,e,t){return Math.max(e,Math.min(t,n))}function Ea(n,e){return(n%e+e)%e}function ed(n,e,t,i,s){return i+(n-e)*(s-i)/(t-e)}function td(n,e,t){return n!==e?(t-n)/(e-n):0}function cs(n,e,t){return(1-t)*n+t*e}function id(n,e,t,i){return cs(n,e,1-Math.exp(-t*i))}function nd(n,e=1){return e-Math.abs(Ea(n,e*2)-e)}function sd(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*(3-2*n))}function rd(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*n*(n*(n*6-15)+10))}function od(n,e){return n+Math.floor(Math.random()*(e-n+1))}function ad(n,e){return n+Math.random()*(e-n)}function cd(n){return n*(.5-Math.random())}function ld(n){n!==void 0&&(Kc=n);let e=Kc+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function hd(n){return n*as}function ud(n){return n*Hn}function Xo(n){return(n&n-1)===0&&n!==0}function dd(n){return Math.pow(2,Math.ceil(Math.log(n)/Math.LN2))}function pr(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))}function pd(n,e,t,i,s){let r=Math.cos,o=Math.sin,a=r(t/2),c=o(t/2),l=r((e+i)/2),h=o((e+i)/2),u=r((e-i)/2),d=o((e-i)/2),f=r((i-e)/2),g=o((i-e)/2);switch(s){case"XYX":n.set(a*h,c*u,c*d,a*l);break;case"YZY":n.set(c*d,a*h,c*u,a*l);break;case"ZXZ":n.set(c*u,c*d,a*h,a*l);break;case"XZX":n.set(a*h,c*g,c*f,a*l);break;case"YXY":n.set(c*f,a*h,c*g,a*l);break;case"ZYZ":n.set(c*g,c*f,a*h,a*l);break;default:console.warn("THREE.MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function ni(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("Invalid component type.")}}function Ze(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("Invalid component type.")}}var Wr={DEG2RAD:as,RAD2DEG:Hn,generateUUID:Qt,clamp:St,euclideanModulo:Ea,mapLinear:ed,inverseLerp:td,lerp:cs,damp:id,pingpong:nd,smoothstep:sd,smootherstep:rd,randInt:od,randFloat:ad,randFloatSpread:cd,seededRandom:ld,degToRad:hd,radToDeg:ud,isPowerOfTwo:Xo,ceilPowerOfTwo:dd,floorPowerOfTwo:pr,setQuaternionFromProperEuler:pd,normalize:Ze,denormalize:ni},Ee=class n{constructor(e=0,t=0){n.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,i=this.y,s=e.elements;return this.x=s[0]*t+s[3]*i+s[6],this.y=s[1]*t+s[4]*i+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this}clampLength(e,t){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let i=this.dot(e)/t;return Math.acos(St(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let i=Math.cos(t),s=Math.sin(t),r=this.x-e.x,o=this.y-e.y;return this.x=r*i-o*s+e.x,this.y=r*s+o*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}},Ve=class n{constructor(e,t,i,s,r,o,a,c,l){n.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,s,r,o,a,c,l)}set(e,t,i,s,r,o,a,c,l){let h=this.elements;return h[0]=e,h[1]=s,h[2]=a,h[3]=t,h[4]=r,h[5]=c,h[6]=i,h[7]=o,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let i=e.elements,s=t.elements,r=this.elements,o=i[0],a=i[3],c=i[6],l=i[1],h=i[4],u=i[7],d=i[2],f=i[5],g=i[8],y=s[0],m=s[3],p=s[6],S=s[1],v=s[4],w=s[7],C=s[2],T=s[5],R=s[8];return r[0]=o*y+a*S+c*C,r[3]=o*m+a*v+c*T,r[6]=o*p+a*w+c*R,r[1]=l*y+h*S+u*C,r[4]=l*m+h*v+u*T,r[7]=l*p+h*w+u*R,r[2]=d*y+f*S+g*C,r[5]=d*m+f*v+g*T,r[8]=d*p+f*w+g*R,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],i=e[1],s=e[2],r=e[3],o=e[4],a=e[5],c=e[6],l=e[7],h=e[8];return t*o*h-t*a*l-i*r*h+i*a*c+s*r*l-s*o*c}invert(){let e=this.elements,t=e[0],i=e[1],s=e[2],r=e[3],o=e[4],a=e[5],c=e[6],l=e[7],h=e[8],u=h*o-a*l,d=a*c-h*r,f=l*r-o*c,g=t*u+i*d+s*f;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);let y=1/g;return e[0]=u*y,e[1]=(s*l-h*i)*y,e[2]=(a*i-s*o)*y,e[3]=d*y,e[4]=(h*t-s*c)*y,e[5]=(s*r-a*t)*y,e[6]=f*y,e[7]=(i*c-l*t)*y,e[8]=(o*t-i*r)*y,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,s,r,o,a){let c=Math.cos(r),l=Math.sin(r);return this.set(i*c,i*l,-i*(c*o+l*a)+o+e,-s*l,s*c,-s*(-l*o+c*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(uo.makeScale(e,t)),this}rotate(e){return this.premultiply(uo.makeRotation(-e)),this}translate(e,t){return this.premultiply(uo.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,i=e.elements;for(let s=0;s<9;s++)if(t[s]!==i[s])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){let i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}},uo=new Ve;function ph(n){for(let e=n.length-1;e>=0;--e)if(n[e]>=65535)return!0;return!1}function ps(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function fd(){let n=ps("canvas");return n.style.display="block",n}var jc={};function ls(n){n in jc||(jc[n]=!0,console.warn(n))}var Zc=new Ve().set(.8224621,.177538,0,.0331941,.9668058,0,.0170827,.0723974,.9105199),Jc=new Ve().set(1.2249401,-.2249404,0,-.0420569,1.0420571,0,-.0196376,-.0786361,1.0982735),Is={[mt]:{transfer:lr,primaries:hr,toReference:n=>n,fromReference:n=>n},[st]:{transfer:tt,primaries:hr,toReference:n=>n.convertSRGBToLinear(),fromReference:n=>n.convertLinearToSRGB()},[Gr]:{transfer:lr,primaries:ur,toReference:n=>n.applyMatrix3(Jc),fromReference:n=>n.applyMatrix3(Zc)},[Ta]:{transfer:tt,primaries:ur,toReference:n=>n.convertSRGBToLinear().applyMatrix3(Jc),fromReference:n=>n.applyMatrix3(Zc).convertLinearToSRGB()}},md=new Set([mt,Gr]),je={enabled:!0,_workingColorSpace:mt,get workingColorSpace(){return this._workingColorSpace},set workingColorSpace(n){if(!md.has(n))throw new Error(`Unsupported working color space, "${n}".`);this._workingColorSpace=n},convert:function(n,e,t){if(this.enabled===!1||e===t||!e||!t)return n;let i=Is[e].toReference,s=Is[t].fromReference;return s(i(n))},fromWorkingColorSpace:function(n,e){return this.convert(n,this._workingColorSpace,e)},toWorkingColorSpace:function(n,e){return this.convert(n,e,this._workingColorSpace)},getPrimaries:function(n){return Is[n].primaries},getTransfer:function(n){return n===Gt?lr:Is[n].transfer}};function Dn(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function po(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}var pn,fr=class{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{pn===void 0&&(pn=ps("canvas")),pn.width=e.width,pn.height=e.height;let i=pn.getContext("2d");e instanceof ImageData?i.putImageData(e,0,0):i.drawImage(e,0,0,e.width,e.height),t=pn}return t.width>2048||t.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",e),t.toDataURL("image/jpeg",.6)):t.toDataURL("image/png")}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=ps("canvas");t.width=e.width,t.height=e.height;let i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);let s=i.getImageData(0,0,e.width,e.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=Dn(r[o]/255)*255;return i.putImageData(s,0,0),t}else if(e.data){let t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(Dn(t[i]/255)*255):t[i]=Dn(t[i]);return{data:t,width:e.width,height:e.height}}else return console.warn("THREE.ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},gd=0,mr=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:gd++}),this.uuid=Qt(),this.data=e,this.version=0}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let i={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(fo(s[o].image)):r.push(fo(s[o]))}else r=fo(s);i.url=r}return t||(e.images[this.uuid]=i),i}};function fo(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?fr.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}var yd=0,Rt=class n extends ei{constructor(e=n.DEFAULT_IMAGE,t=n.DEFAULT_MAPPING,i=Ut,s=Ut,r=Lt,o=Ni,a=Vt,c=ki,l=n.DEFAULT_ANISOTROPY,h=Gt){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:yd++}),this.uuid=Qt(),this.name="",this.source=new mr(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=l,this.format=a,this.internalFormat=null,this.type=c,this.offset=new Ee(0,0),this.repeat=new Ee(1,1),this.center=new Ee(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ve,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,typeof h=="string"?this.colorSpace=h:(ls("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace=h===nn?st:Gt),this.userData={},this.version=0,this.onUpdate=null,this.isRenderTargetTexture=!1,this.needsPMREMUpdate=!1}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let i={metadata:{version:4.6,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==th)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case sn:e.x=e.x-Math.floor(e.x);break;case Ut:e.x=e.x<0?0:1;break;case us:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case sn:e.y=e.y-Math.floor(e.y);break;case Ut:e.y=e.y<0?0:1;break;case us:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}get encoding(){return ls("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace===st?nn:hh}set encoding(e){ls("THREE.Texture: Property .encoding has been replaced by .colorSpace."),this.colorSpace=e===nn?st:Gt}};Rt.DEFAULT_IMAGE=null;Rt.DEFAULT_MAPPING=th;Rt.DEFAULT_ANISOTROPY=1;var Qe=class n{constructor(e=0,t=0,i=0,s=1){n.prototype.isVector4=!0,this.x=e,this.y=t,this.z=i,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,s){return this.x=e,this.y=t,this.z=i,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,i=this.y,s=this.z,r=this.w,o=e.elements;return this.x=o[0]*t+o[4]*i+o[8]*s+o[12]*r,this.y=o[1]*t+o[5]*i+o[9]*s+o[13]*r,this.z=o[2]*t+o[6]*i+o[10]*s+o[14]*r,this.w=o[3]*t+o[7]*i+o[11]*s+o[15]*r,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,s,r,c=e.elements,l=c[0],h=c[4],u=c[8],d=c[1],f=c[5],g=c[9],y=c[2],m=c[6],p=c[10];if(Math.abs(h-d)<.01&&Math.abs(u-y)<.01&&Math.abs(g-m)<.01){if(Math.abs(h+d)<.1&&Math.abs(u+y)<.1&&Math.abs(g+m)<.1&&Math.abs(l+f+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let v=(l+1)/2,w=(f+1)/2,C=(p+1)/2,T=(h+d)/4,R=(u+y)/4,W=(g+m)/4;return v>w&&v>C?v<.01?(i=0,s=.707106781,r=.707106781):(i=Math.sqrt(v),s=T/i,r=R/i):w>C?w<.01?(i=.707106781,s=0,r=.707106781):(s=Math.sqrt(w),i=T/s,r=W/s):C<.01?(i=.707106781,s=.707106781,r=0):(r=Math.sqrt(C),i=R/r,s=W/r),this.set(i,s,r,t),this}let S=Math.sqrt((m-g)*(m-g)+(u-y)*(u-y)+(d-h)*(d-h));return Math.abs(S)<.001&&(S=1),this.x=(m-g)/S,this.y=(u-y)/S,this.z=(d-h)/S,this.w=Math.acos((l+f+p-1)/2),this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this.w=Math.max(e.w,Math.min(t.w,this.w)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this.w=Math.max(e,Math.min(t,this.w)),this}clampLength(e,t){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}},qo=class extends ei{constructor(e=1,t=1,i={}){super(),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=1,this.scissor=new Qe(0,0,e,t),this.scissorTest=!1,this.viewport=new Qe(0,0,e,t);let s={width:e,height:t,depth:1};i.encoding!==void 0&&(ls("THREE.WebGLRenderTarget: option.encoding has been replaced by option.colorSpace."),i.colorSpace=i.encoding===nn?st:Gt),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Lt,depthBuffer:!0,stencilBuffer:!1,depthTexture:null,samples:0},i),this.texture=new Rt(s,i.mapping,i.wrapS,i.wrapT,i.magFilter,i.minFilter,i.format,i.type,i.anisotropy,i.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.flipY=!1,this.texture.generateMipmaps=i.generateMipmaps,this.texture.internalFormat=i.internalFormat,this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.depthTexture=i.depthTexture,this.samples=i.samples}setSize(e,t,i=1){(this.width!==e||this.height!==t||this.depth!==i)&&(this.width=e,this.height=t,this.depth=i,this.texture.image.width=e,this.texture.image.height=t,this.texture.image.depth=i,this.dispose()),this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.texture=e.texture.clone(),this.texture.isRenderTargetTexture=!0;let t=Object.assign({},e.texture.image);return this.texture.source=new mr(t),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}},xi=class extends qo{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}},gr=class extends Rt{constructor(e=null,t=1,i=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:s},this.magFilter=pt,this.minFilter=pt,this.wrapR=Ut,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var $o=class extends Rt{constructor(e=null,t=1,i=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:s},this.magFilter=pt,this.minFilter=pt,this.wrapR=Ut,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var wt=class{constructor(e=0,t=0,i=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=s}static slerpFlat(e,t,i,s,r,o,a){let c=i[s+0],l=i[s+1],h=i[s+2],u=i[s+3],d=r[o+0],f=r[o+1],g=r[o+2],y=r[o+3];if(a===0){e[t+0]=c,e[t+1]=l,e[t+2]=h,e[t+3]=u;return}if(a===1){e[t+0]=d,e[t+1]=f,e[t+2]=g,e[t+3]=y;return}if(u!==y||c!==d||l!==f||h!==g){let m=1-a,p=c*d+l*f+h*g+u*y,S=p>=0?1:-1,v=1-p*p;if(v>Number.EPSILON){let C=Math.sqrt(v),T=Math.atan2(C,p*S);m=Math.sin(m*T)/C,a=Math.sin(a*T)/C}let w=a*S;if(c=c*m+d*w,l=l*m+f*w,h=h*m+g*w,u=u*m+y*w,m===1-a){let C=1/Math.sqrt(c*c+l*l+h*h+u*u);c*=C,l*=C,h*=C,u*=C}}e[t]=c,e[t+1]=l,e[t+2]=h,e[t+3]=u}static multiplyQuaternionsFlat(e,t,i,s,r,o){let a=i[s],c=i[s+1],l=i[s+2],h=i[s+3],u=r[o],d=r[o+1],f=r[o+2],g=r[o+3];return e[t]=a*g+h*u+c*f-l*d,e[t+1]=c*g+h*d+l*u-a*f,e[t+2]=l*g+h*f+a*d-c*u,e[t+3]=h*g-a*u-c*d-l*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,s){return this._x=e,this._y=t,this._z=i,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let i=e._x,s=e._y,r=e._z,o=e._order,a=Math.cos,c=Math.sin,l=a(i/2),h=a(s/2),u=a(r/2),d=c(i/2),f=c(s/2),g=c(r/2);switch(o){case"XYZ":this._x=d*h*u+l*f*g,this._y=l*f*u-d*h*g,this._z=l*h*g+d*f*u,this._w=l*h*u-d*f*g;break;case"YXZ":this._x=d*h*u+l*f*g,this._y=l*f*u-d*h*g,this._z=l*h*g-d*f*u,this._w=l*h*u+d*f*g;break;case"ZXY":this._x=d*h*u-l*f*g,this._y=l*f*u+d*h*g,this._z=l*h*g+d*f*u,this._w=l*h*u-d*f*g;break;case"ZYX":this._x=d*h*u-l*f*g,this._y=l*f*u+d*h*g,this._z=l*h*g-d*f*u,this._w=l*h*u+d*f*g;break;case"YZX":this._x=d*h*u+l*f*g,this._y=l*f*u+d*h*g,this._z=l*h*g-d*f*u,this._w=l*h*u-d*f*g;break;case"XZY":this._x=d*h*u-l*f*g,this._y=l*f*u-d*h*g,this._z=l*h*g+d*f*u,this._w=l*h*u+d*f*g;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let i=t/2,s=Math.sin(i);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,i=t[0],s=t[4],r=t[8],o=t[1],a=t[5],c=t[9],l=t[2],h=t[6],u=t[10],d=i+a+u;if(d>0){let f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(h-c)*f,this._y=(r-l)*f,this._z=(o-s)*f}else if(i>a&&i>u){let f=2*Math.sqrt(1+i-a-u);this._w=(h-c)/f,this._x=.25*f,this._y=(s+o)/f,this._z=(r+l)/f}else if(a>u){let f=2*Math.sqrt(1+a-i-u);this._w=(r-l)/f,this._x=(s+o)/f,this._y=.25*f,this._z=(c+h)/f}else{let f=2*Math.sqrt(1+u-i-a);this._w=(o-s)/f,this._x=(r+l)/f,this._y=(c+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<Number.EPSILON?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(St(this.dot(e),-1,1)))}rotateTowards(e,t){let i=this.angleTo(e);if(i===0)return this;let s=Math.min(1,t/i);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let i=e._x,s=e._y,r=e._z,o=e._w,a=t._x,c=t._y,l=t._z,h=t._w;return this._x=i*h+o*a+s*l-r*c,this._y=s*h+o*c+r*a-i*l,this._z=r*h+o*l+i*c-s*a,this._w=o*h-i*a-s*c-r*l,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);let i=this._x,s=this._y,r=this._z,o=this._w,a=o*e._w+i*e._x+s*e._y+r*e._z;if(a<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,a=-a):this.copy(e),a>=1)return this._w=o,this._x=i,this._y=s,this._z=r,this;let c=1-a*a;if(c<=Number.EPSILON){let f=1-t;return this._w=f*o+t*this._w,this._x=f*i+t*this._x,this._y=f*s+t*this._y,this._z=f*r+t*this._z,this.normalize(),this}let l=Math.sqrt(c),h=Math.atan2(l,a),u=Math.sin((1-t)*h)/l,d=Math.sin(t*h)/l;return this._w=o*u+this._w*d,this._x=i*u+this._x*d,this._y=s*u+this._y*d,this._z=r*u+this._z*d,this._onChangeCallback(),this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){let e=Math.random(),t=Math.sqrt(1-e),i=Math.sqrt(e),s=2*Math.PI*Math.random(),r=2*Math.PI*Math.random();return this.set(t*Math.cos(s),i*Math.sin(r),i*Math.cos(r),t*Math.sin(s))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},L=class n{constructor(e=0,t=0,i=0){n.prototype.isVector3=!0,this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Qc.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Qc.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,i=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*i+r[6]*s,this.y=r[1]*t+r[4]*i+r[7]*s,this.z=r[2]*t+r[5]*i+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,i=this.y,s=this.z,r=e.elements,o=1/(r[3]*t+r[7]*i+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*i+r[8]*s+r[12])*o,this.y=(r[1]*t+r[5]*i+r[9]*s+r[13])*o,this.z=(r[2]*t+r[6]*i+r[10]*s+r[14])*o,this}applyQuaternion(e){let t=this.x,i=this.y,s=this.z,r=e.x,o=e.y,a=e.z,c=e.w,l=2*(o*s-a*i),h=2*(a*t-r*s),u=2*(r*i-o*t);return this.x=t+c*l+o*u-a*h,this.y=i+c*h+a*l-r*u,this.z=s+c*u+r*h-o*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,i=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*i+r[8]*s,this.y=r[1]*t+r[5]*i+r[9]*s,this.z=r[2]*t+r[6]*i+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this}clampLength(e,t){let i=this.length();return this.divideScalar(i||1).multiplyScalar(Math.max(e,Math.min(t,i)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let i=e.x,s=e.y,r=e.z,o=t.x,a=t.y,c=t.z;return this.x=s*c-r*a,this.y=r*o-i*c,this.z=i*a-s*o,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return mo.copy(this).projectOnVector(e),this.sub(mo)}reflect(e){return this.sub(mo.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let i=this.dot(e)/t;return Math.acos(St(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,i=this.y-e.y,s=this.z-e.z;return t*t+i*i+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){let s=Math.sin(t)*e;return this.x=s*Math.sin(i),this.y=Math.cos(t)*e,this.z=s*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=(Math.random()-.5)*2,t=Math.random()*Math.PI*2,i=Math.sqrt(1-e**2);return this.x=i*Math.cos(t),this.y=i*Math.sin(t),this.z=e,this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}},mo=new L,Qc=new wt,Wt=class{constructor(e=new L(1/0,1/0,1/0),t=new L(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(Yt.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(Yt.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let i=Yt.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let i=e.geometry;if(i!==void 0){let r=i.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,Yt):Yt.fromBufferAttribute(r,o),Yt.applyMatrix4(e.matrixWorld),this.expandByPoint(Yt);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),ks.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),ks.copy(i.boundingBox)),ks.applyMatrix4(e.matrixWorld),this.union(ks)}let s=e.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return!(e.x<this.min.x||e.x>this.max.x||e.y<this.min.y||e.y>this.max.y||e.z<this.min.z||e.z>this.max.z)}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return!(e.max.x<this.min.x||e.min.x>this.max.x||e.max.y<this.min.y||e.min.y>this.max.y||e.max.z<this.min.z||e.min.z>this.max.z)}intersectsSphere(e){return this.clampPoint(e.center,Yt),Yt.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Qn),Ns.subVectors(this.max,Qn),fn.subVectors(e.a,Qn),mn.subVectors(e.b,Qn),gn.subVectors(e.c,Qn),Mi.subVectors(mn,fn),Ti.subVectors(gn,mn),$i.subVectors(fn,gn);let t=[0,-Mi.z,Mi.y,0,-Ti.z,Ti.y,0,-$i.z,$i.y,Mi.z,0,-Mi.x,Ti.z,0,-Ti.x,$i.z,0,-$i.x,-Mi.y,Mi.x,0,-Ti.y,Ti.x,0,-$i.y,$i.x,0];return!go(t,fn,mn,gn,Ns)||(t=[1,0,0,0,1,0,0,0,1],!go(t,fn,mn,gn,Ns))?!1:(Ds.crossVectors(Mi,Ti),t=[Ds.x,Ds.y,Ds.z],go(t,fn,mn,gn,Ns))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Yt).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Yt).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(li[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),li[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),li[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),li[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),li[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),li[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),li[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),li[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(li),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}},li=[new L,new L,new L,new L,new L,new L,new L,new L],Yt=new L,ks=new Wt,fn=new L,mn=new L,gn=new L,Mi=new L,Ti=new L,$i=new L,Qn=new L,Ns=new L,Ds=new L,Yi=new L;function go(n,e,t,i,s){for(let r=0,o=n.length-3;r<=o;r+=3){Yi.fromArray(n,r);let a=s.x*Math.abs(Yi.x)+s.y*Math.abs(Yi.y)+s.z*Math.abs(Yi.z),c=e.dot(Yi),l=t.dot(Yi),h=i.dot(Yi);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>a)return!1}return!0}var xd=new Wt,es=new L,yo=new L,Ft=class{constructor(e=new L,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let i=this.center;t!==void 0?i.copy(t):xd.setFromPoints(e).getCenter(i);let s=0;for(let r=0,o=e.length;r<o;r++)s=Math.max(s,i.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;es.subVectors(e,this.center);let t=es.lengthSq();if(t>this.radius*this.radius){let i=Math.sqrt(t),s=(i-this.radius)*.5;this.center.addScaledVector(es,s/i),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(yo.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(es.copy(e.center).add(yo)),this.expandByPoint(es.copy(e.center).sub(yo))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}},hi=new L,xo=new L,Os=new L,Ei=new L,vo=new L,Us=new L,_o=new L,Di=class{constructor(e=new L,t=new L(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,hi)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=hi.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(hi.copy(this.origin).addScaledVector(this.direction,t),hi.distanceToSquared(e))}distanceSqToSegment(e,t,i,s){xo.copy(e).add(t).multiplyScalar(.5),Os.copy(t).sub(e).normalize(),Ei.copy(this.origin).sub(xo);let r=e.distanceTo(t)*.5,o=-this.direction.dot(Os),a=Ei.dot(this.direction),c=-Ei.dot(Os),l=Ei.lengthSq(),h=Math.abs(1-o*o),u,d,f,g;if(h>0)if(u=o*c-a,d=o*a-c,g=r*h,u>=0)if(d>=-g)if(d<=g){let y=1/h;u*=y,d*=y,f=u*(u+o*d+2*a)+d*(o*u+d+2*c)+l}else d=r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*c)+l;else d=-r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*c)+l;else d<=-g?(u=Math.max(0,-(-o*r+a)),d=u>0?-r:Math.min(Math.max(-r,-c),r),f=-u*u+d*(d+2*c)+l):d<=g?(u=0,d=Math.min(Math.max(-r,-c),r),f=d*(d+2*c)+l):(u=Math.max(0,-(o*r+a)),d=u>0?r:Math.min(Math.max(-r,-c),r),f=-u*u+d*(d+2*c)+l);else d=o>0?-r:r,u=Math.max(0,-(o*d+a)),f=-u*u+d*(d+2*c)+l;return i&&i.copy(this.origin).addScaledVector(this.direction,u),s&&s.copy(xo).addScaledVector(Os,d),f}intersectSphere(e,t){hi.subVectors(e.center,this.origin);let i=hi.dot(this.direction),s=hi.dot(hi)-i*i,r=e.radius*e.radius;if(s>r)return null;let o=Math.sqrt(r-s),a=i-o,c=i+o;return c<0?null:a<0?this.at(c,t):this.at(a,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){let i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,s,r,o,a,c,l=1/this.direction.x,h=1/this.direction.y,u=1/this.direction.z,d=this.origin;return l>=0?(i=(e.min.x-d.x)*l,s=(e.max.x-d.x)*l):(i=(e.max.x-d.x)*l,s=(e.min.x-d.x)*l),h>=0?(r=(e.min.y-d.y)*h,o=(e.max.y-d.y)*h):(r=(e.max.y-d.y)*h,o=(e.min.y-d.y)*h),i>o||r>s||((r>i||isNaN(i))&&(i=r),(o<s||isNaN(s))&&(s=o),u>=0?(a=(e.min.z-d.z)*u,c=(e.max.z-d.z)*u):(a=(e.max.z-d.z)*u,c=(e.min.z-d.z)*u),i>c||a>s)||((a>i||i!==i)&&(i=a),(c<s||s!==s)&&(s=c),s<0)?null:this.at(i>=0?i:s,t)}intersectsBox(e){return this.intersectBox(e,hi)!==null}intersectTriangle(e,t,i,s,r){vo.subVectors(t,e),Us.subVectors(i,e),_o.crossVectors(vo,Us);let o=this.direction.dot(_o),a;if(o>0){if(s)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Ei.subVectors(this.origin,e);let c=a*this.direction.dot(Us.crossVectors(Ei,Us));if(c<0)return null;let l=a*this.direction.dot(vo.cross(Ei));if(l<0||c+l>o)return null;let h=-a*Ei.dot(_o);return h<0?null:this.at(h/o,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Ge=class n{constructor(e,t,i,s,r,o,a,c,l,h,u,d,f,g,y,m){n.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,s,r,o,a,c,l,h,u,d,f,g,y,m)}set(e,t,i,s,r,o,a,c,l,h,u,d,f,g,y,m){let p=this.elements;return p[0]=e,p[4]=t,p[8]=i,p[12]=s,p[1]=r,p[5]=o,p[9]=a,p[13]=c,p[2]=l,p[6]=h,p[10]=u,p[14]=d,p[3]=f,p[7]=g,p[11]=y,p[15]=m,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new n().fromArray(this.elements)}copy(e){let t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){let t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){let t=this.elements,i=e.elements,s=1/yn.setFromMatrixColumn(e,0).length(),r=1/yn.setFromMatrixColumn(e,1).length(),o=1/yn.setFromMatrixColumn(e,2).length();return t[0]=i[0]*s,t[1]=i[1]*s,t[2]=i[2]*s,t[3]=0,t[4]=i[4]*r,t[5]=i[5]*r,t[6]=i[6]*r,t[7]=0,t[8]=i[8]*o,t[9]=i[9]*o,t[10]=i[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,i=e.x,s=e.y,r=e.z,o=Math.cos(i),a=Math.sin(i),c=Math.cos(s),l=Math.sin(s),h=Math.cos(r),u=Math.sin(r);if(e.order==="XYZ"){let d=o*h,f=o*u,g=a*h,y=a*u;t[0]=c*h,t[4]=-c*u,t[8]=l,t[1]=f+g*l,t[5]=d-y*l,t[9]=-a*c,t[2]=y-d*l,t[6]=g+f*l,t[10]=o*c}else if(e.order==="YXZ"){let d=c*h,f=c*u,g=l*h,y=l*u;t[0]=d+y*a,t[4]=g*a-f,t[8]=o*l,t[1]=o*u,t[5]=o*h,t[9]=-a,t[2]=f*a-g,t[6]=y+d*a,t[10]=o*c}else if(e.order==="ZXY"){let d=c*h,f=c*u,g=l*h,y=l*u;t[0]=d-y*a,t[4]=-o*u,t[8]=g+f*a,t[1]=f+g*a,t[5]=o*h,t[9]=y-d*a,t[2]=-o*l,t[6]=a,t[10]=o*c}else if(e.order==="ZYX"){let d=o*h,f=o*u,g=a*h,y=a*u;t[0]=c*h,t[4]=g*l-f,t[8]=d*l+y,t[1]=c*u,t[5]=y*l+d,t[9]=f*l-g,t[2]=-l,t[6]=a*c,t[10]=o*c}else if(e.order==="YZX"){let d=o*c,f=o*l,g=a*c,y=a*l;t[0]=c*h,t[4]=y-d*u,t[8]=g*u+f,t[1]=u,t[5]=o*h,t[9]=-a*h,t[2]=-l*h,t[6]=f*u+g,t[10]=d-y*u}else if(e.order==="XZY"){let d=o*c,f=o*l,g=a*c,y=a*l;t[0]=c*h,t[4]=-u,t[8]=l*h,t[1]=d*u+y,t[5]=o*h,t[9]=f*u-g,t[2]=g*u-f,t[6]=a*h,t[10]=y*u+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(vd,e,_d)}lookAt(e,t,i){let s=this.elements;return Dt.subVectors(e,t),Dt.lengthSq()===0&&(Dt.z=1),Dt.normalize(),Ai.crossVectors(i,Dt),Ai.lengthSq()===0&&(Math.abs(i.z)===1?Dt.x+=1e-4:Dt.z+=1e-4,Dt.normalize(),Ai.crossVectors(i,Dt)),Ai.normalize(),Fs.crossVectors(Dt,Ai),s[0]=Ai.x,s[4]=Fs.x,s[8]=Dt.x,s[1]=Ai.y,s[5]=Fs.y,s[9]=Dt.y,s[2]=Ai.z,s[6]=Fs.z,s[10]=Dt.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let i=e.elements,s=t.elements,r=this.elements,o=i[0],a=i[4],c=i[8],l=i[12],h=i[1],u=i[5],d=i[9],f=i[13],g=i[2],y=i[6],m=i[10],p=i[14],S=i[3],v=i[7],w=i[11],C=i[15],T=s[0],R=s[4],W=s[8],_=s[12],E=s[1],H=s[5],V=s[9],Q=s[13],I=s[2],O=s[6],z=s[10],$=s[14],X=s[3],q=s[7],Y=s[11],se=s[15];return r[0]=o*T+a*E+c*I+l*X,r[4]=o*R+a*H+c*O+l*q,r[8]=o*W+a*V+c*z+l*Y,r[12]=o*_+a*Q+c*$+l*se,r[1]=h*T+u*E+d*I+f*X,r[5]=h*R+u*H+d*O+f*q,r[9]=h*W+u*V+d*z+f*Y,r[13]=h*_+u*Q+d*$+f*se,r[2]=g*T+y*E+m*I+p*X,r[6]=g*R+y*H+m*O+p*q,r[10]=g*W+y*V+m*z+p*Y,r[14]=g*_+y*Q+m*$+p*se,r[3]=S*T+v*E+w*I+C*X,r[7]=S*R+v*H+w*O+C*q,r[11]=S*W+v*V+w*z+C*Y,r[15]=S*_+v*Q+w*$+C*se,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],i=e[4],s=e[8],r=e[12],o=e[1],a=e[5],c=e[9],l=e[13],h=e[2],u=e[6],d=e[10],f=e[14],g=e[3],y=e[7],m=e[11],p=e[15];return g*(+r*c*u-s*l*u-r*a*d+i*l*d+s*a*f-i*c*f)+y*(+t*c*f-t*l*d+r*o*d-s*o*f+s*l*h-r*c*h)+m*(+t*l*u-t*a*f-r*o*u+i*o*f+r*a*h-i*l*h)+p*(-s*a*h-t*c*u+t*a*d+s*o*u-i*o*d+i*c*h)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){let s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=i),this}invert(){let e=this.elements,t=e[0],i=e[1],s=e[2],r=e[3],o=e[4],a=e[5],c=e[6],l=e[7],h=e[8],u=e[9],d=e[10],f=e[11],g=e[12],y=e[13],m=e[14],p=e[15],S=u*m*l-y*d*l+y*c*f-a*m*f-u*c*p+a*d*p,v=g*d*l-h*m*l-g*c*f+o*m*f+h*c*p-o*d*p,w=h*y*l-g*u*l+g*a*f-o*y*f-h*a*p+o*u*p,C=g*u*c-h*y*c-g*a*d+o*y*d+h*a*m-o*u*m,T=t*S+i*v+s*w+r*C;if(T===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let R=1/T;return e[0]=S*R,e[1]=(y*d*r-u*m*r-y*s*f+i*m*f+u*s*p-i*d*p)*R,e[2]=(a*m*r-y*c*r+y*s*l-i*m*l-a*s*p+i*c*p)*R,e[3]=(u*c*r-a*d*r-u*s*l+i*d*l+a*s*f-i*c*f)*R,e[4]=v*R,e[5]=(h*m*r-g*d*r+g*s*f-t*m*f-h*s*p+t*d*p)*R,e[6]=(g*c*r-o*m*r-g*s*l+t*m*l+o*s*p-t*c*p)*R,e[7]=(o*d*r-h*c*r+h*s*l-t*d*l-o*s*f+t*c*f)*R,e[8]=w*R,e[9]=(g*u*r-h*y*r-g*i*f+t*y*f+h*i*p-t*u*p)*R,e[10]=(o*y*r-g*a*r+g*i*l-t*y*l-o*i*p+t*a*p)*R,e[11]=(h*a*r-o*u*r-h*i*l+t*u*l+o*i*f-t*a*f)*R,e[12]=C*R,e[13]=(h*y*s-g*u*s+g*i*d-t*y*d-h*i*m+t*u*m)*R,e[14]=(g*a*s-o*y*s-g*i*c+t*y*c+o*i*m-t*a*m)*R,e[15]=(o*u*s-h*a*s+h*i*c-t*u*c-o*i*d+t*a*d)*R,this}scale(e){let t=this.elements,i=e.x,s=e.y,r=e.z;return t[0]*=i,t[4]*=s,t[8]*=r,t[1]*=i,t[5]*=s,t[9]*=r,t[2]*=i,t[6]*=s,t[10]*=r,t[3]*=i,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,s))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let i=Math.cos(t),s=Math.sin(t),r=1-i,o=e.x,a=e.y,c=e.z,l=r*o,h=r*a;return this.set(l*o+i,l*a-s*c,l*c+s*a,0,l*a+s*c,h*a+i,h*c-s*o,0,l*c-s*a,h*c+s*o,r*c*c+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,s,r,o){return this.set(1,i,r,0,e,1,o,0,t,s,1,0,0,0,0,1),this}compose(e,t,i){let s=this.elements,r=t._x,o=t._y,a=t._z,c=t._w,l=r+r,h=o+o,u=a+a,d=r*l,f=r*h,g=r*u,y=o*h,m=o*u,p=a*u,S=c*l,v=c*h,w=c*u,C=i.x,T=i.y,R=i.z;return s[0]=(1-(y+p))*C,s[1]=(f+w)*C,s[2]=(g-v)*C,s[3]=0,s[4]=(f-w)*T,s[5]=(1-(d+p))*T,s[6]=(m+S)*T,s[7]=0,s[8]=(g+v)*R,s[9]=(m-S)*R,s[10]=(1-(d+y))*R,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,i){let s=this.elements,r=yn.set(s[0],s[1],s[2]).length(),o=yn.set(s[4],s[5],s[6]).length(),a=yn.set(s[8],s[9],s[10]).length();this.determinant()<0&&(r=-r),e.x=s[12],e.y=s[13],e.z=s[14],Kt.copy(this);let l=1/r,h=1/o,u=1/a;return Kt.elements[0]*=l,Kt.elements[1]*=l,Kt.elements[2]*=l,Kt.elements[4]*=h,Kt.elements[5]*=h,Kt.elements[6]*=h,Kt.elements[8]*=u,Kt.elements[9]*=u,Kt.elements[10]*=u,t.setFromRotationMatrix(Kt),i.x=r,i.y=o,i.z=a,this}makePerspective(e,t,i,s,r,o,a=yi){let c=this.elements,l=2*r/(t-e),h=2*r/(i-s),u=(t+e)/(t-e),d=(i+s)/(i-s),f,g;if(a===yi)f=-(o+r)/(o-r),g=-2*o*r/(o-r);else if(a===dr)f=-o/(o-r),g=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=l,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=h,c[9]=d,c[13]=0,c[2]=0,c[6]=0,c[10]=f,c[14]=g,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,i,s,r,o,a=yi){let c=this.elements,l=1/(t-e),h=1/(i-s),u=1/(o-r),d=(t+e)*l,f=(i+s)*h,g,y;if(a===yi)g=(o+r)*u,y=-2*u;else if(a===dr)g=r*u,y=-1*u;else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=2*l,c[4]=0,c[8]=0,c[12]=-d,c[1]=0,c[5]=2*h,c[9]=0,c[13]=-f,c[2]=0,c[6]=0,c[10]=y,c[14]=-g,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,i=e.elements;for(let s=0;s<16;s++)if(t[s]!==i[s])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){let i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}},yn=new L,Kt=new Ge,vd=new L(0,0,0),_d=new L(1,1,1),Ai=new L,Fs=new L,Dt=new L,el=new Ge,tl=new wt,yr=class n{constructor(e=0,t=0,i=0,s=n.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,s=this._order){return this._x=e,this._y=t,this._z=i,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){let s=e.elements,r=s[0],o=s[4],a=s[8],c=s[1],l=s[5],h=s[9],u=s[2],d=s[6],f=s[10];switch(t){case"XYZ":this._y=Math.asin(St(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(d,l),this._z=0);break;case"YXZ":this._x=Math.asin(-St(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-u,r),this._z=0);break;case"ZXY":this._x=Math.asin(St(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-u,f),this._z=Math.atan2(-o,l)):(this._y=0,this._z=Math.atan2(c,r));break;case"ZYX":this._y=Math.asin(-St(u,-1,1)),Math.abs(u)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(c,r)):(this._x=0,this._z=Math.atan2(-o,l));break;case"YZX":this._z=Math.asin(St(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-u,r)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-St(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,l),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return el.makeRotationFromQuaternion(e),this.setFromRotationMatrix(el,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return tl.setFromEuler(this),this.setFromQuaternion(tl,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};yr.DEFAULT_ORDER="XYZ";var xr=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},bd=0,il=new L,xn=new wt,ui=new Ge,Bs=new L,ts=new L,Sd=new L,wd=new wt,nl=new L(1,0,0),sl=new L(0,1,0),rl=new L(0,0,1),Md={type:"added"},Td={type:"removed"},at=class n extends ei{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:bd++}),this.uuid=Qt(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=n.DEFAULT_UP.clone();let e=new L,t=new yr,i=new wt,s=new L(1,1,1);function r(){i.setFromEuler(t,!1)}function o(){t.setFromQuaternion(i,void 0,!1)}t._onChange(r),i._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new Ge},normalMatrix:{value:new Ve}}),this.matrix=new Ge,this.matrixWorld=new Ge,this.matrixAutoUpdate=n.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=n.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new xr,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return xn.setFromAxisAngle(e,t),this.quaternion.multiply(xn),this}rotateOnWorldAxis(e,t){return xn.setFromAxisAngle(e,t),this.quaternion.premultiply(xn),this}rotateX(e){return this.rotateOnAxis(nl,e)}rotateY(e){return this.rotateOnAxis(sl,e)}rotateZ(e){return this.rotateOnAxis(rl,e)}translateOnAxis(e,t){return il.copy(e).applyQuaternion(this.quaternion),this.position.add(il.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(nl,e)}translateY(e){return this.translateOnAxis(sl,e)}translateZ(e){return this.translateOnAxis(rl,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(ui.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?Bs.copy(e):Bs.set(e,t,i);let s=this.parent;this.updateWorldMatrix(!0,!1),ts.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?ui.lookAt(ts,Bs,this.up):ui.lookAt(Bs,ts,this.up),this.quaternion.setFromRotationMatrix(ui),s&&(ui.extractRotation(s.matrixWorld),xn.setFromRotationMatrix(ui),this.quaternion.premultiply(xn.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.parent!==null&&e.parent.remove(e),e.parent=this,this.children.push(e),e.dispatchEvent(Md)):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Td)),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),ui.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),ui.multiply(e.parent.matrixWorld)),e.applyMatrix4(ui),this.add(e),e.updateWorldMatrix(!1,!0),this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,s=this.children.length;i<s;i++){let o=this.children[i].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);let s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ts,e,Sd),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ts,wd,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let i=0,s=t.length;i<s;i++){let r=t[i];(r.matrixWorldAutoUpdate===!0||e===!0)&&r.updateMatrixWorld(e)}}updateWorldMatrix(e,t){let i=this.parent;if(e===!0&&i!==null&&i.matrixWorldAutoUpdate===!0&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),t===!0){let s=this.children;for(let r=0,o=s.length;r<o;r++){let a=s[r];a.matrixWorldAutoUpdate===!0&&a.updateWorldMatrix(!1,!0)}}}toJSON(e){let t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.6,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.visibility=this._visibility,s.active=this._active,s.bounds=this._bounds.map(a=>({boxInitialized:a.boxInitialized,boxMin:a.box.min.toArray(),boxMax:a.box.max.toArray(),sphereInitialized:a.sphereInitialized,sphereRadius:a.sphere.radius,sphereCenter:a.sphere.center.toArray()})),s.maxGeometryCount=this._maxGeometryCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.geometryCount=this._geometryCount,s.matricesTexture=this._matricesTexture.toJSON(e),this.boundingSphere!==null&&(s.boundingSphere={center:s.boundingSphere.center.toArray(),radius:s.boundingSphere.radius}),this.boundingBox!==null&&(s.boundingBox={min:s.boundingBox.min.toArray(),max:s.boundingBox.max.toArray()}));function r(a,c){return a[c.uuid]===void 0&&(a[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let c=a.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){let u=c[l];r(e.shapes,u)}else r(e.shapes,c)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let c=0,l=this.material.length;c<l;c++)a.push(r(e.materials,this.material[c]));s.material=a}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){let c=this.animations[a];s.animations.push(r(e.animations,c))}}if(t){let a=o(e.geometries),c=o(e.materials),l=o(e.textures),h=o(e.images),u=o(e.shapes),d=o(e.skeletons),f=o(e.animations),g=o(e.nodes);a.length>0&&(i.geometries=a),c.length>0&&(i.materials=c),l.length>0&&(i.textures=l),h.length>0&&(i.images=h),u.length>0&&(i.shapes=u),d.length>0&&(i.skeletons=d),f.length>0&&(i.animations=f),g.length>0&&(i.nodes=g)}return i.object=s,i;function o(a){let c=[];for(let l in a){let h=a[l];delete h.metadata,c.push(h)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){let s=e.children[i];this.add(s.clone())}return this}};at.DEFAULT_UP=new L(0,1,0);at.DEFAULT_MATRIX_AUTO_UPDATE=!0;at.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var jt=new L,di=new L,bo=new L,pi=new L,vn=new L,_n=new L,ol=new L,So=new L,wo=new L,Mo=new L,zs=!1,Ln=class n{constructor(e=new L,t=new L,i=new L){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,s){s.subVectors(i,t),jt.subVectors(e,t),s.cross(jt);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,i,s,r){jt.subVectors(s,t),di.subVectors(i,t),bo.subVectors(e,t);let o=jt.dot(jt),a=jt.dot(di),c=jt.dot(bo),l=di.dot(di),h=di.dot(bo),u=o*l-a*a;if(u===0)return r.set(0,0,0),null;let d=1/u,f=(l*c-a*h)*d,g=(o*h-a*c)*d;return r.set(1-f-g,g,f)}static containsPoint(e,t,i,s){return this.getBarycoord(e,t,i,s,pi)===null?!1:pi.x>=0&&pi.y>=0&&pi.x+pi.y<=1}static getUV(e,t,i,s,r,o,a,c){return zs===!1&&(console.warn("THREE.Triangle.getUV() has been renamed to THREE.Triangle.getInterpolation()."),zs=!0),this.getInterpolation(e,t,i,s,r,o,a,c)}static getInterpolation(e,t,i,s,r,o,a,c){return this.getBarycoord(e,t,i,s,pi)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(r,pi.x),c.addScaledVector(o,pi.y),c.addScaledVector(a,pi.z),c)}static isFrontFacing(e,t,i,s){return jt.subVectors(i,t),di.subVectors(e,t),jt.cross(di).dot(s)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,s){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,i,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return jt.subVectors(this.c,this.b),di.subVectors(this.a,this.b),jt.cross(di).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return n.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return n.getBarycoord(e,this.a,this.b,this.c,t)}getUV(e,t,i,s,r){return zs===!1&&(console.warn("THREE.Triangle.getUV() has been renamed to THREE.Triangle.getInterpolation()."),zs=!0),n.getInterpolation(e,this.a,this.b,this.c,t,i,s,r)}getInterpolation(e,t,i,s,r){return n.getInterpolation(e,this.a,this.b,this.c,t,i,s,r)}containsPoint(e){return n.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return n.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let i=this.a,s=this.b,r=this.c,o,a;vn.subVectors(s,i),_n.subVectors(r,i),So.subVectors(e,i);let c=vn.dot(So),l=_n.dot(So);if(c<=0&&l<=0)return t.copy(i);wo.subVectors(e,s);let h=vn.dot(wo),u=_n.dot(wo);if(h>=0&&u<=h)return t.copy(s);let d=c*u-h*l;if(d<=0&&c>=0&&h<=0)return o=c/(c-h),t.copy(i).addScaledVector(vn,o);Mo.subVectors(e,r);let f=vn.dot(Mo),g=_n.dot(Mo);if(g>=0&&f<=g)return t.copy(r);let y=f*l-c*g;if(y<=0&&l>=0&&g<=0)return a=l/(l-g),t.copy(i).addScaledVector(_n,a);let m=h*g-f*u;if(m<=0&&u-h>=0&&f-g>=0)return ol.subVectors(r,s),a=(u-h)/(u-h+(f-g)),t.copy(s).addScaledVector(ol,a);let p=1/(m+y+d);return o=y*p,a=d*p,t.copy(i).addScaledVector(vn,o).addScaledVector(_n,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},fh={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Ri={h:0,s:0,l:0},Hs={h:0,s:0,l:0};function To(n,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?n+(e-n)*6*t:t<1/2?e:t<2/3?n+(e-n)*6*(2/3-t):n}var me=class{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){let s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=st){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,je.toWorkingColorSpace(this,t),this}setRGB(e,t,i,s=je.workingColorSpace){return this.r=e,this.g=t,this.b=i,je.toWorkingColorSpace(this,s),this}setHSL(e,t,i,s=je.workingColorSpace){if(e=Ea(e,1),t=St(t,0,1),i=St(i,0,1),t===0)this.r=this.g=this.b=i;else{let r=i<=.5?i*(1+t):i+t-i*t,o=2*i-r;this.r=To(o,r,e+1/3),this.g=To(o,r,e),this.b=To(o,r,e-1/3)}return je.toWorkingColorSpace(this,s),this}setStyle(e,t=st){function i(r){r!==void 0&&parseFloat(r)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r,o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:console.warn("THREE.Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){let r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(r,16),t);console.warn("THREE.Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=st){let i=fh[e.toLowerCase()];return i!==void 0?this.setHex(i,t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Dn(e.r),this.g=Dn(e.g),this.b=Dn(e.b),this}copyLinearToSRGB(e){return this.r=po(e.r),this.g=po(e.g),this.b=po(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=st){return je.fromWorkingColorSpace(At.copy(this),e),Math.round(St(At.r*255,0,255))*65536+Math.round(St(At.g*255,0,255))*256+Math.round(St(At.b*255,0,255))}getHexString(e=st){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=je.workingColorSpace){je.fromWorkingColorSpace(At.copy(this),t);let i=At.r,s=At.g,r=At.b,o=Math.max(i,s,r),a=Math.min(i,s,r),c,l,h=(a+o)/2;if(a===o)c=0,l=0;else{let u=o-a;switch(l=h<=.5?u/(o+a):u/(2-o-a),o){case i:c=(s-r)/u+(s<r?6:0);break;case s:c=(r-i)/u+2;break;case r:c=(i-s)/u+4;break}c/=6}return e.h=c,e.s=l,e.l=h,e}getRGB(e,t=je.workingColorSpace){return je.fromWorkingColorSpace(At.copy(this),t),e.r=At.r,e.g=At.g,e.b=At.b,e}getStyle(e=st){je.fromWorkingColorSpace(At.copy(this),e);let t=At.r,i=At.g,s=At.b;return e!==st?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(s*255)})`}offsetHSL(e,t,i){return this.getHSL(Ri),this.setHSL(Ri.h+e,Ri.s+t,Ri.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(Ri),e.getHSL(Hs);let i=cs(Ri.h,Hs.h,t),s=cs(Ri.s,Hs.s,t),r=cs(Ri.l,Hs.l,t);return this.setHSL(i,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,i=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*i+r[6]*s,this.g=r[1]*t+r[4]*i+r[7]*s,this.b=r[2]*t+r[5]*i+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},At=new me;me.NAMES=fh;var Ed=0,Bt=class extends ei{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Ed++}),this.uuid=Qt(),this.name="",this.type="Material",this.blending=Nn,this.side=ri,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Bo,this.blendDst=zo,this.blendEquation=Ji,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new me(0,0,0),this.blendAlpha=0,this.depthFunc=or,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=$c,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=dn,this.stencilZFail=dn,this.stencilZPass=dn,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBuild(){}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let i=e[t];if(i===void 0){console.warn(`THREE.Material: parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){console.warn(`THREE.Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(i):s&&s.isVector3&&i&&i.isVector3?s.copy(i):this[t]=i}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let i={metadata:{version:4.6,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==Nn&&(i.blending=this.blending),this.side!==ri&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==Bo&&(i.blendSrc=this.blendSrc),this.blendDst!==zo&&(i.blendDst=this.blendDst),this.blendEquation!==Ji&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==or&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==$c&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==dn&&(i.stencilFail=this.stencilFail),this.stencilZFail!==dn&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==dn&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function s(r){let o=[];for(let a in r){let c=r[a];delete c.metadata,o.push(c)}return o}if(t){let r=s(e.textures),o=s(e.images);r.length>0&&(i.textures=r),o.length>0&&(i.images=o)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,i=null;if(t!==null){let s=t.length;i=new Array(s);for(let r=0;r!==s;++r)i[r]=t[r].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}},oi=class extends Bt{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new me(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=eh,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}};var ut=new L,Vs=new Ee,ft=class{constructor(e,t,i=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=Go,this._updateRange={offset:0,count:-1},this.updateRanges=[],this.gpuType=gi,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}get updateRange(){return console.warn("THREE.BufferAttribute: updateRange() is deprecated and will be removed in r169. Use addUpdateRange() instead."),this._updateRange}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[i+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)Vs.fromBufferAttribute(this,t),Vs.applyMatrix3(e),this.setXY(t,Vs.x,Vs.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)ut.fromBufferAttribute(this,t),ut.applyMatrix3(e),this.setXYZ(t,ut.x,ut.y,ut.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)ut.fromBufferAttribute(this,t),ut.applyMatrix4(e),this.setXYZ(t,ut.x,ut.y,ut.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)ut.fromBufferAttribute(this,t),ut.applyNormalMatrix(e),this.setXYZ(t,ut.x,ut.y,ut.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)ut.fromBufferAttribute(this,t),ut.transformDirection(e),this.setXYZ(t,ut.x,ut.y,ut.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=ni(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=Ze(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=ni(t,this.array)),t}setX(e,t){return this.normalized&&(t=Ze(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=ni(t,this.array)),t}setY(e,t){return this.normalized&&(t=Ze(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=ni(t,this.array)),t}setZ(e,t){return this.normalized&&(t=Ze(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=ni(t,this.array)),t}setW(e,t){return this.normalized&&(t=Ze(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=Ze(t,this.array),i=Ze(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,s){return e*=this.itemSize,this.normalized&&(t=Ze(t,this.array),i=Ze(i,this.array),s=Ze(s,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=s,this}setXYZW(e,t,i,s,r){return e*=this.itemSize,this.normalized&&(t=Ze(t,this.array),i=Ze(i,this.array),s=Ze(s,this.array),r=Ze(r,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Go&&(e.usage=this.usage),e}};var vr=class extends ft{constructor(e,t,i){super(new Uint16Array(e),t,i)}};var _r=class extends ft{constructor(e,t,i){super(new Uint32Array(e),t,i)}};var it=class extends ft{constructor(e,t,i){super(new Float32Array(e),t,i)}};var Ad=0,Ht=new Ge,Eo=new at,bn=new L,Ot=new Wt,is=new Wt,vt=new L,Mt=class n extends ei{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Ad++}),this.uuid=Qt(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(ph(e)?_r:vr)(e,1):this.index=e,this}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let i=this.attributes.normal;if(i!==void 0){let r=new Ve().getNormalMatrix(e);i.applyNormalMatrix(r),i.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Ht.makeRotationFromQuaternion(e),this.applyMatrix4(Ht),this}rotateX(e){return Ht.makeRotationX(e),this.applyMatrix4(Ht),this}rotateY(e){return Ht.makeRotationY(e),this.applyMatrix4(Ht),this}rotateZ(e){return Ht.makeRotationZ(e),this.applyMatrix4(Ht),this}translate(e,t,i){return Ht.makeTranslation(e,t,i),this.applyMatrix4(Ht),this}scale(e,t,i){return Ht.makeScale(e,t,i),this.applyMatrix4(Ht),this}lookAt(e){return Eo.lookAt(e),Eo.updateMatrix(),this.applyMatrix4(Eo.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(bn).negate(),this.translate(bn.x,bn.y,bn.z),this}setFromPoints(e){let t=[];for(let i=0,s=e.length;i<s;i++){let r=e[i];t.push(r.x,r.y,r.z||0)}return this.setAttribute("position",new it(t,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Wt);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingBox.set(new L(-1/0,-1/0,-1/0),new L(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,s=t.length;i<s;i++){let r=t[i];Ot.setFromBufferAttribute(r),this.morphTargetsRelative?(vt.addVectors(this.boundingBox.min,Ot.min),this.boundingBox.expandByPoint(vt),vt.addVectors(this.boundingBox.max,Ot.max),this.boundingBox.expandByPoint(vt)):(this.boundingBox.expandByPoint(Ot.min),this.boundingBox.expandByPoint(Ot.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ft);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingSphere.set(new L,1/0);return}if(e){let i=this.boundingSphere.center;if(Ot.setFromBufferAttribute(e),t)for(let r=0,o=t.length;r<o;r++){let a=t[r];is.setFromBufferAttribute(a),this.morphTargetsRelative?(vt.addVectors(Ot.min,is.min),Ot.expandByPoint(vt),vt.addVectors(Ot.max,is.max),Ot.expandByPoint(vt)):(Ot.expandByPoint(is.min),Ot.expandByPoint(is.max))}Ot.getCenter(i);let s=0;for(let r=0,o=e.count;r<o;r++)vt.fromBufferAttribute(e,r),s=Math.max(s,i.distanceToSquared(vt));if(t)for(let r=0,o=t.length;r<o;r++){let a=t[r],c=this.morphTargetsRelative;for(let l=0,h=a.count;l<h;l++)vt.fromBufferAttribute(a,l),c&&(bn.fromBufferAttribute(e,l),vt.add(bn)),s=Math.max(s,i.distanceToSquared(vt))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let i=e.array,s=t.position.array,r=t.normal.array,o=t.uv.array,a=s.length/3;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new ft(new Float32Array(4*a),4));let c=this.getAttribute("tangent").array,l=[],h=[];for(let E=0;E<a;E++)l[E]=new L,h[E]=new L;let u=new L,d=new L,f=new L,g=new Ee,y=new Ee,m=new Ee,p=new L,S=new L;function v(E,H,V){u.fromArray(s,E*3),d.fromArray(s,H*3),f.fromArray(s,V*3),g.fromArray(o,E*2),y.fromArray(o,H*2),m.fromArray(o,V*2),d.sub(u),f.sub(u),y.sub(g),m.sub(g);let Q=1/(y.x*m.y-m.x*y.y);isFinite(Q)&&(p.copy(d).multiplyScalar(m.y).addScaledVector(f,-y.y).multiplyScalar(Q),S.copy(f).multiplyScalar(y.x).addScaledVector(d,-m.x).multiplyScalar(Q),l[E].add(p),l[H].add(p),l[V].add(p),h[E].add(S),h[H].add(S),h[V].add(S))}let w=this.groups;w.length===0&&(w=[{start:0,count:i.length}]);for(let E=0,H=w.length;E<H;++E){let V=w[E],Q=V.start,I=V.count;for(let O=Q,z=Q+I;O<z;O+=3)v(i[O+0],i[O+1],i[O+2])}let C=new L,T=new L,R=new L,W=new L;function _(E){R.fromArray(r,E*3),W.copy(R);let H=l[E];C.copy(H),C.sub(R.multiplyScalar(R.dot(H))).normalize(),T.crossVectors(W,H);let Q=T.dot(h[E])<0?-1:1;c[E*4]=C.x,c[E*4+1]=C.y,c[E*4+2]=C.z,c[E*4+3]=Q}for(let E=0,H=w.length;E<H;++E){let V=w[E],Q=V.start,I=V.count;for(let O=Q,z=Q+I;O<z;O+=3)_(i[O+0]),_(i[O+1]),_(i[O+2])}}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new ft(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let d=0,f=i.count;d<f;d++)i.setXYZ(d,0,0,0);let s=new L,r=new L,o=new L,a=new L,c=new L,l=new L,h=new L,u=new L;if(e)for(let d=0,f=e.count;d<f;d+=3){let g=e.getX(d+0),y=e.getX(d+1),m=e.getX(d+2);s.fromBufferAttribute(t,g),r.fromBufferAttribute(t,y),o.fromBufferAttribute(t,m),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),a.fromBufferAttribute(i,g),c.fromBufferAttribute(i,y),l.fromBufferAttribute(i,m),a.add(h),c.add(h),l.add(h),i.setXYZ(g,a.x,a.y,a.z),i.setXYZ(y,c.x,c.y,c.z),i.setXYZ(m,l.x,l.y,l.z)}else for(let d=0,f=t.count;d<f;d+=3)s.fromBufferAttribute(t,d+0),r.fromBufferAttribute(t,d+1),o.fromBufferAttribute(t,d+2),h.subVectors(o,r),u.subVectors(s,r),h.cross(u),i.setXYZ(d+0,h.x,h.y,h.z),i.setXYZ(d+1,h.x,h.y,h.z),i.setXYZ(d+2,h.x,h.y,h.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)vt.fromBufferAttribute(e,t),vt.normalize(),e.setXYZ(t,vt.x,vt.y,vt.z)}toNonIndexed(){function e(a,c){let l=a.array,h=a.itemSize,u=a.normalized,d=new l.constructor(c.length*h),f=0,g=0;for(let y=0,m=c.length;y<m;y++){a.isInterleavedBufferAttribute?f=c[y]*a.data.stride+a.offset:f=c[y]*h;for(let p=0;p<h;p++)d[g++]=l[f++]}return new ft(d,h,u)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new n,i=this.index.array,s=this.attributes;for(let a in s){let c=s[a],l=e(c,i);t.setAttribute(a,l)}let r=this.morphAttributes;for(let a in r){let c=[],l=r[a];for(let h=0,u=l.length;h<u;h++){let d=l[h],f=e(d,i);c.push(f)}t.morphAttributes[a]=c}t.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,c=o.length;a<c;a++){let l=o[a];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){let e={metadata:{version:4.6,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){let c=this.parameters;for(let l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let i=this.attributes;for(let c in i){let l=i[c];e.data.attributes[c]=l.toJSON(e.data)}let s={},r=!1;for(let c in this.morphAttributes){let l=this.morphAttributes[c],h=[];for(let u=0,d=l.length;u<d;u++){let f=l[u];h.push(f.toJSON(e.data))}h.length>0&&(s[c]=h,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(e.data.boundingSphere={center:a.center.toArray(),radius:a.radius}),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let i=e.index;i!==null&&this.setIndex(i.clone(t));let s=e.attributes;for(let l in s){let h=s[l];this.setAttribute(l,h.clone(t))}let r=e.morphAttributes;for(let l in r){let h=[],u=r[l];for(let d=0,f=u.length;d<f;d++)h.push(u[d].clone(t));this.morphAttributes[l]=h}this.morphTargetsRelative=e.morphTargetsRelative;let o=e.groups;for(let l=0,h=o.length;l<h;l++){let u=o[l];this.addGroup(u.start,u.count,u.materialIndex)}let a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());let c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}},al=new Ge,Ki=new Di,Gs=new Ft,cl=new L,Sn=new L,wn=new L,Mn=new L,Ao=new L,Ws=new L,Xs=new Ee,qs=new Ee,$s=new Ee,ll=new L,hl=new L,ul=new L,Ys=new L,Ks=new L,_t=class extends at{constructor(e=new Mt,t=new oi){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){let s=t[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(e,t){let i=this.geometry,s=i.attributes.position,r=i.morphAttributes.position,o=i.morphTargetsRelative;t.fromBufferAttribute(s,e);let a=this.morphTargetInfluences;if(r&&a){Ws.set(0,0,0);for(let c=0,l=r.length;c<l;c++){let h=a[c],u=r[c];h!==0&&(Ao.fromBufferAttribute(u,e),o?Ws.addScaledVector(Ao,h):Ws.addScaledVector(Ao.sub(t),h))}t.add(Ws)}return t}raycast(e,t){let i=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),Gs.copy(i.boundingSphere),Gs.applyMatrix4(r),Ki.copy(e.ray).recast(e.near),!(Gs.containsPoint(Ki.origin)===!1&&(Ki.intersectSphere(Gs,cl)===null||Ki.origin.distanceToSquared(cl)>(e.far-e.near)**2))&&(al.copy(r).invert(),Ki.copy(e.ray).applyMatrix4(al),!(i.boundingBox!==null&&Ki.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,Ki)))}_computeIntersections(e,t,i){let s,r=this.geometry,o=this.material,a=r.index,c=r.attributes.position,l=r.attributes.uv,h=r.attributes.uv1,u=r.attributes.normal,d=r.groups,f=r.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,y=d.length;g<y;g++){let m=d[g],p=o[m.materialIndex],S=Math.max(m.start,f.start),v=Math.min(a.count,Math.min(m.start+m.count,f.start+f.count));for(let w=S,C=v;w<C;w+=3){let T=a.getX(w),R=a.getX(w+1),W=a.getX(w+2);s=js(this,p,e,i,l,h,u,T,R,W),s&&(s.faceIndex=Math.floor(w/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{let g=Math.max(0,f.start),y=Math.min(a.count,f.start+f.count);for(let m=g,p=y;m<p;m+=3){let S=a.getX(m),v=a.getX(m+1),w=a.getX(m+2);s=js(this,o,e,i,l,h,u,S,v,w),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}else if(c!==void 0)if(Array.isArray(o))for(let g=0,y=d.length;g<y;g++){let m=d[g],p=o[m.materialIndex],S=Math.max(m.start,f.start),v=Math.min(c.count,Math.min(m.start+m.count,f.start+f.count));for(let w=S,C=v;w<C;w+=3){let T=w,R=w+1,W=w+2;s=js(this,p,e,i,l,h,u,T,R,W),s&&(s.faceIndex=Math.floor(w/3),s.face.materialIndex=m.materialIndex,t.push(s))}}else{let g=Math.max(0,f.start),y=Math.min(c.count,f.start+f.count);for(let m=g,p=y;m<p;m+=3){let S=m,v=m+1,w=m+2;s=js(this,o,e,i,l,h,u,S,v,w),s&&(s.faceIndex=Math.floor(m/3),t.push(s))}}}};function Rd(n,e,t,i,s,r,o,a){let c;if(e.side===It?c=i.intersectTriangle(o,r,s,!0,a):c=i.intersectTriangle(s,r,o,e.side===ri,a),c===null)return null;Ks.copy(a),Ks.applyMatrix4(n.matrixWorld);let l=t.ray.origin.distanceTo(Ks);return l<t.near||l>t.far?null:{distance:l,point:Ks.clone(),object:n}}function js(n,e,t,i,s,r,o,a,c,l){n.getVertexPosition(a,Sn),n.getVertexPosition(c,wn),n.getVertexPosition(l,Mn);let h=Rd(n,e,t,i,Sn,wn,Mn,Ys);if(h){s&&(Xs.fromBufferAttribute(s,a),qs.fromBufferAttribute(s,c),$s.fromBufferAttribute(s,l),h.uv=Ln.getInterpolation(Ys,Sn,wn,Mn,Xs,qs,$s,new Ee)),r&&(Xs.fromBufferAttribute(r,a),qs.fromBufferAttribute(r,c),$s.fromBufferAttribute(r,l),h.uv1=Ln.getInterpolation(Ys,Sn,wn,Mn,Xs,qs,$s,new Ee),h.uv2=h.uv1),o&&(ll.fromBufferAttribute(o,a),hl.fromBufferAttribute(o,c),ul.fromBufferAttribute(o,l),h.normal=Ln.getInterpolation(Ys,Sn,wn,Mn,ll,hl,ul,new L),h.normal.dot(i.direction)>0&&h.normal.multiplyScalar(-1));let u={a,b:c,c:l,normal:new L,materialIndex:0};Ln.getNormal(Sn,wn,Mn,u.normal),h.face=u}return h}var Oi=class n extends Mt{constructor(e=1,t=1,i=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:s,heightSegments:r,depthSegments:o};let a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);let c=[],l=[],h=[],u=[],d=0,f=0;g("z","y","x",-1,-1,i,t,e,o,r,0),g("z","y","x",1,-1,i,t,-e,o,r,1),g("x","z","y",1,1,e,i,t,s,o,2),g("x","z","y",1,-1,e,i,-t,s,o,3),g("x","y","z",1,-1,e,t,i,s,r,4),g("x","y","z",-1,-1,e,t,-i,s,r,5),this.setIndex(c),this.setAttribute("position",new it(l,3)),this.setAttribute("normal",new it(h,3)),this.setAttribute("uv",new it(u,2));function g(y,m,p,S,v,w,C,T,R,W,_){let E=w/R,H=C/W,V=w/2,Q=C/2,I=T/2,O=R+1,z=W+1,$=0,X=0,q=new L;for(let Y=0;Y<z;Y++){let se=Y*H-Q;for(let re=0;re<O;re++){let G=re*E-V;q[y]=G*S,q[m]=se*v,q[p]=I,l.push(q.x,q.y,q.z),q[y]=0,q[m]=0,q[p]=T>0?1:-1,h.push(q.x,q.y,q.z),u.push(re/R),u.push(1-Y/W),$+=1}}for(let Y=0;Y<W;Y++)for(let se=0;se<R;se++){let re=d+se+O*Y,G=d+se+O*(Y+1),K=d+(se+1)+O*(Y+1),le=d+(se+1)+O*Y;c.push(re,G,le),c.push(G,K,le),X+=6}a.addGroup(f,X,_),f+=X,d+=$}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new n(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};function Vn(n){let e={};for(let t in n){e[t]={};for(let i in n[t]){let s=n[t][i];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=s.clone():Array.isArray(s)?e[t][i]=s.slice():e[t][i]=s}}return e}function Pt(n){let e={};for(let t=0;t<n.length;t++){let i=Vn(n[t]);for(let s in i)e[s]=i[s]}return e}function Cd(n){let e=[];for(let t=0;t<n.length;t++)e.push(n[t].clone());return e}function mh(n){return n.getRenderTarget()===null?n.outputColorSpace:je.workingColorSpace}var Pd={clone:Vn,merge:Pt},Ld=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Id=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,vi=class extends Bt{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Ld,this.fragmentShader=Id,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={derivatives:!1,fragDepth:!1,drawBuffers:!1,shaderTextureLOD:!1,clipCullDistance:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Vn(e.uniforms),this.uniformsGroups=Cd(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let s in this.uniforms){let o=this.uniforms[s].value;o&&o.isTexture?t.uniforms[s]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[s]={type:"m4",value:o.toArray()}:t.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let i={};for(let s in this.extensions)this.extensions[s]===!0&&(i[s]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}},br=class extends at{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Ge,this.projectionMatrix=new Ge,this.projectionMatrixInverse=new Ge,this.coordinateSystem=yi}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}},dt=class extends br{constructor(e=50,t=1,i=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=Hn*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(as*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Hn*2*Math.atan(Math.tan(as*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}setViewOffset(e,t,i,s,r,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(as*.5*this.fov)/this.zoom,i=2*t,s=this.aspect*i,r=-.5*s,o=this.view;if(this.view!==null&&this.view.enabled){let c=o.fullWidth,l=o.fullHeight;r+=o.offsetX*s/c,t-=o.offsetY*i/l,s*=o.width/c,i*=o.height/l}let a=this.filmOffset;a!==0&&(r+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-i,e,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}},Tn=-90,En=1,Yo=class extends at{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new dt(Tn,En,e,t);s.layers=this.layers,this.add(s);let r=new dt(Tn,En,e,t);r.layers=this.layers,this.add(r);let o=new dt(Tn,En,e,t);o.layers=this.layers,this.add(o);let a=new dt(Tn,En,e,t);a.layers=this.layers,this.add(a);let c=new dt(Tn,En,e,t);c.layers=this.layers,this.add(c);let l=new dt(Tn,En,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[i,s,r,o,a,c]=t;for(let l of t)this.remove(l);if(e===yi)i.up.set(0,1,0),i.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===dr)i.up.set(0,-1,0),i.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:i,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[r,o,a,c,l,h]=this.children,u=e.getRenderTarget(),d=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;let y=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,e.setRenderTarget(i,0,s),e.render(t,r),e.setRenderTarget(i,1,s),e.render(t,o),e.setRenderTarget(i,2,s),e.render(t,a),e.setRenderTarget(i,3,s),e.render(t,c),e.setRenderTarget(i,4,s),e.render(t,l),i.texture.generateMipmaps=y,e.setRenderTarget(i,5,s),e.render(t,h),e.setRenderTarget(u,d,f),e.xr.enabled=g,i.texture.needsPMREMUpdate=!0}},Sr=class extends Rt{constructor(e,t,i,s,r,o,a,c,l,h){e=e!==void 0?e:[],t=t!==void 0?t:Un,super(e,t,i,s,r,o,a,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},Ko=class extends xi{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let i={width:e,height:e,depth:1},s=[i,i,i,i,i,i];t.encoding!==void 0&&(ls("THREE.WebGLCubeRenderTarget: option.encoding has been replaced by option.colorSpace."),t.colorSpace=t.encoding===nn?st:Gt),this.texture=new Sr(s,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.colorSpace),this.texture.isRenderTargetTexture=!0,this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:Lt}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new Oi(5,5,5),r=new vi({name:"CubemapFromEquirect",uniforms:Vn(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:It,blending:Li});r.uniforms.tEquirect.value=t;let o=new _t(s,r),a=t.minFilter;return t.minFilter===Ni&&(t.minFilter=Lt),new Yo(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t,i,s){let r=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,i,s);e.setRenderTarget(r)}},Ro=new L,kd=new L,Nd=new Ve,Zt=class{constructor(e=new L(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,s){return this.normal.set(e,t,i),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){let s=Ro.subVectors(i,t).cross(kd.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){let i=e.delta(Ro),s=this.normal.dot(i);if(s===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let r=-(e.start.dot(this.normal)+this.constant)/s;return r<0||r>1?null:t.copy(e.start).addScaledVector(i,r)}intersectsLine(e){let t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let i=t||Nd.getNormalMatrix(e),s=this.coplanarPoint(Ro).applyMatrix4(e),r=this.normal.applyMatrix3(i).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},ji=new Ft,Zs=new L,fs=class{constructor(e=new Zt,t=new Zt,i=new Zt,s=new Zt,r=new Zt,o=new Zt){this.planes=[e,t,i,s,r,o]}set(e,t,i,s,r,o){let a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(i),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(e){let t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=yi){let i=this.planes,s=e.elements,r=s[0],o=s[1],a=s[2],c=s[3],l=s[4],h=s[5],u=s[6],d=s[7],f=s[8],g=s[9],y=s[10],m=s[11],p=s[12],S=s[13],v=s[14],w=s[15];if(i[0].setComponents(c-r,d-l,m-f,w-p).normalize(),i[1].setComponents(c+r,d+l,m+f,w+p).normalize(),i[2].setComponents(c+o,d+h,m+g,w+S).normalize(),i[3].setComponents(c-o,d-h,m-g,w-S).normalize(),i[4].setComponents(c-a,d-u,m-y,w-v).normalize(),t===yi)i[5].setComponents(c+a,d+u,m+y,w+v).normalize();else if(t===dr)i[5].setComponents(a,u,y,v).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),ji.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),ji.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(ji)}intersectsSprite(e){return ji.center.set(0,0,0),ji.radius=.7071067811865476,ji.applyMatrix4(e.matrixWorld),this.intersectsSphere(ji)}intersectsSphere(e){let t=this.planes,i=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(i)<s)return!1;return!0}intersectsBox(e){let t=this.planes;for(let i=0;i<6;i++){let s=t[i];if(Zs.x=s.normal.x>0?e.max.x:e.min.x,Zs.y=s.normal.y>0?e.max.y:e.min.y,Zs.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(Zs)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};function gh(){let n=null,e=!1,t=null,i=null;function s(r,o){t(r,o),i=n.requestAnimationFrame(s)}return{start:function(){e!==!0&&t!==null&&(i=n.requestAnimationFrame(s),e=!0)},stop:function(){n.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){n=r}}}function Dd(n,e){let t=e.isWebGL2,i=new WeakMap;function s(l,h){let u=l.array,d=l.usage,f=u.byteLength,g=n.createBuffer();n.bindBuffer(h,g),n.bufferData(h,u,d),l.onUploadCallback();let y;if(u instanceof Float32Array)y=n.FLOAT;else if(u instanceof Uint16Array)if(l.isFloat16BufferAttribute)if(t)y=n.HALF_FLOAT;else throw new Error("THREE.WebGLAttributes: Usage of Float16BufferAttribute requires WebGL2.");else y=n.UNSIGNED_SHORT;else if(u instanceof Int16Array)y=n.SHORT;else if(u instanceof Uint32Array)y=n.UNSIGNED_INT;else if(u instanceof Int32Array)y=n.INT;else if(u instanceof Int8Array)y=n.BYTE;else if(u instanceof Uint8Array)y=n.UNSIGNED_BYTE;else if(u instanceof Uint8ClampedArray)y=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+u);return{buffer:g,type:y,bytesPerElement:u.BYTES_PER_ELEMENT,version:l.version,size:f}}function r(l,h,u){let d=h.array,f=h._updateRange,g=h.updateRanges;if(n.bindBuffer(u,l),f.count===-1&&g.length===0&&n.bufferSubData(u,0,d),g.length!==0){for(let y=0,m=g.length;y<m;y++){let p=g[y];t?n.bufferSubData(u,p.start*d.BYTES_PER_ELEMENT,d,p.start,p.count):n.bufferSubData(u,p.start*d.BYTES_PER_ELEMENT,d.subarray(p.start,p.start+p.count))}h.clearUpdateRanges()}f.count!==-1&&(t?n.bufferSubData(u,f.offset*d.BYTES_PER_ELEMENT,d,f.offset,f.count):n.bufferSubData(u,f.offset*d.BYTES_PER_ELEMENT,d.subarray(f.offset,f.offset+f.count)),f.count=-1),h.onUploadCallback()}function o(l){return l.isInterleavedBufferAttribute&&(l=l.data),i.get(l)}function a(l){l.isInterleavedBufferAttribute&&(l=l.data);let h=i.get(l);h&&(n.deleteBuffer(h.buffer),i.delete(l))}function c(l,h){if(l.isGLBufferAttribute){let d=i.get(l);(!d||d.version<l.version)&&i.set(l,{buffer:l.buffer,type:l.type,bytesPerElement:l.elementSize,version:l.version});return}l.isInterleavedBufferAttribute&&(l=l.data);let u=i.get(l);if(u===void 0)i.set(l,s(l,h));else if(u.version<l.version){if(u.size!==l.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");r(u.buffer,l,h),u.version=l.version}}return{get:o,remove:a,update:c}}var ms=class n extends Mt{constructor(e=1,t=1,i=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:s};let r=e/2,o=t/2,a=Math.floor(i),c=Math.floor(s),l=a+1,h=c+1,u=e/a,d=t/c,f=[],g=[],y=[],m=[];for(let p=0;p<h;p++){let S=p*d-o;for(let v=0;v<l;v++){let w=v*u-r;g.push(w,-S,0),y.push(0,0,1),m.push(v/a),m.push(1-p/c)}}for(let p=0;p<c;p++)for(let S=0;S<a;S++){let v=S+l*p,w=S+l*(p+1),C=S+1+l*(p+1),T=S+1+l*p;f.push(v,w,T),f.push(w,C,T)}this.setIndex(f),this.setAttribute("position",new it(g,3)),this.setAttribute("normal",new it(y,3)),this.setAttribute("uv",new it(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new n(e.width,e.height,e.widthSegments,e.heightSegments)}},Od=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Ud=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,Fd=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Bd=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,zd=`#ifdef USE_ALPHATEST
	if ( diffuseColor.a < alphaTest ) discard;
#endif`,Hd=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Vd=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Gd=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Wd=`#ifdef USE_BATCHING
	attribute float batchId;
	uniform highp sampler2D batchingTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Xd=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( batchId );
#endif`,qd=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,$d=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Yd=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Kd=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,jd=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Zd=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#pragma unroll_loop_start
	for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
		plane = clippingPlanes[ i ];
		if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
	}
	#pragma unroll_loop_end
	#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
		bool clipped = true;
		#pragma unroll_loop_start
		for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
		}
		#pragma unroll_loop_end
		if ( clipped ) discard;
	#endif
#endif`,Jd=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Qd=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,ep=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,tp=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,ip=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,np=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	varying vec3 vColor;
#endif`,sp=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif`,rp=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
float luminance( const in vec3 rgb ) {
	const vec3 weights = vec3( 0.2126729, 0.7151522, 0.0721750 );
	return dot( weights, rgb );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,op=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,ap=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,cp=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,lp=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,hp=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,up=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,dp="gl_FragColor = linearToOutputTexel( gl_FragColor );",pp=`
const mat3 LINEAR_SRGB_TO_LINEAR_DISPLAY_P3 = mat3(
	vec3( 0.8224621, 0.177538, 0.0 ),
	vec3( 0.0331941, 0.9668058, 0.0 ),
	vec3( 0.0170827, 0.0723974, 0.9105199 )
);
const mat3 LINEAR_DISPLAY_P3_TO_LINEAR_SRGB = mat3(
	vec3( 1.2249401, - 0.2249404, 0.0 ),
	vec3( - 0.0420569, 1.0420571, 0.0 ),
	vec3( - 0.0196376, - 0.0786361, 1.0982735 )
);
vec4 LinearSRGBToLinearDisplayP3( in vec4 value ) {
	return vec4( value.rgb * LINEAR_SRGB_TO_LINEAR_DISPLAY_P3, value.a );
}
vec4 LinearDisplayP3ToLinearSRGB( in vec4 value ) {
	return vec4( value.rgb * LINEAR_DISPLAY_P3_TO_LINEAR_SRGB, value.a );
}
vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
vec4 LinearToLinear( in vec4 value ) {
	return value;
}
vec4 LinearTosRGB( in vec4 value ) {
	return sRGBTransferOETF( value );
}`,fp=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,mp=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,gp=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,yp=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,xp=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,vp=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,_p=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,bp=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Sp=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,wp=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Mp=`#ifdef USE_LIGHTMAP
	vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
	vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
	reflectedLight.indirectDiffuse += lightMapIrradiance;
#endif`,Tp=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Ep=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Ap=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Rp=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	#if defined ( LEGACY_LIGHTS )
		if ( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
			return pow( saturate( - lightDistance / cutoffDistance + 1.0 ), decayExponent );
		}
		return 1.0;
	#else
		float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
		if ( cutoffDistance > 0.0 ) {
			distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
		}
		return distanceFalloff;
	#endif
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Cp=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,Pp=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Lp=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Ip=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,kp=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Np=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Dp=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	vec2 fab = vec2( - 1.04, 1.04 ) * a004 + r.zw;
	return fab;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,Op=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Up=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,Fp=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Bp=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	gl_FragDepthEXT = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,zp=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Hp=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		varying float vFragDepth;
		varying float vIsPerspective;
	#else
		uniform float logDepthBufFC;
	#endif
#endif`,Vp=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		vFragDepth = 1.0 + gl_Position.w;
		vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
	#else
		if ( isPerspectiveMatrix( projectionMatrix ) ) {
			gl_Position.z = log2( max( EPSILON, gl_Position.w + 1.0 ) ) * logDepthBufFC - 1.0;
			gl_Position.z *= gl_Position.w;
		}
	#endif
#endif`,Gp=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = vec4( mix( pow( sampledDiffuseColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), sampledDiffuseColor.rgb * 0.0773993808, vec3( lessThanEqual( sampledDiffuseColor.rgb, vec3( 0.04045 ) ) ) ), sampledDiffuseColor.w );
	
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Wp=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Xp=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,qp=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,$p=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Yp=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Kp=`#if defined( USE_MORPHCOLORS ) && defined( MORPHTARGETS_TEXTURE )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,jp=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		objectNormal += morphNormal0 * morphTargetInfluences[ 0 ];
		objectNormal += morphNormal1 * morphTargetInfluences[ 1 ];
		objectNormal += morphNormal2 * morphTargetInfluences[ 2 ];
		objectNormal += morphNormal3 * morphTargetInfluences[ 3 ];
	#endif
#endif`,Zp=`#ifdef USE_MORPHTARGETS
	uniform float morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
		uniform sampler2DArray morphTargetsTexture;
		uniform ivec2 morphTargetsTextureSize;
		vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
			int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
			int y = texelIndex / morphTargetsTextureSize.x;
			int x = texelIndex - y * morphTargetsTextureSize.x;
			ivec3 morphUV = ivec3( x, y, morphTargetIndex );
			return texelFetch( morphTargetsTexture, morphUV, 0 );
		}
	#else
		#ifndef USE_MORPHNORMALS
			uniform float morphTargetInfluences[ 8 ];
		#else
			uniform float morphTargetInfluences[ 4 ];
		#endif
	#endif
#endif`,Jp=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	#ifdef MORPHTARGETS_TEXTURE
		for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
			if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
		}
	#else
		transformed += morphTarget0 * morphTargetInfluences[ 0 ];
		transformed += morphTarget1 * morphTargetInfluences[ 1 ];
		transformed += morphTarget2 * morphTargetInfluences[ 2 ];
		transformed += morphTarget3 * morphTargetInfluences[ 3 ];
		#ifndef USE_MORPHNORMALS
			transformed += morphTarget4 * morphTargetInfluences[ 4 ];
			transformed += morphTarget5 * morphTargetInfluences[ 5 ];
			transformed += morphTarget6 * morphTargetInfluences[ 6 ];
			transformed += morphTarget7 * morphTargetInfluences[ 7 ];
		#endif
	#endif
#endif`,Qp=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,ef=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,tf=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,nf=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,sf=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,rf=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,of=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,af=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,cf=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,lf=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,hf=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,uf=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;
const vec3 PackFactors = vec3( 256. * 256. * 256., 256. * 256., 256. );
const vec4 UnpackFactors = UnpackDownscale / vec4( PackFactors, 1. );
const float ShiftRight8 = 1. / 256.;
vec4 packDepthToRGBA( const in float v ) {
	vec4 r = vec4( fract( v * PackFactors ), v );
	r.yzw -= r.xyz * ShiftRight8;	return r * PackUpscale;
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors );
}
vec2 packDepthToRG( in highp float v ) {
	return packDepthToRGBA( v ).yx;
}
float unpackRGToDepth( const in highp vec2 v ) {
	return unpackRGBAToDepth( vec4( v.xy, 0.0, 0.0 ) );
}
vec4 pack2HalfToRGBA( vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,df=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,pf=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,ff=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,mf=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,gf=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,yf=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,xf=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return shadow;
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
		vec3 lightToPosition = shadowCoord.xyz;
		float dp = ( length( lightToPosition ) - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );		dp += shadowBias;
		vec3 bd3D = normalize( lightToPosition );
		#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
			vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
			return (
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
			) * ( 1.0 / 9.0 );
		#else
			return texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
		#endif
	}
#endif`,vf=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,_f=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,bf=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Sf=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,wf=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Mf=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Tf=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,Ef=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Af=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Rf=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Cf=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 OptimizedCineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color *= toneMappingExposure;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	return color;
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,Pf=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Lf=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
		vec3 refractedRayExit = position + transmissionRay;
		vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
		vec2 refractionCoords = ndcPos.xy / ndcPos.w;
		refractionCoords += 1.0;
		refractionCoords /= 2.0;
		vec4 transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
		vec3 transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,If=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,kf=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Nf=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Df=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,Of=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Uf=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Ff=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Bf=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,zf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Hf=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Vf=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,Gf=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#endif
}`,Wf=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,Xf=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,qf=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,$f=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Yf=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Kf=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,jf=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,Zf=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Jf=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Qf=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,em=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,tm=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,im=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,nm=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), opacity );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,sm=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,rm=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,om=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,am=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,cm=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,lm=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,hm=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,um=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,dm=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,pm=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,fm=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec2 scale;
	scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
	scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,mm=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Fe={alphahash_fragment:Od,alphahash_pars_fragment:Ud,alphamap_fragment:Fd,alphamap_pars_fragment:Bd,alphatest_fragment:zd,alphatest_pars_fragment:Hd,aomap_fragment:Vd,aomap_pars_fragment:Gd,batching_pars_vertex:Wd,batching_vertex:Xd,begin_vertex:qd,beginnormal_vertex:$d,bsdfs:Yd,iridescence_fragment:Kd,bumpmap_pars_fragment:jd,clipping_planes_fragment:Zd,clipping_planes_pars_fragment:Jd,clipping_planes_pars_vertex:Qd,clipping_planes_vertex:ep,color_fragment:tp,color_pars_fragment:ip,color_pars_vertex:np,color_vertex:sp,common:rp,cube_uv_reflection_fragment:op,defaultnormal_vertex:ap,displacementmap_pars_vertex:cp,displacementmap_vertex:lp,emissivemap_fragment:hp,emissivemap_pars_fragment:up,colorspace_fragment:dp,colorspace_pars_fragment:pp,envmap_fragment:fp,envmap_common_pars_fragment:mp,envmap_pars_fragment:gp,envmap_pars_vertex:yp,envmap_physical_pars_fragment:Cp,envmap_vertex:xp,fog_vertex:vp,fog_pars_vertex:_p,fog_fragment:bp,fog_pars_fragment:Sp,gradientmap_pars_fragment:wp,lightmap_fragment:Mp,lightmap_pars_fragment:Tp,lights_lambert_fragment:Ep,lights_lambert_pars_fragment:Ap,lights_pars_begin:Rp,lights_toon_fragment:Pp,lights_toon_pars_fragment:Lp,lights_phong_fragment:Ip,lights_phong_pars_fragment:kp,lights_physical_fragment:Np,lights_physical_pars_fragment:Dp,lights_fragment_begin:Op,lights_fragment_maps:Up,lights_fragment_end:Fp,logdepthbuf_fragment:Bp,logdepthbuf_pars_fragment:zp,logdepthbuf_pars_vertex:Hp,logdepthbuf_vertex:Vp,map_fragment:Gp,map_pars_fragment:Wp,map_particle_fragment:Xp,map_particle_pars_fragment:qp,metalnessmap_fragment:$p,metalnessmap_pars_fragment:Yp,morphcolor_vertex:Kp,morphnormal_vertex:jp,morphtarget_pars_vertex:Zp,morphtarget_vertex:Jp,normal_fragment_begin:Qp,normal_fragment_maps:ef,normal_pars_fragment:tf,normal_pars_vertex:nf,normal_vertex:sf,normalmap_pars_fragment:rf,clearcoat_normal_fragment_begin:of,clearcoat_normal_fragment_maps:af,clearcoat_pars_fragment:cf,iridescence_pars_fragment:lf,opaque_fragment:hf,packing:uf,premultiplied_alpha_fragment:df,project_vertex:pf,dithering_fragment:ff,dithering_pars_fragment:mf,roughnessmap_fragment:gf,roughnessmap_pars_fragment:yf,shadowmap_pars_fragment:xf,shadowmap_pars_vertex:vf,shadowmap_vertex:_f,shadowmask_pars_fragment:bf,skinbase_vertex:Sf,skinning_pars_vertex:wf,skinning_vertex:Mf,skinnormal_vertex:Tf,specularmap_fragment:Ef,specularmap_pars_fragment:Af,tonemapping_fragment:Rf,tonemapping_pars_fragment:Cf,transmission_fragment:Pf,transmission_pars_fragment:Lf,uv_pars_fragment:If,uv_pars_vertex:kf,uv_vertex:Nf,worldpos_vertex:Df,background_vert:Of,background_frag:Uf,backgroundCube_vert:Ff,backgroundCube_frag:Bf,cube_vert:zf,cube_frag:Hf,depth_vert:Vf,depth_frag:Gf,distanceRGBA_vert:Wf,distanceRGBA_frag:Xf,equirect_vert:qf,equirect_frag:$f,linedashed_vert:Yf,linedashed_frag:Kf,meshbasic_vert:jf,meshbasic_frag:Zf,meshlambert_vert:Jf,meshlambert_frag:Qf,meshmatcap_vert:em,meshmatcap_frag:tm,meshnormal_vert:im,meshnormal_frag:nm,meshphong_vert:sm,meshphong_frag:rm,meshphysical_vert:om,meshphysical_frag:am,meshtoon_vert:cm,meshtoon_frag:lm,points_vert:hm,points_frag:um,shadow_vert:dm,shadow_frag:pm,sprite_vert:fm,sprite_frag:mm},oe={common:{diffuse:{value:new me(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ve},alphaMap:{value:null},alphaMapTransform:{value:new Ve},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ve}},envmap:{envMap:{value:null},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ve}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ve}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ve},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ve},normalScale:{value:new Ee(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ve},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ve}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ve}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ve}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new me(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new me(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ve},alphaTest:{value:0},uvTransform:{value:new Ve}},sprite:{diffuse:{value:new me(16777215)},opacity:{value:1},center:{value:new Ee(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ve},alphaMap:{value:null},alphaMapTransform:{value:new Ve},alphaTest:{value:0}}},ii={basic:{uniforms:Pt([oe.common,oe.specularmap,oe.envmap,oe.aomap,oe.lightmap,oe.fog]),vertexShader:Fe.meshbasic_vert,fragmentShader:Fe.meshbasic_frag},lambert:{uniforms:Pt([oe.common,oe.specularmap,oe.envmap,oe.aomap,oe.lightmap,oe.emissivemap,oe.bumpmap,oe.normalmap,oe.displacementmap,oe.fog,oe.lights,{emissive:{value:new me(0)}}]),vertexShader:Fe.meshlambert_vert,fragmentShader:Fe.meshlambert_frag},phong:{uniforms:Pt([oe.common,oe.specularmap,oe.envmap,oe.aomap,oe.lightmap,oe.emissivemap,oe.bumpmap,oe.normalmap,oe.displacementmap,oe.fog,oe.lights,{emissive:{value:new me(0)},specular:{value:new me(1118481)},shininess:{value:30}}]),vertexShader:Fe.meshphong_vert,fragmentShader:Fe.meshphong_frag},standard:{uniforms:Pt([oe.common,oe.envmap,oe.aomap,oe.lightmap,oe.emissivemap,oe.bumpmap,oe.normalmap,oe.displacementmap,oe.roughnessmap,oe.metalnessmap,oe.fog,oe.lights,{emissive:{value:new me(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Fe.meshphysical_vert,fragmentShader:Fe.meshphysical_frag},toon:{uniforms:Pt([oe.common,oe.aomap,oe.lightmap,oe.emissivemap,oe.bumpmap,oe.normalmap,oe.displacementmap,oe.gradientmap,oe.fog,oe.lights,{emissive:{value:new me(0)}}]),vertexShader:Fe.meshtoon_vert,fragmentShader:Fe.meshtoon_frag},matcap:{uniforms:Pt([oe.common,oe.bumpmap,oe.normalmap,oe.displacementmap,oe.fog,{matcap:{value:null}}]),vertexShader:Fe.meshmatcap_vert,fragmentShader:Fe.meshmatcap_frag},points:{uniforms:Pt([oe.points,oe.fog]),vertexShader:Fe.points_vert,fragmentShader:Fe.points_frag},dashed:{uniforms:Pt([oe.common,oe.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Fe.linedashed_vert,fragmentShader:Fe.linedashed_frag},depth:{uniforms:Pt([oe.common,oe.displacementmap]),vertexShader:Fe.depth_vert,fragmentShader:Fe.depth_frag},normal:{uniforms:Pt([oe.common,oe.bumpmap,oe.normalmap,oe.displacementmap,{opacity:{value:1}}]),vertexShader:Fe.meshnormal_vert,fragmentShader:Fe.meshnormal_frag},sprite:{uniforms:Pt([oe.sprite,oe.fog]),vertexShader:Fe.sprite_vert,fragmentShader:Fe.sprite_frag},background:{uniforms:{uvTransform:{value:new Ve},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Fe.background_vert,fragmentShader:Fe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1}},vertexShader:Fe.backgroundCube_vert,fragmentShader:Fe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Fe.cube_vert,fragmentShader:Fe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Fe.equirect_vert,fragmentShader:Fe.equirect_frag},distanceRGBA:{uniforms:Pt([oe.common,oe.displacementmap,{referencePosition:{value:new L},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Fe.distanceRGBA_vert,fragmentShader:Fe.distanceRGBA_frag},shadow:{uniforms:Pt([oe.lights,oe.fog,{color:{value:new me(0)},opacity:{value:1}}]),vertexShader:Fe.shadow_vert,fragmentShader:Fe.shadow_frag}};ii.physical={uniforms:Pt([ii.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ve},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ve},clearcoatNormalScale:{value:new Ee(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ve},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ve},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ve},sheen:{value:0},sheenColor:{value:new me(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ve},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ve},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ve},transmissionSamplerSize:{value:new Ee},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ve},attenuationDistance:{value:0},attenuationColor:{value:new me(0)},specularColor:{value:new me(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ve},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ve},anisotropyVector:{value:new Ee},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ve}}]),vertexShader:Fe.meshphysical_vert,fragmentShader:Fe.meshphysical_frag};var Js={r:0,b:0,g:0};function gm(n,e,t,i,s,r,o){let a=new me(0),c=r===!0?0:1,l,h,u=null,d=0,f=null;function g(m,p){let S=!1,v=p.isScene===!0?p.background:null;v&&v.isTexture&&(v=(p.backgroundBlurriness>0?t:e).get(v)),v===null?y(a,c):v&&v.isColor&&(y(v,1),S=!0);let w=n.xr.getEnvironmentBlendMode();w==="additive"?i.buffers.color.setClear(0,0,0,1,o):w==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,o),(n.autoClear||S)&&n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil),v&&(v.isCubeTexture||v.mapping===Hr)?(h===void 0&&(h=new _t(new Oi(1,1,1),new vi({name:"BackgroundCubeMaterial",uniforms:Vn(ii.backgroundCube.uniforms),vertexShader:ii.backgroundCube.vertexShader,fragmentShader:ii.backgroundCube.fragmentShader,side:It,depthTest:!1,depthWrite:!1,fog:!1})),h.geometry.deleteAttribute("normal"),h.geometry.deleteAttribute("uv"),h.onBeforeRender=function(C,T,R){this.matrixWorld.copyPosition(R.matrixWorld)},Object.defineProperty(h.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(h)),h.material.uniforms.envMap.value=v,h.material.uniforms.flipEnvMap.value=v.isCubeTexture&&v.isRenderTargetTexture===!1?-1:1,h.material.uniforms.backgroundBlurriness.value=p.backgroundBlurriness,h.material.uniforms.backgroundIntensity.value=p.backgroundIntensity,h.material.toneMapped=je.getTransfer(v.colorSpace)!==tt,(u!==v||d!==v.version||f!==n.toneMapping)&&(h.material.needsUpdate=!0,u=v,d=v.version,f=n.toneMapping),h.layers.enableAll(),m.unshift(h,h.geometry,h.material,0,0,null)):v&&v.isTexture&&(l===void 0&&(l=new _t(new ms(2,2),new vi({name:"BackgroundMaterial",uniforms:Vn(ii.background.uniforms),vertexShader:ii.background.vertexShader,fragmentShader:ii.background.fragmentShader,side:ri,depthTest:!1,depthWrite:!1,fog:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(l)),l.material.uniforms.t2D.value=v,l.material.uniforms.backgroundIntensity.value=p.backgroundIntensity,l.material.toneMapped=je.getTransfer(v.colorSpace)!==tt,v.matrixAutoUpdate===!0&&v.updateMatrix(),l.material.uniforms.uvTransform.value.copy(v.matrix),(u!==v||d!==v.version||f!==n.toneMapping)&&(l.material.needsUpdate=!0,u=v,d=v.version,f=n.toneMapping),l.layers.enableAll(),m.unshift(l,l.geometry,l.material,0,0,null))}function y(m,p){m.getRGB(Js,mh(n)),i.buffers.color.setClear(Js.r,Js.g,Js.b,p,o)}return{getClearColor:function(){return a},setClearColor:function(m,p=1){a.set(m),c=p,y(a,c)},getClearAlpha:function(){return c},setClearAlpha:function(m){c=m,y(a,c)},render:g}}function ym(n,e,t,i){let s=n.getParameter(n.MAX_VERTEX_ATTRIBS),r=i.isWebGL2?null:e.get("OES_vertex_array_object"),o=i.isWebGL2||r!==null,a={},c=m(null),l=c,h=!1;function u(I,O,z,$,X){let q=!1;if(o){let Y=y($,z,O);l!==Y&&(l=Y,f(l.object)),q=p(I,$,z,X),q&&S(I,$,z,X)}else{let Y=O.wireframe===!0;(l.geometry!==$.id||l.program!==z.id||l.wireframe!==Y)&&(l.geometry=$.id,l.program=z.id,l.wireframe=Y,q=!0)}X!==null&&t.update(X,n.ELEMENT_ARRAY_BUFFER),(q||h)&&(h=!1,W(I,O,z,$),X!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,t.get(X).buffer))}function d(){return i.isWebGL2?n.createVertexArray():r.createVertexArrayOES()}function f(I){return i.isWebGL2?n.bindVertexArray(I):r.bindVertexArrayOES(I)}function g(I){return i.isWebGL2?n.deleteVertexArray(I):r.deleteVertexArrayOES(I)}function y(I,O,z){let $=z.wireframe===!0,X=a[I.id];X===void 0&&(X={},a[I.id]=X);let q=X[O.id];q===void 0&&(q={},X[O.id]=q);let Y=q[$];return Y===void 0&&(Y=m(d()),q[$]=Y),Y}function m(I){let O=[],z=[],$=[];for(let X=0;X<s;X++)O[X]=0,z[X]=0,$[X]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:O,enabledAttributes:z,attributeDivisors:$,object:I,attributes:{},index:null}}function p(I,O,z,$){let X=l.attributes,q=O.attributes,Y=0,se=z.getAttributes();for(let re in se)if(se[re].location>=0){let K=X[re],le=q[re];if(le===void 0&&(re==="instanceMatrix"&&I.instanceMatrix&&(le=I.instanceMatrix),re==="instanceColor"&&I.instanceColor&&(le=I.instanceColor)),K===void 0||K.attribute!==le||le&&K.data!==le.data)return!0;Y++}return l.attributesNum!==Y||l.index!==$}function S(I,O,z,$){let X={},q=O.attributes,Y=0,se=z.getAttributes();for(let re in se)if(se[re].location>=0){let K=q[re];K===void 0&&(re==="instanceMatrix"&&I.instanceMatrix&&(K=I.instanceMatrix),re==="instanceColor"&&I.instanceColor&&(K=I.instanceColor));let le={};le.attribute=K,K&&K.data&&(le.data=K.data),X[re]=le,Y++}l.attributes=X,l.attributesNum=Y,l.index=$}function v(){let I=l.newAttributes;for(let O=0,z=I.length;O<z;O++)I[O]=0}function w(I){C(I,0)}function C(I,O){let z=l.newAttributes,$=l.enabledAttributes,X=l.attributeDivisors;z[I]=1,$[I]===0&&(n.enableVertexAttribArray(I),$[I]=1),X[I]!==O&&((i.isWebGL2?n:e.get("ANGLE_instanced_arrays"))[i.isWebGL2?"vertexAttribDivisor":"vertexAttribDivisorANGLE"](I,O),X[I]=O)}function T(){let I=l.newAttributes,O=l.enabledAttributes;for(let z=0,$=O.length;z<$;z++)O[z]!==I[z]&&(n.disableVertexAttribArray(z),O[z]=0)}function R(I,O,z,$,X,q,Y){Y===!0?n.vertexAttribIPointer(I,O,z,X,q):n.vertexAttribPointer(I,O,z,$,X,q)}function W(I,O,z,$){if(i.isWebGL2===!1&&(I.isInstancedMesh||$.isInstancedBufferGeometry)&&e.get("ANGLE_instanced_arrays")===null)return;v();let X=$.attributes,q=z.getAttributes(),Y=O.defaultAttributeValues;for(let se in q){let re=q[se];if(re.location>=0){let G=X[se];if(G===void 0&&(se==="instanceMatrix"&&I.instanceMatrix&&(G=I.instanceMatrix),se==="instanceColor"&&I.instanceColor&&(G=I.instanceColor)),G!==void 0){let K=G.normalized,le=G.itemSize,ve=t.get(G);if(ve===void 0)continue;let ye=ve.buffer,Ie=ve.type,ke=ve.bytesPerElement,Te=i.isWebGL2===!0&&(Ie===n.INT||Ie===n.UNSIGNED_INT||G.gpuType===ih);if(G.isInterleavedBufferAttribute){let We=G.data,D=We.stride,bt=G.offset;if(We.isInstancedInterleavedBuffer){for(let Se=0;Se<re.locationSize;Se++)C(re.location+Se,We.meshPerAttribute);I.isInstancedMesh!==!0&&$._maxInstanceCount===void 0&&($._maxInstanceCount=We.meshPerAttribute*We.count)}else for(let Se=0;Se<re.locationSize;Se++)w(re.location+Se);n.bindBuffer(n.ARRAY_BUFFER,ye);for(let Se=0;Se<re.locationSize;Se++)R(re.location+Se,le/re.locationSize,Ie,K,D*ke,(bt+le/re.locationSize*Se)*ke,Te)}else{if(G.isInstancedBufferAttribute){for(let We=0;We<re.locationSize;We++)C(re.location+We,G.meshPerAttribute);I.isInstancedMesh!==!0&&$._maxInstanceCount===void 0&&($._maxInstanceCount=G.meshPerAttribute*G.count)}else for(let We=0;We<re.locationSize;We++)w(re.location+We);n.bindBuffer(n.ARRAY_BUFFER,ye);for(let We=0;We<re.locationSize;We++)R(re.location+We,le/re.locationSize,Ie,K,le*ke,le/re.locationSize*We*ke,Te)}}else if(Y!==void 0){let K=Y[se];if(K!==void 0)switch(K.length){case 2:n.vertexAttrib2fv(re.location,K);break;case 3:n.vertexAttrib3fv(re.location,K);break;case 4:n.vertexAttrib4fv(re.location,K);break;default:n.vertexAttrib1fv(re.location,K)}}}}T()}function _(){V();for(let I in a){let O=a[I];for(let z in O){let $=O[z];for(let X in $)g($[X].object),delete $[X];delete O[z]}delete a[I]}}function E(I){if(a[I.id]===void 0)return;let O=a[I.id];for(let z in O){let $=O[z];for(let X in $)g($[X].object),delete $[X];delete O[z]}delete a[I.id]}function H(I){for(let O in a){let z=a[O];if(z[I.id]===void 0)continue;let $=z[I.id];for(let X in $)g($[X].object),delete $[X];delete z[I.id]}}function V(){Q(),h=!0,l!==c&&(l=c,f(l.object))}function Q(){c.geometry=null,c.program=null,c.wireframe=!1}return{setup:u,reset:V,resetDefaultState:Q,dispose:_,releaseStatesOfGeometry:E,releaseStatesOfProgram:H,initAttributes:v,enableAttribute:w,disableUnusedAttributes:T}}function xm(n,e,t,i){let s=i.isWebGL2,r;function o(h){r=h}function a(h,u){n.drawArrays(r,h,u),t.update(u,r,1)}function c(h,u,d){if(d===0)return;let f,g;if(s)f=n,g="drawArraysInstanced";else if(f=e.get("ANGLE_instanced_arrays"),g="drawArraysInstancedANGLE",f===null){console.error("THREE.WebGLBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}f[g](r,h,u,d),t.update(u,r,d)}function l(h,u,d){if(d===0)return;let f=e.get("WEBGL_multi_draw");if(f===null)for(let g=0;g<d;g++)this.render(h[g],u[g]);else{f.multiDrawArraysWEBGL(r,h,0,u,0,d);let g=0;for(let y=0;y<d;y++)g+=u[y];t.update(g,r,1)}}this.setMode=o,this.render=a,this.renderInstances=c,this.renderMultiDraw=l}function vm(n,e,t){let i;function s(){if(i!==void 0)return i;if(e.has("EXT_texture_filter_anisotropic")===!0){let R=e.get("EXT_texture_filter_anisotropic");i=n.getParameter(R.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else i=0;return i}function r(R){if(R==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";R="mediump"}return R==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let o=typeof WebGL2RenderingContext<"u"&&n.constructor.name==="WebGL2RenderingContext",a=t.precision!==void 0?t.precision:"highp",c=r(a);c!==a&&(console.warn("THREE.WebGLRenderer:",a,"not supported, using",c,"instead."),a=c);let l=o||e.has("WEBGL_draw_buffers"),h=t.logarithmicDepthBuffer===!0,u=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),d=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),f=n.getParameter(n.MAX_TEXTURE_SIZE),g=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),y=n.getParameter(n.MAX_VERTEX_ATTRIBS),m=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),p=n.getParameter(n.MAX_VARYING_VECTORS),S=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),v=d>0,w=o||e.has("OES_texture_float"),C=v&&w,T=o?n.getParameter(n.MAX_SAMPLES):0;return{isWebGL2:o,drawBuffers:l,getMaxAnisotropy:s,getMaxPrecision:r,precision:a,logarithmicDepthBuffer:h,maxTextures:u,maxVertexTextures:d,maxTextureSize:f,maxCubemapSize:g,maxAttributes:y,maxVertexUniforms:m,maxVaryings:p,maxFragmentUniforms:S,vertexTextures:v,floatFragmentTextures:w,floatVertexTextures:C,maxSamples:T}}function _m(n){let e=this,t=null,i=0,s=!1,r=!1,o=new Zt,a=new Ve,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(u,d){let f=u.length!==0||d||i!==0||s;return s=d,i=u.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(u,d){t=h(u,d,0)},this.setState=function(u,d,f){let g=u.clippingPlanes,y=u.clipIntersection,m=u.clipShadows,p=n.get(u);if(!s||g===null||g.length===0||r&&!m)r?h(null):l();else{let S=r?0:i,v=S*4,w=p.clippingState||null;c.value=w,w=h(g,d,v,f);for(let C=0;C!==v;++C)w[C]=t[C];p.clippingState=w,this.numIntersection=y?this.numPlanes:0,this.numPlanes+=S}};function l(){c.value!==t&&(c.value=t,c.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function h(u,d,f,g){let y=u!==null?u.length:0,m=null;if(y!==0){if(m=c.value,g!==!0||m===null){let p=f+y*4,S=d.matrixWorldInverse;a.getNormalMatrix(S),(m===null||m.length<p)&&(m=new Float32Array(p));for(let v=0,w=f;v!==y;++v,w+=4)o.copy(u[v]).applyMatrix4(S,a),o.normal.toArray(m,w),m[w+3]=o.constant}c.value=m,c.needsUpdate=!0}return e.numPlanes=y,e.numIntersection=0,m}}function bm(n){let e=new WeakMap;function t(o,a){return a===Ho?o.mapping=Un:a===Vo&&(o.mapping=Fn),o}function i(o){if(o&&o.isTexture){let a=o.mapping;if(a===Ho||a===Vo)if(e.has(o)){let c=e.get(o).texture;return t(c,o.mapping)}else{let c=o.image;if(c&&c.height>0){let l=new Ko(c.height/2);return l.fromEquirectangularTexture(n,o),e.set(o,l),o.addEventListener("dispose",s),t(l.texture,o.mapping)}else return null}}return o}function s(o){let a=o.target;a.removeEventListener("dispose",s);let c=e.get(a);c!==void 0&&(e.delete(a),c.dispose())}function r(){e=new WeakMap}return{get:i,dispose:r}}var Gn=class extends br{constructor(e=-1,t=1,i=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=i-e,o=i+e,a=s+t,c=s-t;if(this.view!==null&&this.view.enabled){let l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=l*this.view.offsetX,o=r+l*this.view.width,a-=h*this.view.offsetY,c=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,c,this.near,this.far,this.coordinateSystem),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}},In=4,dl=[.125,.215,.35,.446,.526,.582],Qi=20,Co=new Gn,pl=new me,Po=null,Lo=0,Io=0,Zi=(1+Math.sqrt(5))/2,An=1/Zi,fl=[new L(1,1,1),new L(-1,1,1),new L(1,1,-1),new L(-1,1,-1),new L(0,Zi,An),new L(0,Zi,-An),new L(An,0,Zi),new L(-An,0,Zi),new L(Zi,An,0),new L(-Zi,An,0)],wr=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._lodPlanes=[],this._sizeLods=[],this._sigmas=[],this._blurMaterial=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._compileMaterial(this._blurMaterial)}fromScene(e,t=0,i=.1,s=100){Po=this._renderer.getRenderTarget(),Lo=this._renderer.getActiveCubeFace(),Io=this._renderer.getActiveMipmapLevel(),this._setSize(256);let r=this._allocateTargets();return r.depthBuffer=!0,this._sceneToCubeUV(e,i,s,r),t>0&&this._blur(r,0,0,t),this._applyPMREM(r),this._cleanup(r),r}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=yl(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=gl(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose()}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodPlanes.length;e++)this._lodPlanes[e].dispose()}_cleanup(e){this._renderer.setRenderTarget(Po,Lo,Io),e.scissorTest=!1,Qs(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Un||e.mapping===Fn?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Po=this._renderer.getRenderTarget(),Lo=this._renderer.getActiveCubeFace(),Io=this._renderer.getActiveMipmapLevel();let i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:Lt,minFilter:Lt,generateMipmaps:!1,type:ds,format:Vt,colorSpace:mt,depthBuffer:!1},s=ml(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=ml(e,t,i);let{_lodMax:r}=this;({sizeLods:this._sizeLods,lodPlanes:this._lodPlanes,sigmas:this._sigmas}=Sm(r)),this._blurMaterial=wm(r,e,t)}return s}_compileMaterial(e){let t=new _t(this._lodPlanes[0],e);this._renderer.compile(t,Co)}_sceneToCubeUV(e,t,i,s){let a=new dt(90,1,t,i),c=[1,-1,1,1,1,1],l=[1,1,1,-1,-1,-1],h=this._renderer,u=h.autoClear,d=h.toneMapping;h.getClearColor(pl),h.toneMapping=Ii,h.autoClear=!1;let f=new oi({name:"PMREM.Background",side:It,depthWrite:!1,depthTest:!1}),g=new _t(new Oi,f),y=!1,m=e.background;m?m.isColor&&(f.color.copy(m),e.background=null,y=!0):(f.color.copy(pl),y=!0);for(let p=0;p<6;p++){let S=p%3;S===0?(a.up.set(0,c[p],0),a.lookAt(l[p],0,0)):S===1?(a.up.set(0,0,c[p]),a.lookAt(0,l[p],0)):(a.up.set(0,c[p],0),a.lookAt(0,0,l[p]));let v=this._cubeSize;Qs(s,S*v,p>2?v:0,v,v),h.setRenderTarget(s),y&&h.render(g,a),h.render(e,a)}g.geometry.dispose(),g.material.dispose(),h.toneMapping=d,h.autoClear=u,e.background=m}_textureToCubeUV(e,t){let i=this._renderer,s=e.mapping===Un||e.mapping===Fn;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=yl()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=gl());let r=s?this._cubemapMaterial:this._equirectMaterial,o=new _t(this._lodPlanes[0],r),a=r.uniforms;a.envMap.value=e;let c=this._cubeSize;Qs(t,0,0,3*c,2*c),i.setRenderTarget(t),i.render(o,Co)}_applyPMREM(e){let t=this._renderer,i=t.autoClear;t.autoClear=!1;for(let s=1;s<this._lodPlanes.length;s++){let r=Math.sqrt(this._sigmas[s]*this._sigmas[s]-this._sigmas[s-1]*this._sigmas[s-1]),o=fl[(s-1)%fl.length];this._blur(e,s-1,s,r,o)}t.autoClear=i}_blur(e,t,i,s,r){let o=this._pingPongRenderTarget;this._halfBlur(e,o,t,i,s,"latitudinal",r),this._halfBlur(o,e,i,i,s,"longitudinal",r)}_halfBlur(e,t,i,s,r,o,a){let c=this._renderer,l=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&console.error("blur direction must be either latitudinal or longitudinal!");let h=3,u=new _t(this._lodPlanes[s],l),d=l.uniforms,f=this._sizeLods[i]-1,g=isFinite(r)?Math.PI/(2*f):2*Math.PI/(2*Qi-1),y=r/g,m=isFinite(r)?1+Math.floor(h*y):Qi;m>Qi&&console.warn(`sigmaRadians, ${r}, is too large and will clip, as it requested ${m} samples when the maximum is set to ${Qi}`);let p=[],S=0;for(let R=0;R<Qi;++R){let W=R/y,_=Math.exp(-W*W/2);p.push(_),R===0?S+=_:R<m&&(S+=2*_)}for(let R=0;R<p.length;R++)p[R]=p[R]/S;d.envMap.value=e.texture,d.samples.value=m,d.weights.value=p,d.latitudinal.value=o==="latitudinal",a&&(d.poleAxis.value=a);let{_lodMax:v}=this;d.dTheta.value=g,d.mipInt.value=v-i;let w=this._sizeLods[s],C=3*w*(s>v-In?s-v+In:0),T=4*(this._cubeSize-w);Qs(t,C,T,3*w,2*w),c.setRenderTarget(t),c.render(u,Co)}};function Sm(n){let e=[],t=[],i=[],s=n,r=n-In+1+dl.length;for(let o=0;o<r;o++){let a=Math.pow(2,s);t.push(a);let c=1/a;o>n-In?c=dl[o-n+In-1]:o===0&&(c=0),i.push(c);let l=1/(a-2),h=-l,u=1+l,d=[h,h,u,h,u,u,h,h,u,u,h,u],f=6,g=6,y=3,m=2,p=1,S=new Float32Array(y*g*f),v=new Float32Array(m*g*f),w=new Float32Array(p*g*f);for(let T=0;T<f;T++){let R=T%3*2/3-1,W=T>2?0:-1,_=[R,W,0,R+2/3,W,0,R+2/3,W+1,0,R,W,0,R+2/3,W+1,0,R,W+1,0];S.set(_,y*g*T),v.set(d,m*g*T);let E=[T,T,T,T,T,T];w.set(E,p*g*T)}let C=new Mt;C.setAttribute("position",new ft(S,y)),C.setAttribute("uv",new ft(v,m)),C.setAttribute("faceIndex",new ft(w,p)),e.push(C),s>In&&s--}return{lodPlanes:e,sizeLods:t,sigmas:i}}function ml(n,e,t){let i=new xi(n,e,t);return i.texture.mapping=Hr,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Qs(n,e,t,i,s){n.viewport.set(e,t,i,s),n.scissor.set(e,t,i,s)}function wm(n,e,t){let i=new Float32Array(Qi),s=new L(0,1,0);return new vi({name:"SphericalGaussianBlur",defines:{n:Qi,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Aa(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Li,depthTest:!1,depthWrite:!1})}function gl(){return new vi({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Aa(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Li,depthTest:!1,depthWrite:!1})}function yl(){return new vi({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Aa(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Li,depthTest:!1,depthWrite:!1})}function Aa(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function Mm(n){let e=new WeakMap,t=null;function i(a){if(a&&a.isTexture){let c=a.mapping,l=c===Ho||c===Vo,h=c===Un||c===Fn;if(l||h)if(a.isRenderTargetTexture&&a.needsPMREMUpdate===!0){a.needsPMREMUpdate=!1;let u=e.get(a);return t===null&&(t=new wr(n)),u=l?t.fromEquirectangular(a,u):t.fromCubemap(a,u),e.set(a,u),u.texture}else{if(e.has(a))return e.get(a).texture;{let u=a.image;if(l&&u&&u.height>0||h&&u&&s(u)){t===null&&(t=new wr(n));let d=l?t.fromEquirectangular(a):t.fromCubemap(a);return e.set(a,d),a.addEventListener("dispose",r),d.texture}else return null}}}return a}function s(a){let c=0,l=6;for(let h=0;h<l;h++)a[h]!==void 0&&c++;return c===l}function r(a){let c=a.target;c.removeEventListener("dispose",r);let l=e.get(c);l!==void 0&&(e.delete(c),l.dispose())}function o(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:i,dispose:o}}function Tm(n){let e={};function t(i){if(e[i]!==void 0)return e[i];let s;switch(i){case"WEBGL_depth_texture":s=n.getExtension("WEBGL_depth_texture")||n.getExtension("MOZ_WEBGL_depth_texture")||n.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":s=n.getExtension("EXT_texture_filter_anisotropic")||n.getExtension("MOZ_EXT_texture_filter_anisotropic")||n.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":s=n.getExtension("WEBGL_compressed_texture_s3tc")||n.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":s=n.getExtension("WEBGL_compressed_texture_pvrtc")||n.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:s=n.getExtension(i)}return e[i]=s,s}return{has:function(i){return t(i)!==null},init:function(i){i.isWebGL2?(t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance")):(t("WEBGL_depth_texture"),t("OES_texture_float"),t("OES_texture_half_float"),t("OES_texture_half_float_linear"),t("OES_standard_derivatives"),t("OES_element_index_uint"),t("OES_vertex_array_object"),t("ANGLE_instanced_arrays")),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture")},get:function(i){let s=t(i);return s===null&&console.warn("THREE.WebGLRenderer: "+i+" extension not supported."),s}}}function Em(n,e,t,i){let s={},r=new WeakMap;function o(u){let d=u.target;d.index!==null&&e.remove(d.index);for(let g in d.attributes)e.remove(d.attributes[g]);for(let g in d.morphAttributes){let y=d.morphAttributes[g];for(let m=0,p=y.length;m<p;m++)e.remove(y[m])}d.removeEventListener("dispose",o),delete s[d.id];let f=r.get(d);f&&(e.remove(f),r.delete(d)),i.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}function a(u,d){return s[d.id]===!0||(d.addEventListener("dispose",o),s[d.id]=!0,t.memory.geometries++),d}function c(u){let d=u.attributes;for(let g in d)e.update(d[g],n.ARRAY_BUFFER);let f=u.morphAttributes;for(let g in f){let y=f[g];for(let m=0,p=y.length;m<p;m++)e.update(y[m],n.ARRAY_BUFFER)}}function l(u){let d=[],f=u.index,g=u.attributes.position,y=0;if(f!==null){let S=f.array;y=f.version;for(let v=0,w=S.length;v<w;v+=3){let C=S[v+0],T=S[v+1],R=S[v+2];d.push(C,T,T,R,R,C)}}else if(g!==void 0){let S=g.array;y=g.version;for(let v=0,w=S.length/3-1;v<w;v+=3){let C=v+0,T=v+1,R=v+2;d.push(C,T,T,R,R,C)}}else return;let m=new(ph(d)?_r:vr)(d,1);m.version=y;let p=r.get(u);p&&e.remove(p),r.set(u,m)}function h(u){let d=r.get(u);if(d){let f=u.index;f!==null&&d.version<f.version&&l(u)}else l(u);return r.get(u)}return{get:a,update:c,getWireframeAttribute:h}}function Am(n,e,t,i){let s=i.isWebGL2,r;function o(f){r=f}let a,c;function l(f){a=f.type,c=f.bytesPerElement}function h(f,g){n.drawElements(r,g,a,f*c),t.update(g,r,1)}function u(f,g,y){if(y===0)return;let m,p;if(s)m=n,p="drawElementsInstanced";else if(m=e.get("ANGLE_instanced_arrays"),p="drawElementsInstancedANGLE",m===null){console.error("THREE.WebGLIndexedBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}m[p](r,g,a,f*c,y),t.update(g,r,y)}function d(f,g,y){if(y===0)return;let m=e.get("WEBGL_multi_draw");if(m===null)for(let p=0;p<y;p++)this.render(f[p]/c,g[p]);else{m.multiDrawElementsWEBGL(r,g,0,a,f,0,y);let p=0;for(let S=0;S<y;S++)p+=g[S];t.update(p,r,1)}}this.setMode=o,this.setIndex=l,this.render=h,this.renderInstances=u,this.renderMultiDraw=d}function Rm(n){let e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(r,o,a){switch(t.calls++,o){case n.TRIANGLES:t.triangles+=a*(r/3);break;case n.LINES:t.lines+=a*(r/2);break;case n.LINE_STRIP:t.lines+=a*(r-1);break;case n.LINE_LOOP:t.lines+=a*r;break;case n.POINTS:t.points+=a*r;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",o);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:i}}function Cm(n,e){return n[0]-e[0]}function Pm(n,e){return Math.abs(e[1])-Math.abs(n[1])}function Lm(n,e,t){let i={},s=new Float32Array(8),r=new WeakMap,o=new Qe,a=[];for(let l=0;l<8;l++)a[l]=[l,0];function c(l,h,u){let d=l.morphTargetInfluences;if(e.isWebGL2===!0){let g=h.morphAttributes.position||h.morphAttributes.normal||h.morphAttributes.color,y=g!==void 0?g.length:0,m=r.get(h);if(m===void 0||m.count!==y){let O=function(){Q.dispose(),r.delete(h),h.removeEventListener("dispose",O)};var f=O;m!==void 0&&m.texture.dispose();let v=h.morphAttributes.position!==void 0,w=h.morphAttributes.normal!==void 0,C=h.morphAttributes.color!==void 0,T=h.morphAttributes.position||[],R=h.morphAttributes.normal||[],W=h.morphAttributes.color||[],_=0;v===!0&&(_=1),w===!0&&(_=2),C===!0&&(_=3);let E=h.attributes.position.count*_,H=1;E>e.maxTextureSize&&(H=Math.ceil(E/e.maxTextureSize),E=e.maxTextureSize);let V=new Float32Array(E*H*4*y),Q=new gr(V,E,H,y);Q.type=gi,Q.needsUpdate=!0;let I=_*4;for(let z=0;z<y;z++){let $=T[z],X=R[z],q=W[z],Y=E*H*4*z;for(let se=0;se<$.count;se++){let re=se*I;v===!0&&(o.fromBufferAttribute($,se),V[Y+re+0]=o.x,V[Y+re+1]=o.y,V[Y+re+2]=o.z,V[Y+re+3]=0),w===!0&&(o.fromBufferAttribute(X,se),V[Y+re+4]=o.x,V[Y+re+5]=o.y,V[Y+re+6]=o.z,V[Y+re+7]=0),C===!0&&(o.fromBufferAttribute(q,se),V[Y+re+8]=o.x,V[Y+re+9]=o.y,V[Y+re+10]=o.z,V[Y+re+11]=q.itemSize===4?o.w:1)}}m={count:y,texture:Q,size:new Ee(E,H)},r.set(h,m),h.addEventListener("dispose",O)}let p=0;for(let v=0;v<d.length;v++)p+=d[v];let S=h.morphTargetsRelative?1:1-p;u.getUniforms().setValue(n,"morphTargetBaseInfluence",S),u.getUniforms().setValue(n,"morphTargetInfluences",d),u.getUniforms().setValue(n,"morphTargetsTexture",m.texture,t),u.getUniforms().setValue(n,"morphTargetsTextureSize",m.size)}else{let g=d===void 0?0:d.length,y=i[h.id];if(y===void 0||y.length!==g){y=[];for(let w=0;w<g;w++)y[w]=[w,0];i[h.id]=y}for(let w=0;w<g;w++){let C=y[w];C[0]=w,C[1]=d[w]}y.sort(Pm);for(let w=0;w<8;w++)w<g&&y[w][1]?(a[w][0]=y[w][0],a[w][1]=y[w][1]):(a[w][0]=Number.MAX_SAFE_INTEGER,a[w][1]=0);a.sort(Cm);let m=h.morphAttributes.position,p=h.morphAttributes.normal,S=0;for(let w=0;w<8;w++){let C=a[w],T=C[0],R=C[1];T!==Number.MAX_SAFE_INTEGER&&R?(m&&h.getAttribute("morphTarget"+w)!==m[T]&&h.setAttribute("morphTarget"+w,m[T]),p&&h.getAttribute("morphNormal"+w)!==p[T]&&h.setAttribute("morphNormal"+w,p[T]),s[w]=R,S+=R):(m&&h.hasAttribute("morphTarget"+w)===!0&&h.deleteAttribute("morphTarget"+w),p&&h.hasAttribute("morphNormal"+w)===!0&&h.deleteAttribute("morphNormal"+w),s[w]=0)}let v=h.morphTargetsRelative?1:1-S;u.getUniforms().setValue(n,"morphTargetBaseInfluence",v),u.getUniforms().setValue(n,"morphTargetInfluences",s)}}return{update:c}}function Im(n,e,t,i){let s=new WeakMap;function r(c){let l=i.render.frame,h=c.geometry,u=e.get(c,h);if(s.get(u)!==l&&(e.update(u),s.set(u,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",a)===!1&&c.addEventListener("dispose",a),s.get(c)!==l&&(t.update(c.instanceMatrix,n.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,n.ARRAY_BUFFER),s.set(c,l))),c.isSkinnedMesh){let d=c.skeleton;s.get(d)!==l&&(d.update(),s.set(d,l))}return u}function o(){s=new WeakMap}function a(c){let l=c.target;l.removeEventListener("dispose",a),t.remove(l.instanceMatrix),l.instanceColor!==null&&t.remove(l.instanceColor)}return{update:r,dispose:o}}var Mr=class extends Rt{constructor(e,t,i,s,r,o,a,c,l,h){if(h=h!==void 0?h:tn,h!==tn&&h!==Bn)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");i===void 0&&h===tn&&(i=Ci),i===void 0&&h===Bn&&(i=en),super(null,s,r,o,a,c,h,i,l),this.isDepthTexture=!0,this.image={width:e,height:t},this.magFilter=a!==void 0?a:pt,this.minFilter=c!==void 0?c:pt,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},yh=new Rt,xh=new Mr(1,1);xh.compareFunction=dh;var vh=new gr,_h=new $o,bh=new Sr,xl=[],vl=[],_l=new Float32Array(16),bl=new Float32Array(9),Sl=new Float32Array(4);function jn(n,e,t){let i=n[0];if(i<=0||i>0)return n;let s=e*t,r=xl[s];if(r===void 0&&(r=new Float32Array(s),xl[s]=r),e!==0){i.toArray(r,0);for(let o=1,a=0;o!==e;++o)a+=t,n[o].toArray(r,a)}return r}function gt(n,e){if(n.length!==e.length)return!1;for(let t=0,i=n.length;t<i;t++)if(n[t]!==e[t])return!1;return!0}function yt(n,e){for(let t=0,i=e.length;t<i;t++)n[t]=e[t]}function Xr(n,e){let t=vl[e];t===void 0&&(t=new Int32Array(e),vl[e]=t);for(let i=0;i!==e;++i)t[i]=n.allocateTextureUnit();return t}function km(n,e){let t=this.cache;t[0]!==e&&(n.uniform1f(this.addr,e),t[0]=e)}function Nm(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(gt(t,e))return;n.uniform2fv(this.addr,e),yt(t,e)}}function Dm(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(n.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(gt(t,e))return;n.uniform3fv(this.addr,e),yt(t,e)}}function Om(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(gt(t,e))return;n.uniform4fv(this.addr,e),yt(t,e)}}function Um(n,e){let t=this.cache,i=e.elements;if(i===void 0){if(gt(t,e))return;n.uniformMatrix2fv(this.addr,!1,e),yt(t,e)}else{if(gt(t,i))return;Sl.set(i),n.uniformMatrix2fv(this.addr,!1,Sl),yt(t,i)}}function Fm(n,e){let t=this.cache,i=e.elements;if(i===void 0){if(gt(t,e))return;n.uniformMatrix3fv(this.addr,!1,e),yt(t,e)}else{if(gt(t,i))return;bl.set(i),n.uniformMatrix3fv(this.addr,!1,bl),yt(t,i)}}function Bm(n,e){let t=this.cache,i=e.elements;if(i===void 0){if(gt(t,e))return;n.uniformMatrix4fv(this.addr,!1,e),yt(t,e)}else{if(gt(t,i))return;_l.set(i),n.uniformMatrix4fv(this.addr,!1,_l),yt(t,i)}}function zm(n,e){let t=this.cache;t[0]!==e&&(n.uniform1i(this.addr,e),t[0]=e)}function Hm(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(gt(t,e))return;n.uniform2iv(this.addr,e),yt(t,e)}}function Vm(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(gt(t,e))return;n.uniform3iv(this.addr,e),yt(t,e)}}function Gm(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(gt(t,e))return;n.uniform4iv(this.addr,e),yt(t,e)}}function Wm(n,e){let t=this.cache;t[0]!==e&&(n.uniform1ui(this.addr,e),t[0]=e)}function Xm(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(gt(t,e))return;n.uniform2uiv(this.addr,e),yt(t,e)}}function qm(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(gt(t,e))return;n.uniform3uiv(this.addr,e),yt(t,e)}}function $m(n,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(gt(t,e))return;n.uniform4uiv(this.addr,e),yt(t,e)}}function Ym(n,e,t){let i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s);let r=this.type===n.SAMPLER_2D_SHADOW?xh:yh;t.setTexture2D(e||r,s)}function Km(n,e,t){let i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTexture3D(e||_h,s)}function jm(n,e,t){let i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTextureCube(e||bh,s)}function Zm(n,e,t){let i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTexture2DArray(e||vh,s)}function Jm(n){switch(n){case 5126:return km;case 35664:return Nm;case 35665:return Dm;case 35666:return Om;case 35674:return Um;case 35675:return Fm;case 35676:return Bm;case 5124:case 35670:return zm;case 35667:case 35671:return Hm;case 35668:case 35672:return Vm;case 35669:case 35673:return Gm;case 5125:return Wm;case 36294:return Xm;case 36295:return qm;case 36296:return $m;case 35678:case 36198:case 36298:case 36306:case 35682:return Ym;case 35679:case 36299:case 36307:return Km;case 35680:case 36300:case 36308:case 36293:return jm;case 36289:case 36303:case 36311:case 36292:return Zm}}function Qm(n,e){n.uniform1fv(this.addr,e)}function eg(n,e){let t=jn(e,this.size,2);n.uniform2fv(this.addr,t)}function tg(n,e){let t=jn(e,this.size,3);n.uniform3fv(this.addr,t)}function ig(n,e){let t=jn(e,this.size,4);n.uniform4fv(this.addr,t)}function ng(n,e){let t=jn(e,this.size,4);n.uniformMatrix2fv(this.addr,!1,t)}function sg(n,e){let t=jn(e,this.size,9);n.uniformMatrix3fv(this.addr,!1,t)}function rg(n,e){let t=jn(e,this.size,16);n.uniformMatrix4fv(this.addr,!1,t)}function og(n,e){n.uniform1iv(this.addr,e)}function ag(n,e){n.uniform2iv(this.addr,e)}function cg(n,e){n.uniform3iv(this.addr,e)}function lg(n,e){n.uniform4iv(this.addr,e)}function hg(n,e){n.uniform1uiv(this.addr,e)}function ug(n,e){n.uniform2uiv(this.addr,e)}function dg(n,e){n.uniform3uiv(this.addr,e)}function pg(n,e){n.uniform4uiv(this.addr,e)}function fg(n,e,t){let i=this.cache,s=e.length,r=Xr(t,s);gt(i,r)||(n.uniform1iv(this.addr,r),yt(i,r));for(let o=0;o!==s;++o)t.setTexture2D(e[o]||yh,r[o])}function mg(n,e,t){let i=this.cache,s=e.length,r=Xr(t,s);gt(i,r)||(n.uniform1iv(this.addr,r),yt(i,r));for(let o=0;o!==s;++o)t.setTexture3D(e[o]||_h,r[o])}function gg(n,e,t){let i=this.cache,s=e.length,r=Xr(t,s);gt(i,r)||(n.uniform1iv(this.addr,r),yt(i,r));for(let o=0;o!==s;++o)t.setTextureCube(e[o]||bh,r[o])}function yg(n,e,t){let i=this.cache,s=e.length,r=Xr(t,s);gt(i,r)||(n.uniform1iv(this.addr,r),yt(i,r));for(let o=0;o!==s;++o)t.setTexture2DArray(e[o]||vh,r[o])}function xg(n){switch(n){case 5126:return Qm;case 35664:return eg;case 35665:return tg;case 35666:return ig;case 35674:return ng;case 35675:return sg;case 35676:return rg;case 5124:case 35670:return og;case 35667:case 35671:return ag;case 35668:case 35672:return cg;case 35669:case 35673:return lg;case 5125:return hg;case 36294:return ug;case 36295:return dg;case 36296:return pg;case 35678:case 36198:case 36298:case 36306:case 35682:return fg;case 35679:case 36299:case 36307:return mg;case 35680:case 36300:case 36308:case 36293:return gg;case 36289:case 36303:case 36311:case 36292:return yg}}var jo=class{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=Jm(t.type)}},Zo=class{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=xg(t.type)}},Jo=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){let s=this.seq;for(let r=0,o=s.length;r!==o;++r){let a=s[r];a.setValue(e,t[a.id],i)}}},ko=/(\w+)(\])?(\[|\.)?/g;function wl(n,e){n.seq.push(e),n.map[e.id]=e}function vg(n,e,t){let i=n.name,s=i.length;for(ko.lastIndex=0;;){let r=ko.exec(i),o=ko.lastIndex,a=r[1],c=r[2]==="]",l=r[3];if(c&&(a=a|0),l===void 0||l==="["&&o+2===s){wl(t,l===void 0?new jo(a,n,e):new Zo(a,n,e));break}else{let u=t.map[a];u===void 0&&(u=new Jo(a),wl(t,u)),t=u}}}var On=class{constructor(e,t){this.seq=[],this.map={};let i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let s=0;s<i;++s){let r=e.getActiveUniform(t,s),o=e.getUniformLocation(t,r.name);vg(r,o,this)}}setValue(e,t,i,s){let r=this.map[t];r!==void 0&&r.setValue(e,i,s)}setOptional(e,t,i){let s=t[i];s!==void 0&&this.setValue(e,i,s)}static upload(e,t,i,s){for(let r=0,o=t.length;r!==o;++r){let a=t[r],c=i[a.id];c.needsUpdate!==!1&&a.setValue(e,c.value,s)}}static seqWithValue(e,t){let i=[];for(let s=0,r=e.length;s!==r;++s){let o=e[s];o.id in t&&i.push(o)}return i}};function Ml(n,e,t){let i=n.createShader(e);return n.shaderSource(i,t),n.compileShader(i),i}var _g=37297,bg=0;function Sg(n,e){let t=n.split(`
`),i=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let o=s;o<r;o++){let a=o+1;i.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return i.join(`
`)}function wg(n){let e=je.getPrimaries(je.workingColorSpace),t=je.getPrimaries(n),i;switch(e===t?i="":e===ur&&t===hr?i="LinearDisplayP3ToLinearSRGB":e===hr&&t===ur&&(i="LinearSRGBToLinearDisplayP3"),n){case mt:case Gr:return[i,"LinearTransferOETF"];case st:case Ta:return[i,"sRGBTransferOETF"];default:return console.warn("THREE.WebGLProgram: Unsupported color space:",n),[i,"LinearTransferOETF"]}}function Tl(n,e,t){let i=n.getShaderParameter(e,n.COMPILE_STATUS),s=n.getShaderInfoLog(e).trim();if(i&&s==="")return"";let r=/ERROR: 0:(\d+)/.exec(s);if(r){let o=parseInt(r[1]);return t.toUpperCase()+`

`+s+`

`+Sg(n.getShaderSource(e),o)}else return s}function Mg(n,e){let t=wg(e);return`vec4 ${n}( vec4 value ) { return ${t[0]}( ${t[1]}( value ) ); }`}function Tg(n,e){let t;switch(e){case Au:t="Linear";break;case Ru:t="Reinhard";break;case Cu:t="OptimizedCineon";break;case Pu:t="ACESFilmic";break;case Iu:t="AgX";break;case Lu:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+n+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}function Eg(n){return[n.extensionDerivatives||n.envMapCubeUVHeight||n.bumpMap||n.normalMapTangentSpace||n.clearcoatNormalMap||n.flatShading||n.shaderID==="physical"?"#extension GL_OES_standard_derivatives : enable":"",(n.extensionFragDepth||n.logarithmicDepthBuffer)&&n.rendererExtensionFragDepth?"#extension GL_EXT_frag_depth : enable":"",n.extensionDrawBuffers&&n.rendererExtensionDrawBuffers?"#extension GL_EXT_draw_buffers : require":"",(n.extensionShaderTextureLOD||n.envMap||n.transmission)&&n.rendererExtensionShaderTextureLod?"#extension GL_EXT_shader_texture_lod : enable":""].filter(kn).join(`
`)}function Ag(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":""].filter(kn).join(`
`)}function Rg(n){let e=[];for(let t in n){let i=n[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function Cg(n,e){let t={},i=n.getProgramParameter(e,n.ACTIVE_ATTRIBUTES);for(let s=0;s<i;s++){let r=n.getActiveAttrib(e,s),o=r.name,a=1;r.type===n.FLOAT_MAT2&&(a=2),r.type===n.FLOAT_MAT3&&(a=3),r.type===n.FLOAT_MAT4&&(a=4),t[o]={type:r.type,location:n.getAttribLocation(e,o),locationSize:a}}return t}function kn(n){return n!==""}function El(n,e){let t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Al(n,e){return n.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var Pg=/^[ \t]*#include +<([\w\d./]+)>/gm;function Qo(n){return n.replace(Pg,Ig)}var Lg=new Map([["encodings_fragment","colorspace_fragment"],["encodings_pars_fragment","colorspace_pars_fragment"],["output_fragment","opaque_fragment"]]);function Ig(n,e){let t=Fe[e];if(t===void 0){let i=Lg.get(e);if(i!==void 0)t=Fe[i],console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("Can not resolve #include <"+e+">")}return Qo(t)}var kg=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Rl(n){return n.replace(kg,Ng)}function Ng(n,e,t,i){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=i.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function Cl(n){let e="precision "+n.precision+` float;
precision `+n.precision+" int;";return n.precision==="highp"?e+=`
#define HIGH_PRECISION`:n.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function Dg(n){let e="SHADOWMAP_TYPE_BASIC";return n.shadowMapType===Ql?e="SHADOWMAP_TYPE_PCF":n.shadowMapType===tu?e="SHADOWMAP_TYPE_PCF_SOFT":n.shadowMapType===mi&&(e="SHADOWMAP_TYPE_VSM"),e}function Og(n){let e="ENVMAP_TYPE_CUBE";if(n.envMap)switch(n.envMapMode){case Un:case Fn:e="ENVMAP_TYPE_CUBE";break;case Hr:e="ENVMAP_TYPE_CUBE_UV";break}return e}function Ug(n){let e="ENVMAP_MODE_REFLECTION";return n.envMap&&n.envMapMode===Fn&&(e="ENVMAP_MODE_REFRACTION"),e}function Fg(n){let e="ENVMAP_BLENDING_NONE";if(n.envMap)switch(n.combine){case eh:e="ENVMAP_BLENDING_MULTIPLY";break;case Tu:e="ENVMAP_BLENDING_MIX";break;case Eu:e="ENVMAP_BLENDING_ADD";break}return e}function Bg(n){let e=n.envMapCubeUVHeight;if(e===null)return null;let t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:i,maxMip:t}}function zg(n,e,t,i){let s=n.getContext(),r=t.defines,o=t.vertexShader,a=t.fragmentShader,c=Dg(t),l=Og(t),h=Ug(t),u=Fg(t),d=Bg(t),f=t.isWebGL2?"":Eg(t),g=Ag(t),y=Rg(r),m=s.createProgram(),p,S,v=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,y].filter(kn).join(`
`),p.length>0&&(p+=`
`),S=[f,"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,y].filter(kn).join(`
`),S.length>0&&(S+=`
`)):(p=[Cl(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,y,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors&&t.isWebGL2?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0&&t.isWebGL2?"#define MORPHTARGETS_TEXTURE":"",t.morphTargetsCount>0&&t.isWebGL2?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0&&t.isWebGL2?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.useLegacyLights?"#define LEGACY_LIGHTS":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.logarithmicDepthBuffer&&t.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#if ( defined( USE_MORPHTARGETS ) && ! defined( MORPHTARGETS_TEXTURE ) )","	attribute vec3 morphTarget0;","	attribute vec3 morphTarget1;","	attribute vec3 morphTarget2;","	attribute vec3 morphTarget3;","	#ifdef USE_MORPHNORMALS","		attribute vec3 morphNormal0;","		attribute vec3 morphNormal1;","		attribute vec3 morphNormal2;","		attribute vec3 morphNormal3;","	#else","		attribute vec3 morphTarget4;","		attribute vec3 morphTarget5;","		attribute vec3 morphTarget6;","		attribute vec3 morphTarget7;","	#endif","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(kn).join(`
`),S=[f,Cl(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,y,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+h:"",t.envMap?"#define "+u:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.useLegacyLights?"#define LEGACY_LIGHTS":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.logarithmicDepthBuffer&&t.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Ii?"#define TONE_MAPPING":"",t.toneMapping!==Ii?Fe.tonemapping_pars_fragment:"",t.toneMapping!==Ii?Tg("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Fe.colorspace_pars_fragment,Mg("linearToOutputTexel",t.outputColorSpace),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(kn).join(`
`)),o=Qo(o),o=El(o,t),o=Al(o,t),a=Qo(a),a=El(a,t),a=Al(a,t),o=Rl(o),a=Rl(a),t.isWebGL2&&t.isRawShaderMaterial!==!0&&(v=`#version 300 es
`,p=[g,"precision mediump sampler2DArray;","#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,S=["precision mediump sampler2DArray;","#define varying in",t.glslVersion===Yc?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Yc?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+S);let w=v+p+o,C=v+S+a,T=Ml(s,s.VERTEX_SHADER,w),R=Ml(s,s.FRAGMENT_SHADER,C);s.attachShader(m,T),s.attachShader(m,R),t.index0AttributeName!==void 0?s.bindAttribLocation(m,0,t.index0AttributeName):t.morphTargets===!0&&s.bindAttribLocation(m,0,"position"),s.linkProgram(m);function W(V){if(n.debug.checkShaderErrors){let Q=s.getProgramInfoLog(m).trim(),I=s.getShaderInfoLog(T).trim(),O=s.getShaderInfoLog(R).trim(),z=!0,$=!0;if(s.getProgramParameter(m,s.LINK_STATUS)===!1)if(z=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(s,m,T,R);else{let X=Tl(s,T,"vertex"),q=Tl(s,R,"fragment");console.error("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(m,s.VALIDATE_STATUS)+`

Program Info Log: `+Q+`
`+X+`
`+q)}else Q!==""?console.warn("THREE.WebGLProgram: Program Info Log:",Q):(I===""||O==="")&&($=!1);$&&(V.diagnostics={runnable:z,programLog:Q,vertexShader:{log:I,prefix:p},fragmentShader:{log:O,prefix:S}})}s.deleteShader(T),s.deleteShader(R),_=new On(s,m),E=Cg(s,m)}let _;this.getUniforms=function(){return _===void 0&&W(this),_};let E;this.getAttributes=function(){return E===void 0&&W(this),E};let H=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return H===!1&&(H=s.getProgramParameter(m,_g)),H},this.destroy=function(){i.releaseStatesOfProgram(this),s.deleteProgram(m),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=bg++,this.cacheKey=e,this.usedTimes=1,this.program=m,this.vertexShader=T,this.fragmentShader=R,this}var Hg=0,ea=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){let t=e.vertexShader,i=e.fragmentShader,s=this._getShaderStage(t),r=this._getShaderStage(i),o=this._getShaderCacheForMaterial(e);return o.has(s)===!1&&(o.add(s),s.usedTimes++),o.has(r)===!1&&(o.add(r),r.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){let t=this.shaderCache,i=t.get(e);return i===void 0&&(i=new ta(e),t.set(e,i)),i}},ta=class{constructor(e){this.id=Hg++,this.code=e,this.usedTimes=0}};function Vg(n,e,t,i,s,r,o){let a=new xr,c=new ea,l=[],h=s.isWebGL2,u=s.logarithmicDepthBuffer,d=s.vertexTextures,f=s.precision,g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function y(_){return _===0?"uv":`uv${_}`}function m(_,E,H,V,Q){let I=V.fog,O=Q.geometry,z=_.isMeshStandardMaterial?V.environment:null,$=(_.isMeshStandardMaterial?t:e).get(_.envMap||z),X=$&&$.mapping===Hr?$.image.height:null,q=g[_.type];_.precision!==null&&(f=s.getMaxPrecision(_.precision),f!==_.precision&&console.warn("THREE.WebGLProgram.getParameters:",_.precision,"not supported, using",f,"instead."));let Y=O.morphAttributes.position||O.morphAttributes.normal||O.morphAttributes.color,se=Y!==void 0?Y.length:0,re=0;O.morphAttributes.position!==void 0&&(re=1),O.morphAttributes.normal!==void 0&&(re=2),O.morphAttributes.color!==void 0&&(re=3);let G,K,le,ve;if(q){let ct=ii[q];G=ct.vertexShader,K=ct.fragmentShader}else G=_.vertexShader,K=_.fragmentShader,c.update(_),le=c.getVertexShaderID(_),ve=c.getFragmentShaderID(_);let ye=n.getRenderTarget(),Ie=Q.isInstancedMesh===!0,ke=Q.isBatchedMesh===!0,Te=!!_.map,We=!!_.matcap,D=!!$,bt=!!_.aoMap,Se=!!_.lightMap,Ce=!!_.bumpMap,fe=!!_.normalMap,et=!!_.displacementMap,De=!!_.emissiveMap,M=!!_.metalnessMap,x=!!_.roughnessMap,N=_.anisotropy>0,ee=_.clearcoat>0,Z=_.iridescence>0,te=_.sheen>0,ge=_.transmission>0,ce=N&&!!_.anisotropyMap,pe=ee&&!!_.clearcoatMap,Me=ee&&!!_.clearcoatNormalMap,Oe=ee&&!!_.clearcoatRoughnessMap,j=Z&&!!_.iridescenceMap,Ke=Z&&!!_.iridescenceThicknessMap,Be=te&&!!_.sheenColorMap,Pe=te&&!!_.sheenRoughnessMap,be=!!_.specularMap,he=!!_.specularColorMap,A=!!_.specularIntensityMap,ie=ge&&!!_.transmissionMap,xe=ge&&!!_.thicknessMap,de=!!_.gradientMap,J=!!_.alphaMap,P=_.alphaTest>0,ne=!!_.alphaHash,ae=!!_.extensions,Ae=!!O.attributes.uv1,we=!!O.attributes.uv2,Xe=!!O.attributes.uv3,qe=Ii;return _.toneMapped&&(ye===null||ye.isXRRenderTarget===!0)&&(qe=n.toneMapping),{isWebGL2:h,shaderID:q,shaderType:_.type,shaderName:_.name,vertexShader:G,fragmentShader:K,defines:_.defines,customVertexShaderID:le,customFragmentShaderID:ve,isRawShaderMaterial:_.isRawShaderMaterial===!0,glslVersion:_.glslVersion,precision:f,batching:ke,instancing:Ie,instancingColor:Ie&&Q.instanceColor!==null,supportsVertexTextures:d,outputColorSpace:ye===null?n.outputColorSpace:ye.isXRRenderTarget===!0?ye.texture.colorSpace:mt,map:Te,matcap:We,envMap:D,envMapMode:D&&$.mapping,envMapCubeUVHeight:X,aoMap:bt,lightMap:Se,bumpMap:Ce,normalMap:fe,displacementMap:d&&et,emissiveMap:De,normalMapObjectSpace:fe&&_.normalMapType===qu,normalMapTangentSpace:fe&&_.normalMapType===uh,metalnessMap:M,roughnessMap:x,anisotropy:N,anisotropyMap:ce,clearcoat:ee,clearcoatMap:pe,clearcoatNormalMap:Me,clearcoatRoughnessMap:Oe,iridescence:Z,iridescenceMap:j,iridescenceThicknessMap:Ke,sheen:te,sheenColorMap:Be,sheenRoughnessMap:Pe,specularMap:be,specularColorMap:he,specularIntensityMap:A,transmission:ge,transmissionMap:ie,thicknessMap:xe,gradientMap:de,opaque:_.transparent===!1&&_.blending===Nn,alphaMap:J,alphaTest:P,alphaHash:ne,combine:_.combine,mapUv:Te&&y(_.map.channel),aoMapUv:bt&&y(_.aoMap.channel),lightMapUv:Se&&y(_.lightMap.channel),bumpMapUv:Ce&&y(_.bumpMap.channel),normalMapUv:fe&&y(_.normalMap.channel),displacementMapUv:et&&y(_.displacementMap.channel),emissiveMapUv:De&&y(_.emissiveMap.channel),metalnessMapUv:M&&y(_.metalnessMap.channel),roughnessMapUv:x&&y(_.roughnessMap.channel),anisotropyMapUv:ce&&y(_.anisotropyMap.channel),clearcoatMapUv:pe&&y(_.clearcoatMap.channel),clearcoatNormalMapUv:Me&&y(_.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Oe&&y(_.clearcoatRoughnessMap.channel),iridescenceMapUv:j&&y(_.iridescenceMap.channel),iridescenceThicknessMapUv:Ke&&y(_.iridescenceThicknessMap.channel),sheenColorMapUv:Be&&y(_.sheenColorMap.channel),sheenRoughnessMapUv:Pe&&y(_.sheenRoughnessMap.channel),specularMapUv:be&&y(_.specularMap.channel),specularColorMapUv:he&&y(_.specularColorMap.channel),specularIntensityMapUv:A&&y(_.specularIntensityMap.channel),transmissionMapUv:ie&&y(_.transmissionMap.channel),thicknessMapUv:xe&&y(_.thicknessMap.channel),alphaMapUv:J&&y(_.alphaMap.channel),vertexTangents:!!O.attributes.tangent&&(fe||N),vertexColors:_.vertexColors,vertexAlphas:_.vertexColors===!0&&!!O.attributes.color&&O.attributes.color.itemSize===4,vertexUv1s:Ae,vertexUv2s:we,vertexUv3s:Xe,pointsUvs:Q.isPoints===!0&&!!O.attributes.uv&&(Te||J),fog:!!I,useFog:_.fog===!0,fogExp2:I&&I.isFogExp2,flatShading:_.flatShading===!0,sizeAttenuation:_.sizeAttenuation===!0,logarithmicDepthBuffer:u,skinning:Q.isSkinnedMesh===!0,morphTargets:O.morphAttributes.position!==void 0,morphNormals:O.morphAttributes.normal!==void 0,morphColors:O.morphAttributes.color!==void 0,morphTargetsCount:se,morphTextureStride:re,numDirLights:E.directional.length,numPointLights:E.point.length,numSpotLights:E.spot.length,numSpotLightMaps:E.spotLightMap.length,numRectAreaLights:E.rectArea.length,numHemiLights:E.hemi.length,numDirLightShadows:E.directionalShadowMap.length,numPointLightShadows:E.pointShadowMap.length,numSpotLightShadows:E.spotShadowMap.length,numSpotLightShadowsWithMaps:E.numSpotLightShadowsWithMaps,numLightProbes:E.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:_.dithering,shadowMapEnabled:n.shadowMap.enabled&&H.length>0,shadowMapType:n.shadowMap.type,toneMapping:qe,useLegacyLights:n._useLegacyLights,decodeVideoTexture:Te&&_.map.isVideoTexture===!0&&je.getTransfer(_.map.colorSpace)===tt,premultipliedAlpha:_.premultipliedAlpha,doubleSided:_.side===Jt,flipSided:_.side===It,useDepthPacking:_.depthPacking>=0,depthPacking:_.depthPacking||0,index0AttributeName:_.index0AttributeName,extensionDerivatives:ae&&_.extensions.derivatives===!0,extensionFragDepth:ae&&_.extensions.fragDepth===!0,extensionDrawBuffers:ae&&_.extensions.drawBuffers===!0,extensionShaderTextureLOD:ae&&_.extensions.shaderTextureLOD===!0,extensionClipCullDistance:ae&&_.extensions.clipCullDistance&&i.has("WEBGL_clip_cull_distance"),rendererExtensionFragDepth:h||i.has("EXT_frag_depth"),rendererExtensionDrawBuffers:h||i.has("WEBGL_draw_buffers"),rendererExtensionShaderTextureLod:h||i.has("EXT_shader_texture_lod"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:_.customProgramCacheKey()}}function p(_){let E=[];if(_.shaderID?E.push(_.shaderID):(E.push(_.customVertexShaderID),E.push(_.customFragmentShaderID)),_.defines!==void 0)for(let H in _.defines)E.push(H),E.push(_.defines[H]);return _.isRawShaderMaterial===!1&&(S(E,_),v(E,_),E.push(n.outputColorSpace)),E.push(_.customProgramCacheKey),E.join()}function S(_,E){_.push(E.precision),_.push(E.outputColorSpace),_.push(E.envMapMode),_.push(E.envMapCubeUVHeight),_.push(E.mapUv),_.push(E.alphaMapUv),_.push(E.lightMapUv),_.push(E.aoMapUv),_.push(E.bumpMapUv),_.push(E.normalMapUv),_.push(E.displacementMapUv),_.push(E.emissiveMapUv),_.push(E.metalnessMapUv),_.push(E.roughnessMapUv),_.push(E.anisotropyMapUv),_.push(E.clearcoatMapUv),_.push(E.clearcoatNormalMapUv),_.push(E.clearcoatRoughnessMapUv),_.push(E.iridescenceMapUv),_.push(E.iridescenceThicknessMapUv),_.push(E.sheenColorMapUv),_.push(E.sheenRoughnessMapUv),_.push(E.specularMapUv),_.push(E.specularColorMapUv),_.push(E.specularIntensityMapUv),_.push(E.transmissionMapUv),_.push(E.thicknessMapUv),_.push(E.combine),_.push(E.fogExp2),_.push(E.sizeAttenuation),_.push(E.morphTargetsCount),_.push(E.morphAttributeCount),_.push(E.numDirLights),_.push(E.numPointLights),_.push(E.numSpotLights),_.push(E.numSpotLightMaps),_.push(E.numHemiLights),_.push(E.numRectAreaLights),_.push(E.numDirLightShadows),_.push(E.numPointLightShadows),_.push(E.numSpotLightShadows),_.push(E.numSpotLightShadowsWithMaps),_.push(E.numLightProbes),_.push(E.shadowMapType),_.push(E.toneMapping),_.push(E.numClippingPlanes),_.push(E.numClipIntersection),_.push(E.depthPacking)}function v(_,E){a.disableAll(),E.isWebGL2&&a.enable(0),E.supportsVertexTextures&&a.enable(1),E.instancing&&a.enable(2),E.instancingColor&&a.enable(3),E.matcap&&a.enable(4),E.envMap&&a.enable(5),E.normalMapObjectSpace&&a.enable(6),E.normalMapTangentSpace&&a.enable(7),E.clearcoat&&a.enable(8),E.iridescence&&a.enable(9),E.alphaTest&&a.enable(10),E.vertexColors&&a.enable(11),E.vertexAlphas&&a.enable(12),E.vertexUv1s&&a.enable(13),E.vertexUv2s&&a.enable(14),E.vertexUv3s&&a.enable(15),E.vertexTangents&&a.enable(16),E.anisotropy&&a.enable(17),E.alphaHash&&a.enable(18),E.batching&&a.enable(19),_.push(a.mask),a.disableAll(),E.fog&&a.enable(0),E.useFog&&a.enable(1),E.flatShading&&a.enable(2),E.logarithmicDepthBuffer&&a.enable(3),E.skinning&&a.enable(4),E.morphTargets&&a.enable(5),E.morphNormals&&a.enable(6),E.morphColors&&a.enable(7),E.premultipliedAlpha&&a.enable(8),E.shadowMapEnabled&&a.enable(9),E.useLegacyLights&&a.enable(10),E.doubleSided&&a.enable(11),E.flipSided&&a.enable(12),E.useDepthPacking&&a.enable(13),E.dithering&&a.enable(14),E.transmission&&a.enable(15),E.sheen&&a.enable(16),E.opaque&&a.enable(17),E.pointsUvs&&a.enable(18),E.decodeVideoTexture&&a.enable(19),_.push(a.mask)}function w(_){let E=g[_.type],H;if(E){let V=ii[E];H=Pd.clone(V.uniforms)}else H=_.uniforms;return H}function C(_,E){let H;for(let V=0,Q=l.length;V<Q;V++){let I=l[V];if(I.cacheKey===E){H=I,++H.usedTimes;break}}return H===void 0&&(H=new zg(n,E,_,r),l.push(H)),H}function T(_){if(--_.usedTimes===0){let E=l.indexOf(_);l[E]=l[l.length-1],l.pop(),_.destroy()}}function R(_){c.remove(_)}function W(){c.dispose()}return{getParameters:m,getProgramCacheKey:p,getUniforms:w,acquireProgram:C,releaseProgram:T,releaseShaderCache:R,programs:l,dispose:W}}function Gg(){let n=new WeakMap;function e(r){let o=n.get(r);return o===void 0&&(o={},n.set(r,o)),o}function t(r){n.delete(r)}function i(r,o,a){n.get(r)[o]=a}function s(){n=new WeakMap}return{get:e,remove:t,update:i,dispose:s}}function Wg(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.material.id!==e.material.id?n.material.id-e.material.id:n.z!==e.z?n.z-e.z:n.id-e.id}function Pl(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.z!==e.z?e.z-n.z:n.id-e.id}function Ll(){let n=[],e=0,t=[],i=[],s=[];function r(){e=0,t.length=0,i.length=0,s.length=0}function o(u,d,f,g,y,m){let p=n[e];return p===void 0?(p={id:u.id,object:u,geometry:d,material:f,groupOrder:g,renderOrder:u.renderOrder,z:y,group:m},n[e]=p):(p.id=u.id,p.object=u,p.geometry=d,p.material=f,p.groupOrder=g,p.renderOrder=u.renderOrder,p.z=y,p.group=m),e++,p}function a(u,d,f,g,y,m){let p=o(u,d,f,g,y,m);f.transmission>0?i.push(p):f.transparent===!0?s.push(p):t.push(p)}function c(u,d,f,g,y,m){let p=o(u,d,f,g,y,m);f.transmission>0?i.unshift(p):f.transparent===!0?s.unshift(p):t.unshift(p)}function l(u,d){t.length>1&&t.sort(u||Wg),i.length>1&&i.sort(d||Pl),s.length>1&&s.sort(d||Pl)}function h(){for(let u=e,d=n.length;u<d;u++){let f=n[u];if(f.id===null)break;f.id=null,f.object=null,f.geometry=null,f.material=null,f.group=null}}return{opaque:t,transmissive:i,transparent:s,init:r,push:a,unshift:c,finish:h,sort:l}}function Xg(){let n=new WeakMap;function e(i,s){let r=n.get(i),o;return r===void 0?(o=new Ll,n.set(i,[o])):s>=r.length?(o=new Ll,r.push(o)):o=r[s],o}function t(){n=new WeakMap}return{get:e,dispose:t}}function qg(){let n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new L,color:new me};break;case"SpotLight":t={position:new L,direction:new L,color:new me,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new L,color:new me,distance:0,decay:0};break;case"HemisphereLight":t={direction:new L,skyColor:new me,groundColor:new me};break;case"RectAreaLight":t={color:new me,position:new L,halfWidth:new L,halfHeight:new L};break}return n[e.id]=t,t}}}function $g(){let n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ee};break;case"SpotLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ee};break;case"PointLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ee,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[e.id]=t,t}}}var Yg=0;function Kg(n,e){return(e.castShadow?2:0)-(n.castShadow?2:0)+(e.map?1:0)-(n.map?1:0)}function jg(n,e){let t=new qg,i=$g(),s={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let h=0;h<9;h++)s.probe.push(new L);let r=new L,o=new Ge,a=new Ge;function c(h,u){let d=0,f=0,g=0;for(let V=0;V<9;V++)s.probe[V].set(0,0,0);let y=0,m=0,p=0,S=0,v=0,w=0,C=0,T=0,R=0,W=0,_=0;h.sort(Kg);let E=u===!0?Math.PI:1;for(let V=0,Q=h.length;V<Q;V++){let I=h[V],O=I.color,z=I.intensity,$=I.distance,X=I.shadow&&I.shadow.map?I.shadow.map.texture:null;if(I.isAmbientLight)d+=O.r*z*E,f+=O.g*z*E,g+=O.b*z*E;else if(I.isLightProbe){for(let q=0;q<9;q++)s.probe[q].addScaledVector(I.sh.coefficients[q],z);_++}else if(I.isDirectionalLight){let q=t.get(I);if(q.color.copy(I.color).multiplyScalar(I.intensity*E),I.castShadow){let Y=I.shadow,se=i.get(I);se.shadowBias=Y.bias,se.shadowNormalBias=Y.normalBias,se.shadowRadius=Y.radius,se.shadowMapSize=Y.mapSize,s.directionalShadow[y]=se,s.directionalShadowMap[y]=X,s.directionalShadowMatrix[y]=I.shadow.matrix,w++}s.directional[y]=q,y++}else if(I.isSpotLight){let q=t.get(I);q.position.setFromMatrixPosition(I.matrixWorld),q.color.copy(O).multiplyScalar(z*E),q.distance=$,q.coneCos=Math.cos(I.angle),q.penumbraCos=Math.cos(I.angle*(1-I.penumbra)),q.decay=I.decay,s.spot[p]=q;let Y=I.shadow;if(I.map&&(s.spotLightMap[R]=I.map,R++,Y.updateMatrices(I),I.castShadow&&W++),s.spotLightMatrix[p]=Y.matrix,I.castShadow){let se=i.get(I);se.shadowBias=Y.bias,se.shadowNormalBias=Y.normalBias,se.shadowRadius=Y.radius,se.shadowMapSize=Y.mapSize,s.spotShadow[p]=se,s.spotShadowMap[p]=X,T++}p++}else if(I.isRectAreaLight){let q=t.get(I);q.color.copy(O).multiplyScalar(z),q.halfWidth.set(I.width*.5,0,0),q.halfHeight.set(0,I.height*.5,0),s.rectArea[S]=q,S++}else if(I.isPointLight){let q=t.get(I);if(q.color.copy(I.color).multiplyScalar(I.intensity*E),q.distance=I.distance,q.decay=I.decay,I.castShadow){let Y=I.shadow,se=i.get(I);se.shadowBias=Y.bias,se.shadowNormalBias=Y.normalBias,se.shadowRadius=Y.radius,se.shadowMapSize=Y.mapSize,se.shadowCameraNear=Y.camera.near,se.shadowCameraFar=Y.camera.far,s.pointShadow[m]=se,s.pointShadowMap[m]=X,s.pointShadowMatrix[m]=I.shadow.matrix,C++}s.point[m]=q,m++}else if(I.isHemisphereLight){let q=t.get(I);q.skyColor.copy(I.color).multiplyScalar(z*E),q.groundColor.copy(I.groundColor).multiplyScalar(z*E),s.hemi[v]=q,v++}}S>0&&(e.isWebGL2?n.has("OES_texture_float_linear")===!0?(s.rectAreaLTC1=oe.LTC_FLOAT_1,s.rectAreaLTC2=oe.LTC_FLOAT_2):(s.rectAreaLTC1=oe.LTC_HALF_1,s.rectAreaLTC2=oe.LTC_HALF_2):n.has("OES_texture_float_linear")===!0?(s.rectAreaLTC1=oe.LTC_FLOAT_1,s.rectAreaLTC2=oe.LTC_FLOAT_2):n.has("OES_texture_half_float_linear")===!0?(s.rectAreaLTC1=oe.LTC_HALF_1,s.rectAreaLTC2=oe.LTC_HALF_2):console.error("THREE.WebGLRenderer: Unable to use RectAreaLight. Missing WebGL extensions.")),s.ambient[0]=d,s.ambient[1]=f,s.ambient[2]=g;let H=s.hash;(H.directionalLength!==y||H.pointLength!==m||H.spotLength!==p||H.rectAreaLength!==S||H.hemiLength!==v||H.numDirectionalShadows!==w||H.numPointShadows!==C||H.numSpotShadows!==T||H.numSpotMaps!==R||H.numLightProbes!==_)&&(s.directional.length=y,s.spot.length=p,s.rectArea.length=S,s.point.length=m,s.hemi.length=v,s.directionalShadow.length=w,s.directionalShadowMap.length=w,s.pointShadow.length=C,s.pointShadowMap.length=C,s.spotShadow.length=T,s.spotShadowMap.length=T,s.directionalShadowMatrix.length=w,s.pointShadowMatrix.length=C,s.spotLightMatrix.length=T+R-W,s.spotLightMap.length=R,s.numSpotLightShadowsWithMaps=W,s.numLightProbes=_,H.directionalLength=y,H.pointLength=m,H.spotLength=p,H.rectAreaLength=S,H.hemiLength=v,H.numDirectionalShadows=w,H.numPointShadows=C,H.numSpotShadows=T,H.numSpotMaps=R,H.numLightProbes=_,s.version=Yg++)}function l(h,u){let d=0,f=0,g=0,y=0,m=0,p=u.matrixWorldInverse;for(let S=0,v=h.length;S<v;S++){let w=h[S];if(w.isDirectionalLight){let C=s.directional[d];C.direction.setFromMatrixPosition(w.matrixWorld),r.setFromMatrixPosition(w.target.matrixWorld),C.direction.sub(r),C.direction.transformDirection(p),d++}else if(w.isSpotLight){let C=s.spot[g];C.position.setFromMatrixPosition(w.matrixWorld),C.position.applyMatrix4(p),C.direction.setFromMatrixPosition(w.matrixWorld),r.setFromMatrixPosition(w.target.matrixWorld),C.direction.sub(r),C.direction.transformDirection(p),g++}else if(w.isRectAreaLight){let C=s.rectArea[y];C.position.setFromMatrixPosition(w.matrixWorld),C.position.applyMatrix4(p),a.identity(),o.copy(w.matrixWorld),o.premultiply(p),a.extractRotation(o),C.halfWidth.set(w.width*.5,0,0),C.halfHeight.set(0,w.height*.5,0),C.halfWidth.applyMatrix4(a),C.halfHeight.applyMatrix4(a),y++}else if(w.isPointLight){let C=s.point[f];C.position.setFromMatrixPosition(w.matrixWorld),C.position.applyMatrix4(p),f++}else if(w.isHemisphereLight){let C=s.hemi[m];C.direction.setFromMatrixPosition(w.matrixWorld),C.direction.transformDirection(p),m++}}}return{setup:c,setupView:l,state:s}}function Il(n,e){let t=new jg(n,e),i=[],s=[];function r(){i.length=0,s.length=0}function o(u){i.push(u)}function a(u){s.push(u)}function c(u){t.setup(i,u)}function l(u){t.setupView(i,u)}return{init:r,state:{lightsArray:i,shadowsArray:s,lights:t},setupLights:c,setupLightsView:l,pushLight:o,pushShadow:a}}function Zg(n,e){let t=new WeakMap;function i(r,o=0){let a=t.get(r),c;return a===void 0?(c=new Il(n,e),t.set(r,[c])):o>=a.length?(c=new Il(n,e),a.push(c)):c=a[o],c}function s(){t=new WeakMap}return{get:i,dispose:s}}var ia=class extends Bt{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Wu,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},na=class extends Bt{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}},Jg=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Qg=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function ey(n,e,t){let i=new fs,s=new Ee,r=new Ee,o=new Qe,a=new ia({depthPacking:Xu}),c=new na,l={},h=t.maxTextureSize,u={[ri]:It,[It]:ri,[Jt]:Jt},d=new vi({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Ee},radius:{value:4}},vertexShader:Jg,fragmentShader:Qg}),f=d.clone();f.defines.HORIZONTAL_PASS=1;let g=new Mt;g.setAttribute("position",new ft(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let y=new _t(g,d),m=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Ql;let p=this.type;this.render=function(T,R,W){if(m.enabled===!1||m.autoUpdate===!1&&m.needsUpdate===!1||T.length===0)return;let _=n.getRenderTarget(),E=n.getActiveCubeFace(),H=n.getActiveMipmapLevel(),V=n.state;V.setBlending(Li),V.buffers.color.setClear(1,1,1,1),V.buffers.depth.setTest(!0),V.setScissorTest(!1);let Q=p!==mi&&this.type===mi,I=p===mi&&this.type!==mi;for(let O=0,z=T.length;O<z;O++){let $=T[O],X=$.shadow;if(X===void 0){console.warn("THREE.WebGLShadowMap:",$,"has no shadow.");continue}if(X.autoUpdate===!1&&X.needsUpdate===!1)continue;s.copy(X.mapSize);let q=X.getFrameExtents();if(s.multiply(q),r.copy(X.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/q.x),s.x=r.x*q.x,X.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/q.y),s.y=r.y*q.y,X.mapSize.y=r.y)),X.map===null||Q===!0||I===!0){let se=this.type!==mi?{minFilter:pt,magFilter:pt}:{};X.map!==null&&X.map.dispose(),X.map=new xi(s.x,s.y,se),X.map.texture.name=$.name+".shadowMap",X.camera.updateProjectionMatrix()}n.setRenderTarget(X.map),n.clear();let Y=X.getViewportCount();for(let se=0;se<Y;se++){let re=X.getViewport(se);o.set(r.x*re.x,r.y*re.y,r.x*re.z,r.y*re.w),V.viewport(o),X.updateMatrices($,se),i=X.getFrustum(),w(R,W,X.camera,$,this.type)}X.isPointLightShadow!==!0&&this.type===mi&&S(X,W),X.needsUpdate=!1}p=this.type,m.needsUpdate=!1,n.setRenderTarget(_,E,H)};function S(T,R){let W=e.update(y);d.defines.VSM_SAMPLES!==T.blurSamples&&(d.defines.VSM_SAMPLES=T.blurSamples,f.defines.VSM_SAMPLES=T.blurSamples,d.needsUpdate=!0,f.needsUpdate=!0),T.mapPass===null&&(T.mapPass=new xi(s.x,s.y)),d.uniforms.shadow_pass.value=T.map.texture,d.uniforms.resolution.value=T.mapSize,d.uniforms.radius.value=T.radius,n.setRenderTarget(T.mapPass),n.clear(),n.renderBufferDirect(R,null,W,d,y,null),f.uniforms.shadow_pass.value=T.mapPass.texture,f.uniforms.resolution.value=T.mapSize,f.uniforms.radius.value=T.radius,n.setRenderTarget(T.map),n.clear(),n.renderBufferDirect(R,null,W,f,y,null)}function v(T,R,W,_){let E=null,H=W.isPointLight===!0?T.customDistanceMaterial:T.customDepthMaterial;if(H!==void 0)E=H;else if(E=W.isPointLight===!0?c:a,n.localClippingEnabled&&R.clipShadows===!0&&Array.isArray(R.clippingPlanes)&&R.clippingPlanes.length!==0||R.displacementMap&&R.displacementScale!==0||R.alphaMap&&R.alphaTest>0||R.map&&R.alphaTest>0){let V=E.uuid,Q=R.uuid,I=l[V];I===void 0&&(I={},l[V]=I);let O=I[Q];O===void 0&&(O=E.clone(),I[Q]=O,R.addEventListener("dispose",C)),E=O}if(E.visible=R.visible,E.wireframe=R.wireframe,_===mi?E.side=R.shadowSide!==null?R.shadowSide:R.side:E.side=R.shadowSide!==null?R.shadowSide:u[R.side],E.alphaMap=R.alphaMap,E.alphaTest=R.alphaTest,E.map=R.map,E.clipShadows=R.clipShadows,E.clippingPlanes=R.clippingPlanes,E.clipIntersection=R.clipIntersection,E.displacementMap=R.displacementMap,E.displacementScale=R.displacementScale,E.displacementBias=R.displacementBias,E.wireframeLinewidth=R.wireframeLinewidth,E.linewidth=R.linewidth,W.isPointLight===!0&&E.isMeshDistanceMaterial===!0){let V=n.properties.get(E);V.light=W}return E}function w(T,R,W,_,E){if(T.visible===!1)return;if(T.layers.test(R.layers)&&(T.isMesh||T.isLine||T.isPoints)&&(T.castShadow||T.receiveShadow&&E===mi)&&(!T.frustumCulled||i.intersectsObject(T))){T.modelViewMatrix.multiplyMatrices(W.matrixWorldInverse,T.matrixWorld);let Q=e.update(T),I=T.material;if(Array.isArray(I)){let O=Q.groups;for(let z=0,$=O.length;z<$;z++){let X=O[z],q=I[X.materialIndex];if(q&&q.visible){let Y=v(T,q,_,E);T.onBeforeShadow(n,T,R,W,Q,Y,X),n.renderBufferDirect(W,null,Q,Y,T,X),T.onAfterShadow(n,T,R,W,Q,Y,X)}}}else if(I.visible){let O=v(T,I,_,E);T.onBeforeShadow(n,T,R,W,Q,O,null),n.renderBufferDirect(W,null,Q,O,T,null),T.onAfterShadow(n,T,R,W,Q,O,null)}}let V=T.children;for(let Q=0,I=V.length;Q<I;Q++)w(V[Q],R,W,_,E)}function C(T){T.target.removeEventListener("dispose",C);for(let W in l){let _=l[W],E=T.target.uuid;E in _&&(_[E].dispose(),delete _[E])}}}function ty(n,e,t){let i=t.isWebGL2;function s(){let P=!1,ne=new Qe,ae=null,Ae=new Qe(0,0,0,0);return{setMask:function(we){ae!==we&&!P&&(n.colorMask(we,we,we,we),ae=we)},setLocked:function(we){P=we},setClear:function(we,Xe,qe,rt,ct){ct===!0&&(we*=rt,Xe*=rt,qe*=rt),ne.set(we,Xe,qe,rt),Ae.equals(ne)===!1&&(n.clearColor(we,Xe,qe,rt),Ae.copy(ne))},reset:function(){P=!1,ae=null,Ae.set(-1,0,0,0)}}}function r(){let P=!1,ne=null,ae=null,Ae=null;return{setTest:function(we){we?ke(n.DEPTH_TEST):Te(n.DEPTH_TEST)},setMask:function(we){ne!==we&&!P&&(n.depthMask(we),ne=we)},setFunc:function(we){if(ae!==we){switch(we){case xu:n.depthFunc(n.NEVER);break;case vu:n.depthFunc(n.ALWAYS);break;case _u:n.depthFunc(n.LESS);break;case or:n.depthFunc(n.LEQUAL);break;case bu:n.depthFunc(n.EQUAL);break;case Su:n.depthFunc(n.GEQUAL);break;case wu:n.depthFunc(n.GREATER);break;case Mu:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}ae=we}},setLocked:function(we){P=we},setClear:function(we){Ae!==we&&(n.clearDepth(we),Ae=we)},reset:function(){P=!1,ne=null,ae=null,Ae=null}}}function o(){let P=!1,ne=null,ae=null,Ae=null,we=null,Xe=null,qe=null,rt=null,ct=null;return{setTest:function(Ye){P||(Ye?ke(n.STENCIL_TEST):Te(n.STENCIL_TEST))},setMask:function(Ye){ne!==Ye&&!P&&(n.stencilMask(Ye),ne=Ye)},setFunc:function(Ye,ht,ti){(ae!==Ye||Ae!==ht||we!==ti)&&(n.stencilFunc(Ye,ht,ti),ae=Ye,Ae=ht,we=ti)},setOp:function(Ye,ht,ti){(Xe!==Ye||qe!==ht||rt!==ti)&&(n.stencilOp(Ye,ht,ti),Xe=Ye,qe=ht,rt=ti)},setLocked:function(Ye){P=Ye},setClear:function(Ye){ct!==Ye&&(n.clearStencil(Ye),ct=Ye)},reset:function(){P=!1,ne=null,ae=null,Ae=null,we=null,Xe=null,qe=null,rt=null,ct=null}}}let a=new s,c=new r,l=new o,h=new WeakMap,u=new WeakMap,d={},f={},g=new WeakMap,y=[],m=null,p=!1,S=null,v=null,w=null,C=null,T=null,R=null,W=null,_=new me(0,0,0),E=0,H=!1,V=null,Q=null,I=null,O=null,z=null,$=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS),X=!1,q=0,Y=n.getParameter(n.VERSION);Y.indexOf("WebGL")!==-1?(q=parseFloat(/^WebGL (\d)/.exec(Y)[1]),X=q>=1):Y.indexOf("OpenGL ES")!==-1&&(q=parseFloat(/^OpenGL ES (\d)/.exec(Y)[1]),X=q>=2);let se=null,re={},G=n.getParameter(n.SCISSOR_BOX),K=n.getParameter(n.VIEWPORT),le=new Qe().fromArray(G),ve=new Qe().fromArray(K);function ye(P,ne,ae,Ae){let we=new Uint8Array(4),Xe=n.createTexture();n.bindTexture(P,Xe),n.texParameteri(P,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(P,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let qe=0;qe<ae;qe++)i&&(P===n.TEXTURE_3D||P===n.TEXTURE_2D_ARRAY)?n.texImage3D(ne,0,n.RGBA,1,1,Ae,0,n.RGBA,n.UNSIGNED_BYTE,we):n.texImage2D(ne+qe,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,we);return Xe}let Ie={};Ie[n.TEXTURE_2D]=ye(n.TEXTURE_2D,n.TEXTURE_2D,1),Ie[n.TEXTURE_CUBE_MAP]=ye(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),i&&(Ie[n.TEXTURE_2D_ARRAY]=ye(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),Ie[n.TEXTURE_3D]=ye(n.TEXTURE_3D,n.TEXTURE_3D,1,1)),a.setClear(0,0,0,1),c.setClear(1),l.setClear(0),ke(n.DEPTH_TEST),c.setFunc(or),De(!1),M(mc),ke(n.CULL_FACE),fe(Li);function ke(P){d[P]!==!0&&(n.enable(P),d[P]=!0)}function Te(P){d[P]!==!1&&(n.disable(P),d[P]=!1)}function We(P,ne){return f[P]!==ne?(n.bindFramebuffer(P,ne),f[P]=ne,i&&(P===n.DRAW_FRAMEBUFFER&&(f[n.FRAMEBUFFER]=ne),P===n.FRAMEBUFFER&&(f[n.DRAW_FRAMEBUFFER]=ne)),!0):!1}function D(P,ne){let ae=y,Ae=!1;if(P)if(ae=g.get(ne),ae===void 0&&(ae=[],g.set(ne,ae)),P.isWebGLMultipleRenderTargets){let we=P.texture;if(ae.length!==we.length||ae[0]!==n.COLOR_ATTACHMENT0){for(let Xe=0,qe=we.length;Xe<qe;Xe++)ae[Xe]=n.COLOR_ATTACHMENT0+Xe;ae.length=we.length,Ae=!0}}else ae[0]!==n.COLOR_ATTACHMENT0&&(ae[0]=n.COLOR_ATTACHMENT0,Ae=!0);else ae[0]!==n.BACK&&(ae[0]=n.BACK,Ae=!0);Ae&&(t.isWebGL2?n.drawBuffers(ae):e.get("WEBGL_draw_buffers").drawBuffersWEBGL(ae))}function bt(P){return m!==P?(n.useProgram(P),m=P,!0):!1}let Se={[Ji]:n.FUNC_ADD,[nu]:n.FUNC_SUBTRACT,[su]:n.FUNC_REVERSE_SUBTRACT};if(i)Se[vc]=n.MIN,Se[_c]=n.MAX;else{let P=e.get("EXT_blend_minmax");P!==null&&(Se[vc]=P.MIN_EXT,Se[_c]=P.MAX_EXT)}let Ce={[ru]:n.ZERO,[ou]:n.ONE,[au]:n.SRC_COLOR,[Bo]:n.SRC_ALPHA,[pu]:n.SRC_ALPHA_SATURATE,[uu]:n.DST_COLOR,[lu]:n.DST_ALPHA,[cu]:n.ONE_MINUS_SRC_COLOR,[zo]:n.ONE_MINUS_SRC_ALPHA,[du]:n.ONE_MINUS_DST_COLOR,[hu]:n.ONE_MINUS_DST_ALPHA,[fu]:n.CONSTANT_COLOR,[mu]:n.ONE_MINUS_CONSTANT_COLOR,[gu]:n.CONSTANT_ALPHA,[yu]:n.ONE_MINUS_CONSTANT_ALPHA};function fe(P,ne,ae,Ae,we,Xe,qe,rt,ct,Ye){if(P===Li){p===!0&&(Te(n.BLEND),p=!1);return}if(p===!1&&(ke(n.BLEND),p=!0),P!==iu){if(P!==S||Ye!==H){if((v!==Ji||T!==Ji)&&(n.blendEquation(n.FUNC_ADD),v=Ji,T=Ji),Ye)switch(P){case Nn:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case gc:n.blendFunc(n.ONE,n.ONE);break;case yc:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case xc:n.blendFuncSeparate(n.ZERO,n.SRC_COLOR,n.ZERO,n.SRC_ALPHA);break;default:console.error("THREE.WebGLState: Invalid blending: ",P);break}else switch(P){case Nn:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case gc:n.blendFunc(n.SRC_ALPHA,n.ONE);break;case yc:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case xc:n.blendFunc(n.ZERO,n.SRC_COLOR);break;default:console.error("THREE.WebGLState: Invalid blending: ",P);break}w=null,C=null,R=null,W=null,_.set(0,0,0),E=0,S=P,H=Ye}return}we=we||ne,Xe=Xe||ae,qe=qe||Ae,(ne!==v||we!==T)&&(n.blendEquationSeparate(Se[ne],Se[we]),v=ne,T=we),(ae!==w||Ae!==C||Xe!==R||qe!==W)&&(n.blendFuncSeparate(Ce[ae],Ce[Ae],Ce[Xe],Ce[qe]),w=ae,C=Ae,R=Xe,W=qe),(rt.equals(_)===!1||ct!==E)&&(n.blendColor(rt.r,rt.g,rt.b,ct),_.copy(rt),E=ct),S=P,H=!1}function et(P,ne){P.side===Jt?Te(n.CULL_FACE):ke(n.CULL_FACE);let ae=P.side===It;ne&&(ae=!ae),De(ae),P.blending===Nn&&P.transparent===!1?fe(Li):fe(P.blending,P.blendEquation,P.blendSrc,P.blendDst,P.blendEquationAlpha,P.blendSrcAlpha,P.blendDstAlpha,P.blendColor,P.blendAlpha,P.premultipliedAlpha),c.setFunc(P.depthFunc),c.setTest(P.depthTest),c.setMask(P.depthWrite),a.setMask(P.colorWrite);let Ae=P.stencilWrite;l.setTest(Ae),Ae&&(l.setMask(P.stencilWriteMask),l.setFunc(P.stencilFunc,P.stencilRef,P.stencilFuncMask),l.setOp(P.stencilFail,P.stencilZFail,P.stencilZPass)),N(P.polygonOffset,P.polygonOffsetFactor,P.polygonOffsetUnits),P.alphaToCoverage===!0?ke(n.SAMPLE_ALPHA_TO_COVERAGE):Te(n.SAMPLE_ALPHA_TO_COVERAGE)}function De(P){V!==P&&(P?n.frontFace(n.CW):n.frontFace(n.CCW),V=P)}function M(P){P!==Qh?(ke(n.CULL_FACE),P!==Q&&(P===mc?n.cullFace(n.BACK):P===eu?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):Te(n.CULL_FACE),Q=P}function x(P){P!==I&&(X&&n.lineWidth(P),I=P)}function N(P,ne,ae){P?(ke(n.POLYGON_OFFSET_FILL),(O!==ne||z!==ae)&&(n.polygonOffset(ne,ae),O=ne,z=ae)):Te(n.POLYGON_OFFSET_FILL)}function ee(P){P?ke(n.SCISSOR_TEST):Te(n.SCISSOR_TEST)}function Z(P){P===void 0&&(P=n.TEXTURE0+$-1),se!==P&&(n.activeTexture(P),se=P)}function te(P,ne,ae){ae===void 0&&(se===null?ae=n.TEXTURE0+$-1:ae=se);let Ae=re[ae];Ae===void 0&&(Ae={type:void 0,texture:void 0},re[ae]=Ae),(Ae.type!==P||Ae.texture!==ne)&&(se!==ae&&(n.activeTexture(ae),se=ae),n.bindTexture(P,ne||Ie[P]),Ae.type=P,Ae.texture=ne)}function ge(){let P=re[se];P!==void 0&&P.type!==void 0&&(n.bindTexture(P.type,null),P.type=void 0,P.texture=void 0)}function ce(){try{n.compressedTexImage2D.apply(n,arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function pe(){try{n.compressedTexImage3D.apply(n,arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function Me(){try{n.texSubImage2D.apply(n,arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function Oe(){try{n.texSubImage3D.apply(n,arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function j(){try{n.compressedTexSubImage2D.apply(n,arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function Ke(){try{n.compressedTexSubImage3D.apply(n,arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function Be(){try{n.texStorage2D.apply(n,arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function Pe(){try{n.texStorage3D.apply(n,arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function be(){try{n.texImage2D.apply(n,arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function he(){try{n.texImage3D.apply(n,arguments)}catch(P){console.error("THREE.WebGLState:",P)}}function A(P){le.equals(P)===!1&&(n.scissor(P.x,P.y,P.z,P.w),le.copy(P))}function ie(P){ve.equals(P)===!1&&(n.viewport(P.x,P.y,P.z,P.w),ve.copy(P))}function xe(P,ne){let ae=u.get(ne);ae===void 0&&(ae=new WeakMap,u.set(ne,ae));let Ae=ae.get(P);Ae===void 0&&(Ae=n.getUniformBlockIndex(ne,P.name),ae.set(P,Ae))}function de(P,ne){let Ae=u.get(ne).get(P);h.get(ne)!==Ae&&(n.uniformBlockBinding(ne,Ae,P.__bindingPointIndex),h.set(ne,Ae))}function J(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),i===!0&&(n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null)),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),d={},se=null,re={},f={},g=new WeakMap,y=[],m=null,p=!1,S=null,v=null,w=null,C=null,T=null,R=null,W=null,_=new me(0,0,0),E=0,H=!1,V=null,Q=null,I=null,O=null,z=null,le.set(0,0,n.canvas.width,n.canvas.height),ve.set(0,0,n.canvas.width,n.canvas.height),a.reset(),c.reset(),l.reset()}return{buffers:{color:a,depth:c,stencil:l},enable:ke,disable:Te,bindFramebuffer:We,drawBuffers:D,useProgram:bt,setBlending:fe,setMaterial:et,setFlipSided:De,setCullFace:M,setLineWidth:x,setPolygonOffset:N,setScissorTest:ee,activeTexture:Z,bindTexture:te,unbindTexture:ge,compressedTexImage2D:ce,compressedTexImage3D:pe,texImage2D:be,texImage3D:he,updateUBOMapping:xe,uniformBlockBinding:de,texStorage2D:Be,texStorage3D:Pe,texSubImage2D:Me,texSubImage3D:Oe,compressedTexSubImage2D:j,compressedTexSubImage3D:Ke,scissor:A,viewport:ie,reset:J}}function iy(n,e,t,i,s,r,o){let a=s.isWebGL2,c=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),h=new WeakMap,u,d=new WeakMap,f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(M,x){return f?new OffscreenCanvas(M,x):ps("canvas")}function y(M,x,N,ee){let Z=1;if((M.width>ee||M.height>ee)&&(Z=ee/Math.max(M.width,M.height)),Z<1||x===!0)if(typeof HTMLImageElement<"u"&&M instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&M instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&M instanceof ImageBitmap){let te=x?pr:Math.floor,ge=te(Z*M.width),ce=te(Z*M.height);u===void 0&&(u=g(ge,ce));let pe=N?g(ge,ce):u;return pe.width=ge,pe.height=ce,pe.getContext("2d").drawImage(M,0,0,ge,ce),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+M.width+"x"+M.height+") to ("+ge+"x"+ce+")."),pe}else return"data"in M&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+M.width+"x"+M.height+")."),M;return M}function m(M){return Xo(M.width)&&Xo(M.height)}function p(M){return a?!1:M.wrapS!==Ut||M.wrapT!==Ut||M.minFilter!==pt&&M.minFilter!==Lt}function S(M,x){return M.generateMipmaps&&x&&M.minFilter!==pt&&M.minFilter!==Lt}function v(M){n.generateMipmap(M)}function w(M,x,N,ee,Z=!1){if(a===!1)return x;if(M!==null){if(n[M]!==void 0)return n[M];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+M+"'")}let te=x;if(x===n.RED&&(N===n.FLOAT&&(te=n.R32F),N===n.HALF_FLOAT&&(te=n.R16F),N===n.UNSIGNED_BYTE&&(te=n.R8)),x===n.RED_INTEGER&&(N===n.UNSIGNED_BYTE&&(te=n.R8UI),N===n.UNSIGNED_SHORT&&(te=n.R16UI),N===n.UNSIGNED_INT&&(te=n.R32UI),N===n.BYTE&&(te=n.R8I),N===n.SHORT&&(te=n.R16I),N===n.INT&&(te=n.R32I)),x===n.RG&&(N===n.FLOAT&&(te=n.RG32F),N===n.HALF_FLOAT&&(te=n.RG16F),N===n.UNSIGNED_BYTE&&(te=n.RG8)),x===n.RGBA){let ge=Z?lr:je.getTransfer(ee);N===n.FLOAT&&(te=n.RGBA32F),N===n.HALF_FLOAT&&(te=n.RGBA16F),N===n.UNSIGNED_BYTE&&(te=ge===tt?n.SRGB8_ALPHA8:n.RGBA8),N===n.UNSIGNED_SHORT_4_4_4_4&&(te=n.RGBA4),N===n.UNSIGNED_SHORT_5_5_5_1&&(te=n.RGB5_A1)}return(te===n.R16F||te===n.R32F||te===n.RG16F||te===n.RG32F||te===n.RGBA16F||te===n.RGBA32F)&&e.get("EXT_color_buffer_float"),te}function C(M,x,N){return S(M,N)===!0||M.isFramebufferTexture&&M.minFilter!==pt&&M.minFilter!==Lt?Math.log2(Math.max(x.width,x.height))+1:M.mipmaps!==void 0&&M.mipmaps.length>0?M.mipmaps.length:M.isCompressedTexture&&Array.isArray(M.image)?x.mipmaps.length:1}function T(M){return M===pt||M===ar||M===os?n.NEAREST:n.LINEAR}function R(M){let x=M.target;x.removeEventListener("dispose",R),_(x),x.isVideoTexture&&h.delete(x)}function W(M){let x=M.target;x.removeEventListener("dispose",W),H(x)}function _(M){let x=i.get(M);if(x.__webglInit===void 0)return;let N=M.source,ee=d.get(N);if(ee){let Z=ee[x.__cacheKey];Z.usedTimes--,Z.usedTimes===0&&E(M),Object.keys(ee).length===0&&d.delete(N)}i.remove(M)}function E(M){let x=i.get(M);n.deleteTexture(x.__webglTexture);let N=M.source,ee=d.get(N);delete ee[x.__cacheKey],o.memory.textures--}function H(M){let x=M.texture,N=i.get(M),ee=i.get(x);if(ee.__webglTexture!==void 0&&(n.deleteTexture(ee.__webglTexture),o.memory.textures--),M.depthTexture&&M.depthTexture.dispose(),M.isWebGLCubeRenderTarget)for(let Z=0;Z<6;Z++){if(Array.isArray(N.__webglFramebuffer[Z]))for(let te=0;te<N.__webglFramebuffer[Z].length;te++)n.deleteFramebuffer(N.__webglFramebuffer[Z][te]);else n.deleteFramebuffer(N.__webglFramebuffer[Z]);N.__webglDepthbuffer&&n.deleteRenderbuffer(N.__webglDepthbuffer[Z])}else{if(Array.isArray(N.__webglFramebuffer))for(let Z=0;Z<N.__webglFramebuffer.length;Z++)n.deleteFramebuffer(N.__webglFramebuffer[Z]);else n.deleteFramebuffer(N.__webglFramebuffer);if(N.__webglDepthbuffer&&n.deleteRenderbuffer(N.__webglDepthbuffer),N.__webglMultisampledFramebuffer&&n.deleteFramebuffer(N.__webglMultisampledFramebuffer),N.__webglColorRenderbuffer)for(let Z=0;Z<N.__webglColorRenderbuffer.length;Z++)N.__webglColorRenderbuffer[Z]&&n.deleteRenderbuffer(N.__webglColorRenderbuffer[Z]);N.__webglDepthRenderbuffer&&n.deleteRenderbuffer(N.__webglDepthRenderbuffer)}if(M.isWebGLMultipleRenderTargets)for(let Z=0,te=x.length;Z<te;Z++){let ge=i.get(x[Z]);ge.__webglTexture&&(n.deleteTexture(ge.__webglTexture),o.memory.textures--),i.remove(x[Z])}i.remove(x),i.remove(M)}let V=0;function Q(){V=0}function I(){let M=V;return M>=s.maxTextures&&console.warn("THREE.WebGLTextures: Trying to use "+M+" texture units while this GPU supports only "+s.maxTextures),V+=1,M}function O(M){let x=[];return x.push(M.wrapS),x.push(M.wrapT),x.push(M.wrapR||0),x.push(M.magFilter),x.push(M.minFilter),x.push(M.anisotropy),x.push(M.internalFormat),x.push(M.format),x.push(M.type),x.push(M.generateMipmaps),x.push(M.premultiplyAlpha),x.push(M.flipY),x.push(M.unpackAlignment),x.push(M.colorSpace),x.join()}function z(M,x){let N=i.get(M);if(M.isVideoTexture&&et(M),M.isRenderTargetTexture===!1&&M.version>0&&N.__version!==M.version){let ee=M.image;if(ee===null)console.warn("THREE.WebGLRenderer: Texture marked for update but no image data found.");else if(ee.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{le(N,M,x);return}}t.bindTexture(n.TEXTURE_2D,N.__webglTexture,n.TEXTURE0+x)}function $(M,x){let N=i.get(M);if(M.version>0&&N.__version!==M.version){le(N,M,x);return}t.bindTexture(n.TEXTURE_2D_ARRAY,N.__webglTexture,n.TEXTURE0+x)}function X(M,x){let N=i.get(M);if(M.version>0&&N.__version!==M.version){le(N,M,x);return}t.bindTexture(n.TEXTURE_3D,N.__webglTexture,n.TEXTURE0+x)}function q(M,x){let N=i.get(M);if(M.version>0&&N.__version!==M.version){ve(N,M,x);return}t.bindTexture(n.TEXTURE_CUBE_MAP,N.__webglTexture,n.TEXTURE0+x)}let Y={[sn]:n.REPEAT,[Ut]:n.CLAMP_TO_EDGE,[us]:n.MIRRORED_REPEAT},se={[pt]:n.NEAREST,[ar]:n.NEAREST_MIPMAP_NEAREST,[os]:n.NEAREST_MIPMAP_LINEAR,[Lt]:n.LINEAR,[ba]:n.LINEAR_MIPMAP_NEAREST,[Ni]:n.LINEAR_MIPMAP_LINEAR},re={[$u]:n.NEVER,[Qu]:n.ALWAYS,[Yu]:n.LESS,[dh]:n.LEQUAL,[Ku]:n.EQUAL,[Ju]:n.GEQUAL,[ju]:n.GREATER,[Zu]:n.NOTEQUAL};function G(M,x,N){if(N?(n.texParameteri(M,n.TEXTURE_WRAP_S,Y[x.wrapS]),n.texParameteri(M,n.TEXTURE_WRAP_T,Y[x.wrapT]),(M===n.TEXTURE_3D||M===n.TEXTURE_2D_ARRAY)&&n.texParameteri(M,n.TEXTURE_WRAP_R,Y[x.wrapR]),n.texParameteri(M,n.TEXTURE_MAG_FILTER,se[x.magFilter]),n.texParameteri(M,n.TEXTURE_MIN_FILTER,se[x.minFilter])):(n.texParameteri(M,n.TEXTURE_WRAP_S,n.CLAMP_TO_EDGE),n.texParameteri(M,n.TEXTURE_WRAP_T,n.CLAMP_TO_EDGE),(M===n.TEXTURE_3D||M===n.TEXTURE_2D_ARRAY)&&n.texParameteri(M,n.TEXTURE_WRAP_R,n.CLAMP_TO_EDGE),(x.wrapS!==Ut||x.wrapT!==Ut)&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.wrapS and Texture.wrapT should be set to THREE.ClampToEdgeWrapping."),n.texParameteri(M,n.TEXTURE_MAG_FILTER,T(x.magFilter)),n.texParameteri(M,n.TEXTURE_MIN_FILTER,T(x.minFilter)),x.minFilter!==pt&&x.minFilter!==Lt&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.minFilter should be set to THREE.NearestFilter or THREE.LinearFilter.")),x.compareFunction&&(n.texParameteri(M,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(M,n.TEXTURE_COMPARE_FUNC,re[x.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){let ee=e.get("EXT_texture_filter_anisotropic");if(x.magFilter===pt||x.minFilter!==os&&x.minFilter!==Ni||x.type===gi&&e.has("OES_texture_float_linear")===!1||a===!1&&x.type===ds&&e.has("OES_texture_half_float_linear")===!1)return;(x.anisotropy>1||i.get(x).__currentAnisotropy)&&(n.texParameterf(M,ee.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(x.anisotropy,s.getMaxAnisotropy())),i.get(x).__currentAnisotropy=x.anisotropy)}}function K(M,x){let N=!1;M.__webglInit===void 0&&(M.__webglInit=!0,x.addEventListener("dispose",R));let ee=x.source,Z=d.get(ee);Z===void 0&&(Z={},d.set(ee,Z));let te=O(x);if(te!==M.__cacheKey){Z[te]===void 0&&(Z[te]={texture:n.createTexture(),usedTimes:0},o.memory.textures++,N=!0),Z[te].usedTimes++;let ge=Z[M.__cacheKey];ge!==void 0&&(Z[M.__cacheKey].usedTimes--,ge.usedTimes===0&&E(x)),M.__cacheKey=te,M.__webglTexture=Z[te].texture}return N}function le(M,x,N){let ee=n.TEXTURE_2D;(x.isDataArrayTexture||x.isCompressedArrayTexture)&&(ee=n.TEXTURE_2D_ARRAY),x.isData3DTexture&&(ee=n.TEXTURE_3D);let Z=K(M,x),te=x.source;t.bindTexture(ee,M.__webglTexture,n.TEXTURE0+N);let ge=i.get(te);if(te.version!==ge.__version||Z===!0){t.activeTexture(n.TEXTURE0+N);let ce=je.getPrimaries(je.workingColorSpace),pe=x.colorSpace===Gt?null:je.getPrimaries(x.colorSpace),Me=x.colorSpace===Gt||ce===pe?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,x.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,x.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Me);let Oe=p(x)&&m(x.image)===!1,j=y(x.image,Oe,!1,s.maxTextureSize);j=De(x,j);let Ke=m(j)||a,Be=r.convert(x.format,x.colorSpace),Pe=r.convert(x.type),be=w(x.internalFormat,Be,Pe,x.colorSpace,x.isVideoTexture);G(ee,x,Ke);let he,A=x.mipmaps,ie=a&&x.isVideoTexture!==!0&&be!==ch,xe=ge.__version===void 0||Z===!0,de=C(x,j,Ke);if(x.isDepthTexture)be=n.DEPTH_COMPONENT,a?x.type===gi?be=n.DEPTH_COMPONENT32F:x.type===Ci?be=n.DEPTH_COMPONENT24:x.type===en?be=n.DEPTH24_STENCIL8:be=n.DEPTH_COMPONENT16:x.type===gi&&console.error("WebGLRenderer: Floating point depth texture requires WebGL2."),x.format===tn&&be===n.DEPTH_COMPONENT&&x.type!==Sa&&x.type!==Ci&&(console.warn("THREE.WebGLRenderer: Use UnsignedShortType or UnsignedIntType for DepthFormat DepthTexture."),x.type=Ci,Pe=r.convert(x.type)),x.format===Bn&&be===n.DEPTH_COMPONENT&&(be=n.DEPTH_STENCIL,x.type!==en&&(console.warn("THREE.WebGLRenderer: Use UnsignedInt248Type for DepthStencilFormat DepthTexture."),x.type=en,Pe=r.convert(x.type))),xe&&(ie?t.texStorage2D(n.TEXTURE_2D,1,be,j.width,j.height):t.texImage2D(n.TEXTURE_2D,0,be,j.width,j.height,0,Be,Pe,null));else if(x.isDataTexture)if(A.length>0&&Ke){ie&&xe&&t.texStorage2D(n.TEXTURE_2D,de,be,A[0].width,A[0].height);for(let J=0,P=A.length;J<P;J++)he=A[J],ie?t.texSubImage2D(n.TEXTURE_2D,J,0,0,he.width,he.height,Be,Pe,he.data):t.texImage2D(n.TEXTURE_2D,J,be,he.width,he.height,0,Be,Pe,he.data);x.generateMipmaps=!1}else ie?(xe&&t.texStorage2D(n.TEXTURE_2D,de,be,j.width,j.height),t.texSubImage2D(n.TEXTURE_2D,0,0,0,j.width,j.height,Be,Pe,j.data)):t.texImage2D(n.TEXTURE_2D,0,be,j.width,j.height,0,Be,Pe,j.data);else if(x.isCompressedTexture)if(x.isCompressedArrayTexture){ie&&xe&&t.texStorage3D(n.TEXTURE_2D_ARRAY,de,be,A[0].width,A[0].height,j.depth);for(let J=0,P=A.length;J<P;J++)he=A[J],x.format!==Vt?Be!==null?ie?t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,J,0,0,0,he.width,he.height,j.depth,Be,he.data,0,0):t.compressedTexImage3D(n.TEXTURE_2D_ARRAY,J,be,he.width,he.height,j.depth,0,he.data,0,0):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):ie?t.texSubImage3D(n.TEXTURE_2D_ARRAY,J,0,0,0,he.width,he.height,j.depth,Be,Pe,he.data):t.texImage3D(n.TEXTURE_2D_ARRAY,J,be,he.width,he.height,j.depth,0,Be,Pe,he.data)}else{ie&&xe&&t.texStorage2D(n.TEXTURE_2D,de,be,A[0].width,A[0].height);for(let J=0,P=A.length;J<P;J++)he=A[J],x.format!==Vt?Be!==null?ie?t.compressedTexSubImage2D(n.TEXTURE_2D,J,0,0,he.width,he.height,Be,he.data):t.compressedTexImage2D(n.TEXTURE_2D,J,be,he.width,he.height,0,he.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):ie?t.texSubImage2D(n.TEXTURE_2D,J,0,0,he.width,he.height,Be,Pe,he.data):t.texImage2D(n.TEXTURE_2D,J,be,he.width,he.height,0,Be,Pe,he.data)}else if(x.isDataArrayTexture)ie?(xe&&t.texStorage3D(n.TEXTURE_2D_ARRAY,de,be,j.width,j.height,j.depth),t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,j.width,j.height,j.depth,Be,Pe,j.data)):t.texImage3D(n.TEXTURE_2D_ARRAY,0,be,j.width,j.height,j.depth,0,Be,Pe,j.data);else if(x.isData3DTexture)ie?(xe&&t.texStorage3D(n.TEXTURE_3D,de,be,j.width,j.height,j.depth),t.texSubImage3D(n.TEXTURE_3D,0,0,0,0,j.width,j.height,j.depth,Be,Pe,j.data)):t.texImage3D(n.TEXTURE_3D,0,be,j.width,j.height,j.depth,0,Be,Pe,j.data);else if(x.isFramebufferTexture){if(xe)if(ie)t.texStorage2D(n.TEXTURE_2D,de,be,j.width,j.height);else{let J=j.width,P=j.height;for(let ne=0;ne<de;ne++)t.texImage2D(n.TEXTURE_2D,ne,be,J,P,0,Be,Pe,null),J>>=1,P>>=1}}else if(A.length>0&&Ke){ie&&xe&&t.texStorage2D(n.TEXTURE_2D,de,be,A[0].width,A[0].height);for(let J=0,P=A.length;J<P;J++)he=A[J],ie?t.texSubImage2D(n.TEXTURE_2D,J,0,0,Be,Pe,he):t.texImage2D(n.TEXTURE_2D,J,be,Be,Pe,he);x.generateMipmaps=!1}else ie?(xe&&t.texStorage2D(n.TEXTURE_2D,de,be,j.width,j.height),t.texSubImage2D(n.TEXTURE_2D,0,0,0,Be,Pe,j)):t.texImage2D(n.TEXTURE_2D,0,be,Be,Pe,j);S(x,Ke)&&v(ee),ge.__version=te.version,x.onUpdate&&x.onUpdate(x)}M.__version=x.version}function ve(M,x,N){if(x.image.length!==6)return;let ee=K(M,x),Z=x.source;t.bindTexture(n.TEXTURE_CUBE_MAP,M.__webglTexture,n.TEXTURE0+N);let te=i.get(Z);if(Z.version!==te.__version||ee===!0){t.activeTexture(n.TEXTURE0+N);let ge=je.getPrimaries(je.workingColorSpace),ce=x.colorSpace===Gt?null:je.getPrimaries(x.colorSpace),pe=x.colorSpace===Gt||ge===ce?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,x.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,x.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,x.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,pe);let Me=x.isCompressedTexture||x.image[0].isCompressedTexture,Oe=x.image[0]&&x.image[0].isDataTexture,j=[];for(let J=0;J<6;J++)!Me&&!Oe?j[J]=y(x.image[J],!1,!0,s.maxCubemapSize):j[J]=Oe?x.image[J].image:x.image[J],j[J]=De(x,j[J]);let Ke=j[0],Be=m(Ke)||a,Pe=r.convert(x.format,x.colorSpace),be=r.convert(x.type),he=w(x.internalFormat,Pe,be,x.colorSpace),A=a&&x.isVideoTexture!==!0,ie=te.__version===void 0||ee===!0,xe=C(x,Ke,Be);G(n.TEXTURE_CUBE_MAP,x,Be);let de;if(Me){A&&ie&&t.texStorage2D(n.TEXTURE_CUBE_MAP,xe,he,Ke.width,Ke.height);for(let J=0;J<6;J++){de=j[J].mipmaps;for(let P=0;P<de.length;P++){let ne=de[P];x.format!==Vt?Pe!==null?A?t.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+J,P,0,0,ne.width,ne.height,Pe,ne.data):t.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+J,P,he,ne.width,ne.height,0,ne.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):A?t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+J,P,0,0,ne.width,ne.height,Pe,be,ne.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+J,P,he,ne.width,ne.height,0,Pe,be,ne.data)}}}else{de=x.mipmaps,A&&ie&&(de.length>0&&xe++,t.texStorage2D(n.TEXTURE_CUBE_MAP,xe,he,j[0].width,j[0].height));for(let J=0;J<6;J++)if(Oe){A?t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+J,0,0,0,j[J].width,j[J].height,Pe,be,j[J].data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+J,0,he,j[J].width,j[J].height,0,Pe,be,j[J].data);for(let P=0;P<de.length;P++){let ae=de[P].image[J].image;A?t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+J,P+1,0,0,ae.width,ae.height,Pe,be,ae.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+J,P+1,he,ae.width,ae.height,0,Pe,be,ae.data)}}else{A?t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+J,0,0,0,Pe,be,j[J]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+J,0,he,Pe,be,j[J]);for(let P=0;P<de.length;P++){let ne=de[P];A?t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+J,P+1,0,0,Pe,be,ne.image[J]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+J,P+1,he,Pe,be,ne.image[J])}}}S(x,Be)&&v(n.TEXTURE_CUBE_MAP),te.__version=Z.version,x.onUpdate&&x.onUpdate(x)}M.__version=x.version}function ye(M,x,N,ee,Z,te){let ge=r.convert(N.format,N.colorSpace),ce=r.convert(N.type),pe=w(N.internalFormat,ge,ce,N.colorSpace);if(!i.get(x).__hasExternalTextures){let Oe=Math.max(1,x.width>>te),j=Math.max(1,x.height>>te);Z===n.TEXTURE_3D||Z===n.TEXTURE_2D_ARRAY?t.texImage3D(Z,te,pe,Oe,j,x.depth,0,ge,ce,null):t.texImage2D(Z,te,pe,Oe,j,0,ge,ce,null)}t.bindFramebuffer(n.FRAMEBUFFER,M),fe(x)?c.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,ee,Z,i.get(N).__webglTexture,0,Ce(x)):(Z===n.TEXTURE_2D||Z>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&Z<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&n.framebufferTexture2D(n.FRAMEBUFFER,ee,Z,i.get(N).__webglTexture,te),t.bindFramebuffer(n.FRAMEBUFFER,null)}function Ie(M,x,N){if(n.bindRenderbuffer(n.RENDERBUFFER,M),x.depthBuffer&&!x.stencilBuffer){let ee=a===!0?n.DEPTH_COMPONENT24:n.DEPTH_COMPONENT16;if(N||fe(x)){let Z=x.depthTexture;Z&&Z.isDepthTexture&&(Z.type===gi?ee=n.DEPTH_COMPONENT32F:Z.type===Ci&&(ee=n.DEPTH_COMPONENT24));let te=Ce(x);fe(x)?c.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,te,ee,x.width,x.height):n.renderbufferStorageMultisample(n.RENDERBUFFER,te,ee,x.width,x.height)}else n.renderbufferStorage(n.RENDERBUFFER,ee,x.width,x.height);n.framebufferRenderbuffer(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.RENDERBUFFER,M)}else if(x.depthBuffer&&x.stencilBuffer){let ee=Ce(x);N&&fe(x)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,ee,n.DEPTH24_STENCIL8,x.width,x.height):fe(x)?c.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,ee,n.DEPTH24_STENCIL8,x.width,x.height):n.renderbufferStorage(n.RENDERBUFFER,n.DEPTH_STENCIL,x.width,x.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.RENDERBUFFER,M)}else{let ee=x.isWebGLMultipleRenderTargets===!0?x.texture:[x.texture];for(let Z=0;Z<ee.length;Z++){let te=ee[Z],ge=r.convert(te.format,te.colorSpace),ce=r.convert(te.type),pe=w(te.internalFormat,ge,ce,te.colorSpace),Me=Ce(x);N&&fe(x)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,Me,pe,x.width,x.height):fe(x)?c.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Me,pe,x.width,x.height):n.renderbufferStorage(n.RENDERBUFFER,pe,x.width,x.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function ke(M,x){if(x&&x.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(n.FRAMEBUFFER,M),!(x.depthTexture&&x.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");(!i.get(x.depthTexture).__webglTexture||x.depthTexture.image.width!==x.width||x.depthTexture.image.height!==x.height)&&(x.depthTexture.image.width=x.width,x.depthTexture.image.height=x.height,x.depthTexture.needsUpdate=!0),z(x.depthTexture,0);let ee=i.get(x.depthTexture).__webglTexture,Z=Ce(x);if(x.depthTexture.format===tn)fe(x)?c.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,ee,0,Z):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,ee,0);else if(x.depthTexture.format===Bn)fe(x)?c.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,ee,0,Z):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,ee,0);else throw new Error("Unknown depthTexture format")}function Te(M){let x=i.get(M),N=M.isWebGLCubeRenderTarget===!0;if(M.depthTexture&&!x.__autoAllocateDepthBuffer){if(N)throw new Error("target.depthTexture not supported in Cube render targets");ke(x.__webglFramebuffer,M)}else if(N){x.__webglDepthbuffer=[];for(let ee=0;ee<6;ee++)t.bindFramebuffer(n.FRAMEBUFFER,x.__webglFramebuffer[ee]),x.__webglDepthbuffer[ee]=n.createRenderbuffer(),Ie(x.__webglDepthbuffer[ee],M,!1)}else t.bindFramebuffer(n.FRAMEBUFFER,x.__webglFramebuffer),x.__webglDepthbuffer=n.createRenderbuffer(),Ie(x.__webglDepthbuffer,M,!1);t.bindFramebuffer(n.FRAMEBUFFER,null)}function We(M,x,N){let ee=i.get(M);x!==void 0&&ye(ee.__webglFramebuffer,M,M.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),N!==void 0&&Te(M)}function D(M){let x=M.texture,N=i.get(M),ee=i.get(x);M.addEventListener("dispose",W),M.isWebGLMultipleRenderTargets!==!0&&(ee.__webglTexture===void 0&&(ee.__webglTexture=n.createTexture()),ee.__version=x.version,o.memory.textures++);let Z=M.isWebGLCubeRenderTarget===!0,te=M.isWebGLMultipleRenderTargets===!0,ge=m(M)||a;if(Z){N.__webglFramebuffer=[];for(let ce=0;ce<6;ce++)if(a&&x.mipmaps&&x.mipmaps.length>0){N.__webglFramebuffer[ce]=[];for(let pe=0;pe<x.mipmaps.length;pe++)N.__webglFramebuffer[ce][pe]=n.createFramebuffer()}else N.__webglFramebuffer[ce]=n.createFramebuffer()}else{if(a&&x.mipmaps&&x.mipmaps.length>0){N.__webglFramebuffer=[];for(let ce=0;ce<x.mipmaps.length;ce++)N.__webglFramebuffer[ce]=n.createFramebuffer()}else N.__webglFramebuffer=n.createFramebuffer();if(te)if(s.drawBuffers){let ce=M.texture;for(let pe=0,Me=ce.length;pe<Me;pe++){let Oe=i.get(ce[pe]);Oe.__webglTexture===void 0&&(Oe.__webglTexture=n.createTexture(),o.memory.textures++)}}else console.warn("THREE.WebGLRenderer: WebGLMultipleRenderTargets can only be used with WebGL2 or WEBGL_draw_buffers extension.");if(a&&M.samples>0&&fe(M)===!1){let ce=te?x:[x];N.__webglMultisampledFramebuffer=n.createFramebuffer(),N.__webglColorRenderbuffer=[],t.bindFramebuffer(n.FRAMEBUFFER,N.__webglMultisampledFramebuffer);for(let pe=0;pe<ce.length;pe++){let Me=ce[pe];N.__webglColorRenderbuffer[pe]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,N.__webglColorRenderbuffer[pe]);let Oe=r.convert(Me.format,Me.colorSpace),j=r.convert(Me.type),Ke=w(Me.internalFormat,Oe,j,Me.colorSpace,M.isXRRenderTarget===!0),Be=Ce(M);n.renderbufferStorageMultisample(n.RENDERBUFFER,Be,Ke,M.width,M.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+pe,n.RENDERBUFFER,N.__webglColorRenderbuffer[pe])}n.bindRenderbuffer(n.RENDERBUFFER,null),M.depthBuffer&&(N.__webglDepthRenderbuffer=n.createRenderbuffer(),Ie(N.__webglDepthRenderbuffer,M,!0)),t.bindFramebuffer(n.FRAMEBUFFER,null)}}if(Z){t.bindTexture(n.TEXTURE_CUBE_MAP,ee.__webglTexture),G(n.TEXTURE_CUBE_MAP,x,ge);for(let ce=0;ce<6;ce++)if(a&&x.mipmaps&&x.mipmaps.length>0)for(let pe=0;pe<x.mipmaps.length;pe++)ye(N.__webglFramebuffer[ce][pe],M,x,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+ce,pe);else ye(N.__webglFramebuffer[ce],M,x,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+ce,0);S(x,ge)&&v(n.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(te){let ce=M.texture;for(let pe=0,Me=ce.length;pe<Me;pe++){let Oe=ce[pe],j=i.get(Oe);t.bindTexture(n.TEXTURE_2D,j.__webglTexture),G(n.TEXTURE_2D,Oe,ge),ye(N.__webglFramebuffer,M,Oe,n.COLOR_ATTACHMENT0+pe,n.TEXTURE_2D,0),S(Oe,ge)&&v(n.TEXTURE_2D)}t.unbindTexture()}else{let ce=n.TEXTURE_2D;if((M.isWebGL3DRenderTarget||M.isWebGLArrayRenderTarget)&&(a?ce=M.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY:console.error("THREE.WebGLTextures: THREE.Data3DTexture and THREE.DataArrayTexture only supported with WebGL2.")),t.bindTexture(ce,ee.__webglTexture),G(ce,x,ge),a&&x.mipmaps&&x.mipmaps.length>0)for(let pe=0;pe<x.mipmaps.length;pe++)ye(N.__webglFramebuffer[pe],M,x,n.COLOR_ATTACHMENT0,ce,pe);else ye(N.__webglFramebuffer,M,x,n.COLOR_ATTACHMENT0,ce,0);S(x,ge)&&v(ce),t.unbindTexture()}M.depthBuffer&&Te(M)}function bt(M){let x=m(M)||a,N=M.isWebGLMultipleRenderTargets===!0?M.texture:[M.texture];for(let ee=0,Z=N.length;ee<Z;ee++){let te=N[ee];if(S(te,x)){let ge=M.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:n.TEXTURE_2D,ce=i.get(te).__webglTexture;t.bindTexture(ge,ce),v(ge),t.unbindTexture()}}}function Se(M){if(a&&M.samples>0&&fe(M)===!1){let x=M.isWebGLMultipleRenderTargets?M.texture:[M.texture],N=M.width,ee=M.height,Z=n.COLOR_BUFFER_BIT,te=[],ge=M.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,ce=i.get(M),pe=M.isWebGLMultipleRenderTargets===!0;if(pe)for(let Me=0;Me<x.length;Me++)t.bindFramebuffer(n.FRAMEBUFFER,ce.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Me,n.RENDERBUFFER,null),t.bindFramebuffer(n.FRAMEBUFFER,ce.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+Me,n.TEXTURE_2D,null,0);t.bindFramebuffer(n.READ_FRAMEBUFFER,ce.__webglMultisampledFramebuffer),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ce.__webglFramebuffer);for(let Me=0;Me<x.length;Me++){te.push(n.COLOR_ATTACHMENT0+Me),M.depthBuffer&&te.push(ge);let Oe=ce.__ignoreDepthValues!==void 0?ce.__ignoreDepthValues:!1;if(Oe===!1&&(M.depthBuffer&&(Z|=n.DEPTH_BUFFER_BIT),M.stencilBuffer&&(Z|=n.STENCIL_BUFFER_BIT)),pe&&n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,ce.__webglColorRenderbuffer[Me]),Oe===!0&&(n.invalidateFramebuffer(n.READ_FRAMEBUFFER,[ge]),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[ge])),pe){let j=i.get(x[Me]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,j,0)}n.blitFramebuffer(0,0,N,ee,0,0,N,ee,Z,n.NEAREST),l&&n.invalidateFramebuffer(n.READ_FRAMEBUFFER,te)}if(t.bindFramebuffer(n.READ_FRAMEBUFFER,null),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),pe)for(let Me=0;Me<x.length;Me++){t.bindFramebuffer(n.FRAMEBUFFER,ce.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Me,n.RENDERBUFFER,ce.__webglColorRenderbuffer[Me]);let Oe=i.get(x[Me]).__webglTexture;t.bindFramebuffer(n.FRAMEBUFFER,ce.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+Me,n.TEXTURE_2D,Oe,0)}t.bindFramebuffer(n.DRAW_FRAMEBUFFER,ce.__webglMultisampledFramebuffer)}}function Ce(M){return Math.min(s.maxSamples,M.samples)}function fe(M){let x=i.get(M);return a&&M.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&x.__useRenderToTexture!==!1}function et(M){let x=o.render.frame;h.get(M)!==x&&(h.set(M,x),M.update())}function De(M,x){let N=M.colorSpace,ee=M.format,Z=M.type;return M.isCompressedTexture===!0||M.isVideoTexture===!0||M.format===Wo||N!==mt&&N!==Gt&&(je.getTransfer(N)===tt?a===!1?e.has("EXT_sRGB")===!0&&ee===Vt?(M.format=Wo,M.minFilter=Lt,M.generateMipmaps=!1):x=fr.sRGBToLinear(x):(ee!==Vt||Z!==ki)&&console.warn("THREE.WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):console.error("THREE.WebGLTextures: Unsupported texture color space:",N)),x}this.allocateTextureUnit=I,this.resetTextureUnits=Q,this.setTexture2D=z,this.setTexture2DArray=$,this.setTexture3D=X,this.setTextureCube=q,this.rebindTextures=We,this.setupRenderTarget=D,this.updateRenderTargetMipmap=bt,this.updateMultisampleRenderTarget=Se,this.setupDepthRenderbuffer=Te,this.setupFrameBufferTexture=ye,this.useMultisampledRTT=fe}function ny(n,e,t){let i=t.isWebGL2;function s(r,o=Gt){let a,c=je.getTransfer(o);if(r===ki)return n.UNSIGNED_BYTE;if(r===nh)return n.UNSIGNED_SHORT_4_4_4_4;if(r===sh)return n.UNSIGNED_SHORT_5_5_5_1;if(r===Nu)return n.BYTE;if(r===Du)return n.SHORT;if(r===Sa)return n.UNSIGNED_SHORT;if(r===ih)return n.INT;if(r===Ci)return n.UNSIGNED_INT;if(r===gi)return n.FLOAT;if(r===ds)return i?n.HALF_FLOAT:(a=e.get("OES_texture_half_float"),a!==null?a.HALF_FLOAT_OES:null);if(r===Ou)return n.ALPHA;if(r===Vt)return n.RGBA;if(r===Uu)return n.LUMINANCE;if(r===Fu)return n.LUMINANCE_ALPHA;if(r===tn)return n.DEPTH_COMPONENT;if(r===Bn)return n.DEPTH_STENCIL;if(r===Wo)return a=e.get("EXT_sRGB"),a!==null?a.SRGB_ALPHA_EXT:null;if(r===Bu)return n.RED;if(r===rh)return n.RED_INTEGER;if(r===zu)return n.RG;if(r===oh)return n.RG_INTEGER;if(r===ah)return n.RGBA_INTEGER;if(r===ro||r===oo||r===ao||r===co)if(c===tt)if(a=e.get("WEBGL_compressed_texture_s3tc_srgb"),a!==null){if(r===ro)return a.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(r===oo)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(r===ao)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(r===co)return a.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(a=e.get("WEBGL_compressed_texture_s3tc"),a!==null){if(r===ro)return a.COMPRESSED_RGB_S3TC_DXT1_EXT;if(r===oo)return a.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(r===ao)return a.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(r===co)return a.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(r===Sc||r===wc||r===Mc||r===Tc)if(a=e.get("WEBGL_compressed_texture_pvrtc"),a!==null){if(r===Sc)return a.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(r===wc)return a.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(r===Mc)return a.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(r===Tc)return a.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(r===ch)return a=e.get("WEBGL_compressed_texture_etc1"),a!==null?a.COMPRESSED_RGB_ETC1_WEBGL:null;if(r===Ec||r===Ac)if(a=e.get("WEBGL_compressed_texture_etc"),a!==null){if(r===Ec)return c===tt?a.COMPRESSED_SRGB8_ETC2:a.COMPRESSED_RGB8_ETC2;if(r===Ac)return c===tt?a.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:a.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(r===Rc||r===Cc||r===Pc||r===Lc||r===Ic||r===kc||r===Nc||r===Dc||r===Oc||r===Uc||r===Fc||r===Bc||r===zc||r===Hc)if(a=e.get("WEBGL_compressed_texture_astc"),a!==null){if(r===Rc)return c===tt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:a.COMPRESSED_RGBA_ASTC_4x4_KHR;if(r===Cc)return c===tt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:a.COMPRESSED_RGBA_ASTC_5x4_KHR;if(r===Pc)return c===tt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:a.COMPRESSED_RGBA_ASTC_5x5_KHR;if(r===Lc)return c===tt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:a.COMPRESSED_RGBA_ASTC_6x5_KHR;if(r===Ic)return c===tt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:a.COMPRESSED_RGBA_ASTC_6x6_KHR;if(r===kc)return c===tt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:a.COMPRESSED_RGBA_ASTC_8x5_KHR;if(r===Nc)return c===tt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:a.COMPRESSED_RGBA_ASTC_8x6_KHR;if(r===Dc)return c===tt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:a.COMPRESSED_RGBA_ASTC_8x8_KHR;if(r===Oc)return c===tt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:a.COMPRESSED_RGBA_ASTC_10x5_KHR;if(r===Uc)return c===tt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:a.COMPRESSED_RGBA_ASTC_10x6_KHR;if(r===Fc)return c===tt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:a.COMPRESSED_RGBA_ASTC_10x8_KHR;if(r===Bc)return c===tt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:a.COMPRESSED_RGBA_ASTC_10x10_KHR;if(r===zc)return c===tt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:a.COMPRESSED_RGBA_ASTC_12x10_KHR;if(r===Hc)return c===tt?a.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:a.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(r===lo||r===Vc||r===Gc)if(a=e.get("EXT_texture_compression_bptc"),a!==null){if(r===lo)return c===tt?a.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:a.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(r===Vc)return a.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(r===Gc)return a.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(r===Hu||r===Wc||r===Xc||r===qc)if(a=e.get("EXT_texture_compression_rgtc"),a!==null){if(r===lo)return a.COMPRESSED_RED_RGTC1_EXT;if(r===Wc)return a.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(r===Xc)return a.COMPRESSED_RED_GREEN_RGTC2_EXT;if(r===qc)return a.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return r===en?i?n.UNSIGNED_INT_24_8:(a=e.get("WEBGL_depth_texture"),a!==null?a.UNSIGNED_INT_24_8_WEBGL:null):n[r]!==void 0?n[r]:null}return{convert:s}}var sa=class extends dt{constructor(e=[]){super(),this.isArrayCamera=!0,this.cameras=e}},si=class extends at{constructor(){super(),this.isGroup=!0,this.type="Group"}},sy={type:"move"},hs=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new si,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new si,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new L,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new L),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new si,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new L,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new L),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let s=null,r=null,o=null,a=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){o=!0;for(let y of e.hand.values()){let m=t.getJointPose(y,i),p=this._getHandJoint(l,y);m!==null&&(p.matrix.fromArray(m.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=m.radius),p.visible=m!==null}let h=l.joints["index-finger-tip"],u=l.joints["thumb-tip"],d=h.position.distanceTo(u.position),f=.02,g=.005;l.inputState.pinching&&d>f+g?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&d<=f-g&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,i),r!==null&&(c.matrix.fromArray(r.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,r.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(r.linearVelocity)):c.hasLinearVelocity=!1,r.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(r.angularVelocity)):c.hasAngularVelocity=!1));a!==null&&(s=t.getPose(e.targetRaySpace,i),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(sy)))}return a!==null&&(a.visible=s!==null),c!==null&&(c.visible=r!==null),l!==null&&(l.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let i=new si;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}},ra=class extends ei{constructor(e,t){super();let i=this,s=null,r=1,o=null,a="local-floor",c=1,l=null,h=null,u=null,d=null,f=null,g=null,y=t.getContextAttributes(),m=null,p=null,S=[],v=[],w=new Ee,C=null,T=new dt;T.layers.enable(1),T.viewport=new Qe;let R=new dt;R.layers.enable(2),R.viewport=new Qe;let W=[T,R],_=new sa;_.layers.enable(1),_.layers.enable(2);let E=null,H=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(G){let K=S[G];return K===void 0&&(K=new hs,S[G]=K),K.getTargetRaySpace()},this.getControllerGrip=function(G){let K=S[G];return K===void 0&&(K=new hs,S[G]=K),K.getGripSpace()},this.getHand=function(G){let K=S[G];return K===void 0&&(K=new hs,S[G]=K),K.getHandSpace()};function V(G){let K=v.indexOf(G.inputSource);if(K===-1)return;let le=S[K];le!==void 0&&(le.update(G.inputSource,G.frame,l||o),le.dispatchEvent({type:G.type,data:G.inputSource}))}function Q(){s.removeEventListener("select",V),s.removeEventListener("selectstart",V),s.removeEventListener("selectend",V),s.removeEventListener("squeeze",V),s.removeEventListener("squeezestart",V),s.removeEventListener("squeezeend",V),s.removeEventListener("end",Q),s.removeEventListener("inputsourceschange",I);for(let G=0;G<S.length;G++){let K=v[G];K!==null&&(v[G]=null,S[G].disconnect(K))}E=null,H=null,e.setRenderTarget(m),f=null,d=null,u=null,s=null,p=null,re.stop(),i.isPresenting=!1,e.setPixelRatio(C),e.setSize(w.width,w.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(G){r=G,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(G){a=G,i.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||o},this.setReferenceSpace=function(G){l=G},this.getBaseLayer=function(){return d!==null?d:f},this.getBinding=function(){return u},this.getFrame=function(){return g},this.getSession=function(){return s},this.setSession=async function(G){if(s=G,s!==null){if(m=e.getRenderTarget(),s.addEventListener("select",V),s.addEventListener("selectstart",V),s.addEventListener("selectend",V),s.addEventListener("squeeze",V),s.addEventListener("squeezestart",V),s.addEventListener("squeezeend",V),s.addEventListener("end",Q),s.addEventListener("inputsourceschange",I),y.xrCompatible!==!0&&await t.makeXRCompatible(),C=e.getPixelRatio(),e.getSize(w),s.renderState.layers===void 0||e.capabilities.isWebGL2===!1){let K={antialias:s.renderState.layers===void 0?y.antialias:!0,alpha:!0,depth:y.depth,stencil:y.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,t,K),s.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),p=new xi(f.framebufferWidth,f.framebufferHeight,{format:Vt,type:ki,colorSpace:e.outputColorSpace,stencilBuffer:y.stencil})}else{let K=null,le=null,ve=null;y.depth&&(ve=y.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,K=y.stencil?Bn:tn,le=y.stencil?en:Ci);let ye={colorFormat:t.RGBA8,depthFormat:ve,scaleFactor:r};u=new XRWebGLBinding(s,t),d=u.createProjectionLayer(ye),s.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),p=new xi(d.textureWidth,d.textureHeight,{format:Vt,type:ki,depthTexture:new Mr(d.textureWidth,d.textureHeight,le,void 0,void 0,void 0,void 0,void 0,void 0,K),stencilBuffer:y.stencil,colorSpace:e.outputColorSpace,samples:y.antialias?4:0});let Ie=e.properties.get(p);Ie.__ignoreDepthValues=d.ignoreDepthValues}p.isXRRenderTarget=!0,this.setFoveation(c),l=null,o=await s.requestReferenceSpace(a),re.setContext(s),re.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode};function I(G){for(let K=0;K<G.removed.length;K++){let le=G.removed[K],ve=v.indexOf(le);ve>=0&&(v[ve]=null,S[ve].disconnect(le))}for(let K=0;K<G.added.length;K++){let le=G.added[K],ve=v.indexOf(le);if(ve===-1){for(let Ie=0;Ie<S.length;Ie++)if(Ie>=v.length){v.push(le),ve=Ie;break}else if(v[Ie]===null){v[Ie]=le,ve=Ie;break}if(ve===-1)break}let ye=S[ve];ye&&ye.connect(le)}}let O=new L,z=new L;function $(G,K,le){O.setFromMatrixPosition(K.matrixWorld),z.setFromMatrixPosition(le.matrixWorld);let ve=O.distanceTo(z),ye=K.projectionMatrix.elements,Ie=le.projectionMatrix.elements,ke=ye[14]/(ye[10]-1),Te=ye[14]/(ye[10]+1),We=(ye[9]+1)/ye[5],D=(ye[9]-1)/ye[5],bt=(ye[8]-1)/ye[0],Se=(Ie[8]+1)/Ie[0],Ce=ke*bt,fe=ke*Se,et=ve/(-bt+Se),De=et*-bt;K.matrixWorld.decompose(G.position,G.quaternion,G.scale),G.translateX(De),G.translateZ(et),G.matrixWorld.compose(G.position,G.quaternion,G.scale),G.matrixWorldInverse.copy(G.matrixWorld).invert();let M=ke+et,x=Te+et,N=Ce-De,ee=fe+(ve-De),Z=We*Te/x*M,te=D*Te/x*M;G.projectionMatrix.makePerspective(N,ee,Z,te,M,x),G.projectionMatrixInverse.copy(G.projectionMatrix).invert()}function X(G,K){K===null?G.matrixWorld.copy(G.matrix):G.matrixWorld.multiplyMatrices(K.matrixWorld,G.matrix),G.matrixWorldInverse.copy(G.matrixWorld).invert()}this.updateCamera=function(G){if(s===null)return;_.near=R.near=T.near=G.near,_.far=R.far=T.far=G.far,(E!==_.near||H!==_.far)&&(s.updateRenderState({depthNear:_.near,depthFar:_.far}),E=_.near,H=_.far);let K=G.parent,le=_.cameras;X(_,K);for(let ve=0;ve<le.length;ve++)X(le[ve],K);le.length===2?$(_,T,R):_.projectionMatrix.copy(T.projectionMatrix),q(G,_,K)};function q(G,K,le){le===null?G.matrix.copy(K.matrixWorld):(G.matrix.copy(le.matrixWorld),G.matrix.invert(),G.matrix.multiply(K.matrixWorld)),G.matrix.decompose(G.position,G.quaternion,G.scale),G.updateMatrixWorld(!0),G.projectionMatrix.copy(K.projectionMatrix),G.projectionMatrixInverse.copy(K.projectionMatrixInverse),G.isPerspectiveCamera&&(G.fov=Hn*2*Math.atan(1/G.projectionMatrix.elements[5]),G.zoom=1)}this.getCamera=function(){return _},this.getFoveation=function(){if(!(d===null&&f===null))return c},this.setFoveation=function(G){c=G,d!==null&&(d.fixedFoveation=G),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=G)};let Y=null;function se(G,K){if(h=K.getViewerPose(l||o),g=K,h!==null){let le=h.views;f!==null&&(e.setRenderTargetFramebuffer(p,f.framebuffer),e.setRenderTarget(p));let ve=!1;le.length!==_.cameras.length&&(_.cameras.length=0,ve=!0);for(let ye=0;ye<le.length;ye++){let Ie=le[ye],ke=null;if(f!==null)ke=f.getViewport(Ie);else{let We=u.getViewSubImage(d,Ie);ke=We.viewport,ye===0&&(e.setRenderTargetTextures(p,We.colorTexture,d.ignoreDepthValues?void 0:We.depthStencilTexture),e.setRenderTarget(p))}let Te=W[ye];Te===void 0&&(Te=new dt,Te.layers.enable(ye),Te.viewport=new Qe,W[ye]=Te),Te.matrix.fromArray(Ie.transform.matrix),Te.matrix.decompose(Te.position,Te.quaternion,Te.scale),Te.projectionMatrix.fromArray(Ie.projectionMatrix),Te.projectionMatrixInverse.copy(Te.projectionMatrix).invert(),Te.viewport.set(ke.x,ke.y,ke.width,ke.height),ye===0&&(_.matrix.copy(Te.matrix),_.matrix.decompose(_.position,_.quaternion,_.scale)),ve===!0&&_.cameras.push(Te)}}for(let le=0;le<S.length;le++){let ve=v[le],ye=S[le];ve!==null&&ye!==void 0&&ye.update(ve,K,l||o)}Y&&Y(G,K),K.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:K}),g=null}let re=new gh;re.setAnimationLoop(se),this.setAnimationLoop=function(G){Y=G},this.dispose=function(){}}};function ry(n,e){function t(m,p){m.matrixAutoUpdate===!0&&m.updateMatrix(),p.value.copy(m.matrix)}function i(m,p){p.color.getRGB(m.fogColor.value,mh(n)),p.isFog?(m.fogNear.value=p.near,m.fogFar.value=p.far):p.isFogExp2&&(m.fogDensity.value=p.density)}function s(m,p,S,v,w){p.isMeshBasicMaterial||p.isMeshLambertMaterial?r(m,p):p.isMeshToonMaterial?(r(m,p),u(m,p)):p.isMeshPhongMaterial?(r(m,p),h(m,p)):p.isMeshStandardMaterial?(r(m,p),d(m,p),p.isMeshPhysicalMaterial&&f(m,p,w)):p.isMeshMatcapMaterial?(r(m,p),g(m,p)):p.isMeshDepthMaterial?r(m,p):p.isMeshDistanceMaterial?(r(m,p),y(m,p)):p.isMeshNormalMaterial?r(m,p):p.isLineBasicMaterial?(o(m,p),p.isLineDashedMaterial&&a(m,p)):p.isPointsMaterial?c(m,p,S,v):p.isSpriteMaterial?l(m,p):p.isShadowMaterial?(m.color.value.copy(p.color),m.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(m,p){m.opacity.value=p.opacity,p.color&&m.diffuse.value.copy(p.color),p.emissive&&m.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.bumpMap&&(m.bumpMap.value=p.bumpMap,t(p.bumpMap,m.bumpMapTransform),m.bumpScale.value=p.bumpScale,p.side===It&&(m.bumpScale.value*=-1)),p.normalMap&&(m.normalMap.value=p.normalMap,t(p.normalMap,m.normalMapTransform),m.normalScale.value.copy(p.normalScale),p.side===It&&m.normalScale.value.negate()),p.displacementMap&&(m.displacementMap.value=p.displacementMap,t(p.displacementMap,m.displacementMapTransform),m.displacementScale.value=p.displacementScale,m.displacementBias.value=p.displacementBias),p.emissiveMap&&(m.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,m.emissiveMapTransform)),p.specularMap&&(m.specularMap.value=p.specularMap,t(p.specularMap,m.specularMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest);let S=e.get(p).envMap;if(S&&(m.envMap.value=S,m.flipEnvMap.value=S.isCubeTexture&&S.isRenderTargetTexture===!1?-1:1,m.reflectivity.value=p.reflectivity,m.ior.value=p.ior,m.refractionRatio.value=p.refractionRatio),p.lightMap){m.lightMap.value=p.lightMap;let v=n._useLegacyLights===!0?Math.PI:1;m.lightMapIntensity.value=p.lightMapIntensity*v,t(p.lightMap,m.lightMapTransform)}p.aoMap&&(m.aoMap.value=p.aoMap,m.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,m.aoMapTransform))}function o(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform))}function a(m,p){m.dashSize.value=p.dashSize,m.totalSize.value=p.dashSize+p.gapSize,m.scale.value=p.scale}function c(m,p,S,v){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.size.value=p.size*S,m.scale.value=v*.5,p.map&&(m.map.value=p.map,t(p.map,m.uvTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function l(m,p){m.diffuse.value.copy(p.color),m.opacity.value=p.opacity,m.rotation.value=p.rotation,p.map&&(m.map.value=p.map,t(p.map,m.mapTransform)),p.alphaMap&&(m.alphaMap.value=p.alphaMap,t(p.alphaMap,m.alphaMapTransform)),p.alphaTest>0&&(m.alphaTest.value=p.alphaTest)}function h(m,p){m.specular.value.copy(p.specular),m.shininess.value=Math.max(p.shininess,1e-4)}function u(m,p){p.gradientMap&&(m.gradientMap.value=p.gradientMap)}function d(m,p){m.metalness.value=p.metalness,p.metalnessMap&&(m.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,m.metalnessMapTransform)),m.roughness.value=p.roughness,p.roughnessMap&&(m.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,m.roughnessMapTransform)),e.get(p).envMap&&(m.envMapIntensity.value=p.envMapIntensity)}function f(m,p,S){m.ior.value=p.ior,p.sheen>0&&(m.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),m.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(m.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,m.sheenColorMapTransform)),p.sheenRoughnessMap&&(m.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,m.sheenRoughnessMapTransform))),p.clearcoat>0&&(m.clearcoat.value=p.clearcoat,m.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(m.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,m.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(m.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,m.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(m.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,m.clearcoatNormalMapTransform),m.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===It&&m.clearcoatNormalScale.value.negate())),p.iridescence>0&&(m.iridescence.value=p.iridescence,m.iridescenceIOR.value=p.iridescenceIOR,m.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],m.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(m.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,m.iridescenceMapTransform)),p.iridescenceThicknessMap&&(m.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,m.iridescenceThicknessMapTransform))),p.transmission>0&&(m.transmission.value=p.transmission,m.transmissionSamplerMap.value=S.texture,m.transmissionSamplerSize.value.set(S.width,S.height),p.transmissionMap&&(m.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,m.transmissionMapTransform)),m.thickness.value=p.thickness,p.thicknessMap&&(m.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,m.thicknessMapTransform)),m.attenuationDistance.value=p.attenuationDistance,m.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(m.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(m.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,m.anisotropyMapTransform))),m.specularIntensity.value=p.specularIntensity,m.specularColor.value.copy(p.specularColor),p.specularColorMap&&(m.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,m.specularColorMapTransform)),p.specularIntensityMap&&(m.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,m.specularIntensityMapTransform))}function g(m,p){p.matcap&&(m.matcap.value=p.matcap)}function y(m,p){let S=e.get(p).light;m.referencePosition.value.setFromMatrixPosition(S.matrixWorld),m.nearDistance.value=S.shadow.camera.near,m.farDistance.value=S.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:s}}function oy(n,e,t,i){let s={},r={},o=[],a=t.isWebGL2?n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS):0;function c(S,v){let w=v.program;i.uniformBlockBinding(S,w)}function l(S,v){let w=s[S.id];w===void 0&&(g(S),w=h(S),s[S.id]=w,S.addEventListener("dispose",m));let C=v.program;i.updateUBOMapping(S,C);let T=e.render.frame;r[S.id]!==T&&(d(S),r[S.id]=T)}function h(S){let v=u();S.__bindingPointIndex=v;let w=n.createBuffer(),C=S.__size,T=S.usage;return n.bindBuffer(n.UNIFORM_BUFFER,w),n.bufferData(n.UNIFORM_BUFFER,C,T),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,v,w),w}function u(){for(let S=0;S<a;S++)if(o.indexOf(S)===-1)return o.push(S),S;return console.error("THREE.WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function d(S){let v=s[S.id],w=S.uniforms,C=S.__cache;n.bindBuffer(n.UNIFORM_BUFFER,v);for(let T=0,R=w.length;T<R;T++){let W=Array.isArray(w[T])?w[T]:[w[T]];for(let _=0,E=W.length;_<E;_++){let H=W[_];if(f(H,T,_,C)===!0){let V=H.__offset,Q=Array.isArray(H.value)?H.value:[H.value],I=0;for(let O=0;O<Q.length;O++){let z=Q[O],$=y(z);typeof z=="number"||typeof z=="boolean"?(H.__data[0]=z,n.bufferSubData(n.UNIFORM_BUFFER,V+I,H.__data)):z.isMatrix3?(H.__data[0]=z.elements[0],H.__data[1]=z.elements[1],H.__data[2]=z.elements[2],H.__data[3]=0,H.__data[4]=z.elements[3],H.__data[5]=z.elements[4],H.__data[6]=z.elements[5],H.__data[7]=0,H.__data[8]=z.elements[6],H.__data[9]=z.elements[7],H.__data[10]=z.elements[8],H.__data[11]=0):(z.toArray(H.__data,I),I+=$.storage/Float32Array.BYTES_PER_ELEMENT)}n.bufferSubData(n.UNIFORM_BUFFER,V,H.__data)}}}n.bindBuffer(n.UNIFORM_BUFFER,null)}function f(S,v,w,C){let T=S.value,R=v+"_"+w;if(C[R]===void 0)return typeof T=="number"||typeof T=="boolean"?C[R]=T:C[R]=T.clone(),!0;{let W=C[R];if(typeof T=="number"||typeof T=="boolean"){if(W!==T)return C[R]=T,!0}else if(W.equals(T)===!1)return W.copy(T),!0}return!1}function g(S){let v=S.uniforms,w=0,C=16;for(let R=0,W=v.length;R<W;R++){let _=Array.isArray(v[R])?v[R]:[v[R]];for(let E=0,H=_.length;E<H;E++){let V=_[E],Q=Array.isArray(V.value)?V.value:[V.value];for(let I=0,O=Q.length;I<O;I++){let z=Q[I],$=y(z),X=w%C;X!==0&&C-X<$.boundary&&(w+=C-X),V.__data=new Float32Array($.storage/Float32Array.BYTES_PER_ELEMENT),V.__offset=w,w+=$.storage}}}let T=w%C;return T>0&&(w+=C-T),S.__size=w,S.__cache={},this}function y(S){let v={boundary:0,storage:0};return typeof S=="number"||typeof S=="boolean"?(v.boundary=4,v.storage=4):S.isVector2?(v.boundary=8,v.storage=8):S.isVector3||S.isColor?(v.boundary=16,v.storage=12):S.isVector4?(v.boundary=16,v.storage=16):S.isMatrix3?(v.boundary=48,v.storage=48):S.isMatrix4?(v.boundary=64,v.storage=64):S.isTexture?console.warn("THREE.WebGLRenderer: Texture samplers can not be part of an uniforms group."):console.warn("THREE.WebGLRenderer: Unsupported uniform value type.",S),v}function m(S){let v=S.target;v.removeEventListener("dispose",m);let w=o.indexOf(v.__bindingPointIndex);o.splice(w,1),n.deleteBuffer(s[v.id]),delete s[v.id],delete r[v.id]}function p(){for(let S in s)n.deleteBuffer(s[S]);o=[],s={},r={}}return{bind:c,update:l,dispose:p}}var Wn=class{constructor(e={}){let{canvas:t=fd(),context:i=null,depth:s=!0,stencil:r=!0,alpha:o=!1,antialias:a=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:u=!1}=e;this.isWebGLRenderer=!0;let d;i!==null?d=i.getContextAttributes().alpha:d=o;let f=new Uint32Array(4),g=new Int32Array(4),y=null,m=null,p=[],S=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this._outputColorSpace=st,this._useLegacyLights=!1,this.toneMapping=Ii,this.toneMappingExposure=1;let v=this,w=!1,C=0,T=0,R=null,W=-1,_=null,E=new Qe,H=new Qe,V=null,Q=new me(0),I=0,O=t.width,z=t.height,$=1,X=null,q=null,Y=new Qe(0,0,O,z),se=new Qe(0,0,O,z),re=!1,G=new fs,K=!1,le=!1,ve=null,ye=new Ge,Ie=new Ee,ke=new L,Te={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};function We(){return R===null?$:1}let D=i;function bt(b,k){for(let F=0;F<b.length;F++){let B=b[F],U=t.getContext(B,k);if(U!==null)return U}return null}try{let b={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:u};if("setAttribute"in t&&t.setAttribute("data-engine","three.js r160"),t.addEventListener("webglcontextlost",J,!1),t.addEventListener("webglcontextrestored",P,!1),t.addEventListener("webglcontextcreationerror",ne,!1),D===null){let k=["webgl2","webgl","experimental-webgl"];if(v.isWebGL1Renderer===!0&&k.shift(),D=bt(k,b),D===null)throw bt(k)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}typeof WebGLRenderingContext<"u"&&D instanceof WebGLRenderingContext&&console.warn("THREE.WebGLRenderer: WebGL 1 support was deprecated in r153 and will be removed in r163."),D.getShaderPrecisionFormat===void 0&&(D.getShaderPrecisionFormat=function(){return{rangeMin:1,rangeMax:1,precision:1}})}catch(b){throw console.error("THREE.WebGLRenderer: "+b.message),b}let Se,Ce,fe,et,De,M,x,N,ee,Z,te,ge,ce,pe,Me,Oe,j,Ke,Be,Pe,be,he,A,ie;function xe(){Se=new Tm(D),Ce=new vm(D,Se,e),Se.init(Ce),he=new ny(D,Se,Ce),fe=new ty(D,Se,Ce),et=new Rm(D),De=new Gg,M=new iy(D,Se,fe,De,Ce,he,et),x=new bm(v),N=new Mm(v),ee=new Dd(D,Ce),A=new ym(D,Se,ee,Ce),Z=new Em(D,ee,et,A),te=new Im(D,Z,ee,et),Be=new Lm(D,Ce,M),Oe=new _m(De),ge=new Vg(v,x,N,Se,Ce,A,Oe),ce=new ry(v,De),pe=new Xg,Me=new Zg(Se,Ce),Ke=new gm(v,x,N,fe,te,d,c),j=new ey(v,te,Ce),ie=new oy(D,et,Ce,fe),Pe=new xm(D,Se,et,Ce),be=new Am(D,Se,et,Ce),et.programs=ge.programs,v.capabilities=Ce,v.extensions=Se,v.properties=De,v.renderLists=pe,v.shadowMap=j,v.state=fe,v.info=et}xe();let de=new ra(v,D);this.xr=de,this.getContext=function(){return D},this.getContextAttributes=function(){return D.getContextAttributes()},this.forceContextLoss=function(){let b=Se.get("WEBGL_lose_context");b&&b.loseContext()},this.forceContextRestore=function(){let b=Se.get("WEBGL_lose_context");b&&b.restoreContext()},this.getPixelRatio=function(){return $},this.setPixelRatio=function(b){b!==void 0&&($=b,this.setSize(O,z,!1))},this.getSize=function(b){return b.set(O,z)},this.setSize=function(b,k,F=!0){if(de.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}O=b,z=k,t.width=Math.floor(b*$),t.height=Math.floor(k*$),F===!0&&(t.style.width=b+"px",t.style.height=k+"px"),this.setViewport(0,0,b,k)},this.getDrawingBufferSize=function(b){return b.set(O*$,z*$).floor()},this.setDrawingBufferSize=function(b,k,F){O=b,z=k,$=F,t.width=Math.floor(b*F),t.height=Math.floor(k*F),this.setViewport(0,0,b,k)},this.getCurrentViewport=function(b){return b.copy(E)},this.getViewport=function(b){return b.copy(Y)},this.setViewport=function(b,k,F,B){b.isVector4?Y.set(b.x,b.y,b.z,b.w):Y.set(b,k,F,B),fe.viewport(E.copy(Y).multiplyScalar($).floor())},this.getScissor=function(b){return b.copy(se)},this.setScissor=function(b,k,F,B){b.isVector4?se.set(b.x,b.y,b.z,b.w):se.set(b,k,F,B),fe.scissor(H.copy(se).multiplyScalar($).floor())},this.getScissorTest=function(){return re},this.setScissorTest=function(b){fe.setScissorTest(re=b)},this.setOpaqueSort=function(b){X=b},this.setTransparentSort=function(b){q=b},this.getClearColor=function(b){return b.copy(Ke.getClearColor())},this.setClearColor=function(){Ke.setClearColor.apply(Ke,arguments)},this.getClearAlpha=function(){return Ke.getClearAlpha()},this.setClearAlpha=function(){Ke.setClearAlpha.apply(Ke,arguments)},this.clear=function(b=!0,k=!0,F=!0){let B=0;if(b){let U=!1;if(R!==null){let ue=R.texture.format;U=ue===ah||ue===oh||ue===rh}if(U){let ue=R.texture.type,_e=ue===ki||ue===Ci||ue===Sa||ue===en||ue===nh||ue===sh,Re=Ke.getClearColor(),Le=Ke.getClearAlpha(),ze=Re.r,Ne=Re.g,Ue=Re.b;_e?(f[0]=ze,f[1]=Ne,f[2]=Ue,f[3]=Le,D.clearBufferuiv(D.COLOR,0,f)):(g[0]=ze,g[1]=Ne,g[2]=Ue,g[3]=Le,D.clearBufferiv(D.COLOR,0,g))}else B|=D.COLOR_BUFFER_BIT}k&&(B|=D.DEPTH_BUFFER_BIT),F&&(B|=D.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),D.clear(B)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",J,!1),t.removeEventListener("webglcontextrestored",P,!1),t.removeEventListener("webglcontextcreationerror",ne,!1),pe.dispose(),Me.dispose(),De.dispose(),x.dispose(),N.dispose(),te.dispose(),A.dispose(),ie.dispose(),ge.dispose(),de.dispose(),de.removeEventListener("sessionstart",ct),de.removeEventListener("sessionend",Ye),ve&&(ve.dispose(),ve=null),ht.stop()};function J(b){b.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),w=!0}function P(){console.log("THREE.WebGLRenderer: Context Restored."),w=!1;let b=et.autoReset,k=j.enabled,F=j.autoUpdate,B=j.needsUpdate,U=j.type;xe(),et.autoReset=b,j.enabled=k,j.autoUpdate=F,j.needsUpdate=B,j.type=U}function ne(b){console.error("THREE.WebGLRenderer: A WebGL context could not be created. Reason: ",b.statusMessage)}function ae(b){let k=b.target;k.removeEventListener("dispose",ae),Ae(k)}function Ae(b){we(b),De.remove(b)}function we(b){let k=De.get(b).programs;k!==void 0&&(k.forEach(function(F){ge.releaseProgram(F)}),b.isShaderMaterial&&ge.releaseShaderCache(b))}this.renderBufferDirect=function(b,k,F,B,U,ue){k===null&&(k=Te);let _e=U.isMesh&&U.matrixWorld.determinant()<0,Re=Gh(b,k,F,B,U);fe.setMaterial(B,_e);let Le=F.index,ze=1;if(B.wireframe===!0){if(Le=Z.getWireframeAttribute(F),Le===void 0)return;ze=2}let Ne=F.drawRange,Ue=F.attributes.position,lt=Ne.start*ze,Nt=(Ne.start+Ne.count)*ze;ue!==null&&(lt=Math.max(lt,ue.start*ze),Nt=Math.min(Nt,(ue.start+ue.count)*ze)),Le!==null?(lt=Math.max(lt,0),Nt=Math.min(Nt,Le.count)):Ue!=null&&(lt=Math.max(lt,0),Nt=Math.min(Nt,Ue.count));let xt=Nt-lt;if(xt<0||xt===1/0)return;A.setup(U,B,Re,F,Le);let ci,nt=Pe;if(Le!==null&&(ci=ee.get(Le),nt=be,nt.setIndex(ci)),U.isMesh)B.wireframe===!0?(fe.setLineWidth(B.wireframeLinewidth*We()),nt.setMode(D.LINES)):nt.setMode(D.TRIANGLES);else if(U.isLine){let He=B.linewidth;He===void 0&&(He=1),fe.setLineWidth(He*We()),U.isLineSegments?nt.setMode(D.LINES):U.isLineLoop?nt.setMode(D.LINE_LOOP):nt.setMode(D.LINE_STRIP)}else U.isPoints?nt.setMode(D.POINTS):U.isSprite&&nt.setMode(D.TRIANGLES);if(U.isBatchedMesh)nt.renderMultiDraw(U._multiDrawStarts,U._multiDrawCounts,U._multiDrawCount);else if(U.isInstancedMesh)nt.renderInstances(lt,xt,U.count);else if(F.isInstancedBufferGeometry){let He=F._maxInstanceCount!==void 0?F._maxInstanceCount:1/0,eo=Math.min(F.instanceCount,He);nt.renderInstances(lt,xt,eo)}else nt.render(lt,xt)};function Xe(b,k,F){b.transparent===!0&&b.side===Jt&&b.forceSinglePass===!1?(b.side=It,b.needsUpdate=!0,Ls(b,k,F),b.side=ri,b.needsUpdate=!0,Ls(b,k,F),b.side=Jt):Ls(b,k,F)}this.compile=function(b,k,F=null){F===null&&(F=b),m=Me.get(F),m.init(),S.push(m),F.traverseVisible(function(U){U.isLight&&U.layers.test(k.layers)&&(m.pushLight(U),U.castShadow&&m.pushShadow(U))}),b!==F&&b.traverseVisible(function(U){U.isLight&&U.layers.test(k.layers)&&(m.pushLight(U),U.castShadow&&m.pushShadow(U))}),m.setupLights(v._useLegacyLights);let B=new Set;return b.traverse(function(U){let ue=U.material;if(ue)if(Array.isArray(ue))for(let _e=0;_e<ue.length;_e++){let Re=ue[_e];Xe(Re,F,U),B.add(Re)}else Xe(ue,F,U),B.add(ue)}),S.pop(),m=null,B},this.compileAsync=function(b,k,F=null){let B=this.compile(b,k,F);return new Promise(U=>{function ue(){if(B.forEach(function(_e){De.get(_e).currentProgram.isReady()&&B.delete(_e)}),B.size===0){U(b);return}setTimeout(ue,10)}Se.get("KHR_parallel_shader_compile")!==null?ue():setTimeout(ue,10)})};let qe=null;function rt(b){qe&&qe(b)}function ct(){ht.stop()}function Ye(){ht.start()}let ht=new gh;ht.setAnimationLoop(rt),typeof self<"u"&&ht.setContext(self),this.setAnimationLoop=function(b){qe=b,de.setAnimationLoop(b),b===null?ht.stop():ht.start()},de.addEventListener("sessionstart",ct),de.addEventListener("sessionend",Ye),this.render=function(b,k){if(k!==void 0&&k.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(w===!0)return;b.matrixWorldAutoUpdate===!0&&b.updateMatrixWorld(),k.parent===null&&k.matrixWorldAutoUpdate===!0&&k.updateMatrixWorld(),de.enabled===!0&&de.isPresenting===!0&&(de.cameraAutoUpdate===!0&&de.updateCamera(k),k=de.getCamera()),b.isScene===!0&&b.onBeforeRender(v,b,k,R),m=Me.get(b,S.length),m.init(),S.push(m),ye.multiplyMatrices(k.projectionMatrix,k.matrixWorldInverse),G.setFromProjectionMatrix(ye),le=this.localClippingEnabled,K=Oe.init(this.clippingPlanes,le),y=pe.get(b,p.length),y.init(),p.push(y),ti(b,k,0,v.sortObjects),y.finish(),v.sortObjects===!0&&y.sort(X,q),this.info.render.frame++,K===!0&&Oe.beginShadows();let F=m.state.shadowsArray;if(j.render(F,b,k),K===!0&&Oe.endShadows(),this.info.autoReset===!0&&this.info.reset(),Ke.render(y,b),m.setupLights(v._useLegacyLights),k.isArrayCamera){let B=k.cameras;for(let U=0,ue=B.length;U<ue;U++){let _e=B[U];lc(y,b,_e,_e.viewport)}}else lc(y,b,k);R!==null&&(M.updateMultisampleRenderTarget(R),M.updateRenderTargetMipmap(R)),b.isScene===!0&&b.onAfterRender(v,b,k),A.resetDefaultState(),W=-1,_=null,S.pop(),S.length>0?m=S[S.length-1]:m=null,p.pop(),p.length>0?y=p[p.length-1]:y=null};function ti(b,k,F,B){if(b.visible===!1)return;if(b.layers.test(k.layers)){if(b.isGroup)F=b.renderOrder;else if(b.isLOD)b.autoUpdate===!0&&b.update(k);else if(b.isLight)m.pushLight(b),b.castShadow&&m.pushShadow(b);else if(b.isSprite){if(!b.frustumCulled||G.intersectsSprite(b)){B&&ke.setFromMatrixPosition(b.matrixWorld).applyMatrix4(ye);let _e=te.update(b),Re=b.material;Re.visible&&y.push(b,_e,Re,F,ke.z,null)}}else if((b.isMesh||b.isLine||b.isPoints)&&(!b.frustumCulled||G.intersectsObject(b))){let _e=te.update(b),Re=b.material;if(B&&(b.boundingSphere!==void 0?(b.boundingSphere===null&&b.computeBoundingSphere(),ke.copy(b.boundingSphere.center)):(_e.boundingSphere===null&&_e.computeBoundingSphere(),ke.copy(_e.boundingSphere.center)),ke.applyMatrix4(b.matrixWorld).applyMatrix4(ye)),Array.isArray(Re)){let Le=_e.groups;for(let ze=0,Ne=Le.length;ze<Ne;ze++){let Ue=Le[ze],lt=Re[Ue.materialIndex];lt&&lt.visible&&y.push(b,_e,lt,F,ke.z,Ue)}}else Re.visible&&y.push(b,_e,Re,F,ke.z,null)}}let ue=b.children;for(let _e=0,Re=ue.length;_e<Re;_e++)ti(ue[_e],k,F,B)}function lc(b,k,F,B){let U=b.opaque,ue=b.transmissive,_e=b.transparent;m.setupLightsView(F),K===!0&&Oe.setGlobalState(v.clippingPlanes,F),ue.length>0&&Vh(U,ue,k,F),B&&fe.viewport(E.copy(B)),U.length>0&&Ps(U,k,F),ue.length>0&&Ps(ue,k,F),_e.length>0&&Ps(_e,k,F),fe.buffers.depth.setTest(!0),fe.buffers.depth.setMask(!0),fe.buffers.color.setMask(!0),fe.setPolygonOffset(!1)}function Vh(b,k,F,B){if((F.isScene===!0?F.overrideMaterial:null)!==null)return;let ue=Ce.isWebGL2;ve===null&&(ve=new xi(1,1,{generateMipmaps:!0,type:Se.has("EXT_color_buffer_half_float")?ds:ki,minFilter:Ni,samples:ue?4:0})),v.getDrawingBufferSize(Ie),ue?ve.setSize(Ie.x,Ie.y):ve.setSize(pr(Ie.x),pr(Ie.y));let _e=v.getRenderTarget();v.setRenderTarget(ve),v.getClearColor(Q),I=v.getClearAlpha(),I<1&&v.setClearColor(16777215,.5),v.clear();let Re=v.toneMapping;v.toneMapping=Ii,Ps(b,F,B),M.updateMultisampleRenderTarget(ve),M.updateRenderTargetMipmap(ve);let Le=!1;for(let ze=0,Ne=k.length;ze<Ne;ze++){let Ue=k[ze],lt=Ue.object,Nt=Ue.geometry,xt=Ue.material,ci=Ue.group;if(xt.side===Jt&&lt.layers.test(B.layers)){let nt=xt.side;xt.side=It,xt.needsUpdate=!0,hc(lt,F,B,Nt,xt,ci),xt.side=nt,xt.needsUpdate=!0,Le=!0}}Le===!0&&(M.updateMultisampleRenderTarget(ve),M.updateRenderTargetMipmap(ve)),v.setRenderTarget(_e),v.setClearColor(Q,I),v.toneMapping=Re}function Ps(b,k,F){let B=k.isScene===!0?k.overrideMaterial:null;for(let U=0,ue=b.length;U<ue;U++){let _e=b[U],Re=_e.object,Le=_e.geometry,ze=B===null?_e.material:B,Ne=_e.group;Re.layers.test(F.layers)&&hc(Re,k,F,Le,ze,Ne)}}function hc(b,k,F,B,U,ue){b.onBeforeRender(v,k,F,B,U,ue),b.modelViewMatrix.multiplyMatrices(F.matrixWorldInverse,b.matrixWorld),b.normalMatrix.getNormalMatrix(b.modelViewMatrix),U.onBeforeRender(v,k,F,B,b,ue),U.transparent===!0&&U.side===Jt&&U.forceSinglePass===!1?(U.side=It,U.needsUpdate=!0,v.renderBufferDirect(F,k,B,U,b,ue),U.side=ri,U.needsUpdate=!0,v.renderBufferDirect(F,k,B,U,b,ue),U.side=Jt):v.renderBufferDirect(F,k,B,U,b,ue),b.onAfterRender(v,k,F,B,U,ue)}function Ls(b,k,F){k.isScene!==!0&&(k=Te);let B=De.get(b),U=m.state.lights,ue=m.state.shadowsArray,_e=U.state.version,Re=ge.getParameters(b,U.state,ue,k,F),Le=ge.getProgramCacheKey(Re),ze=B.programs;B.environment=b.isMeshStandardMaterial?k.environment:null,B.fog=k.fog,B.envMap=(b.isMeshStandardMaterial?N:x).get(b.envMap||B.environment),ze===void 0&&(b.addEventListener("dispose",ae),ze=new Map,B.programs=ze);let Ne=ze.get(Le);if(Ne!==void 0){if(B.currentProgram===Ne&&B.lightsStateVersion===_e)return dc(b,Re),Ne}else Re.uniforms=ge.getUniforms(b),b.onBuild(F,Re,v),b.onBeforeCompile(Re,v),Ne=ge.acquireProgram(Re,Le),ze.set(Le,Ne),B.uniforms=Re.uniforms;let Ue=B.uniforms;return(!b.isShaderMaterial&&!b.isRawShaderMaterial||b.clipping===!0)&&(Ue.clippingPlanes=Oe.uniform),dc(b,Re),B.needsLights=Xh(b),B.lightsStateVersion=_e,B.needsLights&&(Ue.ambientLightColor.value=U.state.ambient,Ue.lightProbe.value=U.state.probe,Ue.directionalLights.value=U.state.directional,Ue.directionalLightShadows.value=U.state.directionalShadow,Ue.spotLights.value=U.state.spot,Ue.spotLightShadows.value=U.state.spotShadow,Ue.rectAreaLights.value=U.state.rectArea,Ue.ltc_1.value=U.state.rectAreaLTC1,Ue.ltc_2.value=U.state.rectAreaLTC2,Ue.pointLights.value=U.state.point,Ue.pointLightShadows.value=U.state.pointShadow,Ue.hemisphereLights.value=U.state.hemi,Ue.directionalShadowMap.value=U.state.directionalShadowMap,Ue.directionalShadowMatrix.value=U.state.directionalShadowMatrix,Ue.spotShadowMap.value=U.state.spotShadowMap,Ue.spotLightMatrix.value=U.state.spotLightMatrix,Ue.spotLightMap.value=U.state.spotLightMap,Ue.pointShadowMap.value=U.state.pointShadowMap,Ue.pointShadowMatrix.value=U.state.pointShadowMatrix),B.currentProgram=Ne,B.uniformsList=null,Ne}function uc(b){if(b.uniformsList===null){let k=b.currentProgram.getUniforms();b.uniformsList=On.seqWithValue(k.seq,b.uniforms)}return b.uniformsList}function dc(b,k){let F=De.get(b);F.outputColorSpace=k.outputColorSpace,F.batching=k.batching,F.instancing=k.instancing,F.instancingColor=k.instancingColor,F.skinning=k.skinning,F.morphTargets=k.morphTargets,F.morphNormals=k.morphNormals,F.morphColors=k.morphColors,F.morphTargetsCount=k.morphTargetsCount,F.numClippingPlanes=k.numClippingPlanes,F.numIntersection=k.numClipIntersection,F.vertexAlphas=k.vertexAlphas,F.vertexTangents=k.vertexTangents,F.toneMapping=k.toneMapping}function Gh(b,k,F,B,U){k.isScene!==!0&&(k=Te),M.resetTextureUnits();let ue=k.fog,_e=B.isMeshStandardMaterial?k.environment:null,Re=R===null?v.outputColorSpace:R.isXRRenderTarget===!0?R.texture.colorSpace:mt,Le=(B.isMeshStandardMaterial?N:x).get(B.envMap||_e),ze=B.vertexColors===!0&&!!F.attributes.color&&F.attributes.color.itemSize===4,Ne=!!F.attributes.tangent&&(!!B.normalMap||B.anisotropy>0),Ue=!!F.morphAttributes.position,lt=!!F.morphAttributes.normal,Nt=!!F.morphAttributes.color,xt=Ii;B.toneMapped&&(R===null||R.isXRRenderTarget===!0)&&(xt=v.toneMapping);let ci=F.morphAttributes.position||F.morphAttributes.normal||F.morphAttributes.color,nt=ci!==void 0?ci.length:0,He=De.get(B),eo=m.state.lights;if(K===!0&&(le===!0||b!==_)){let zt=b===_&&B.id===W;Oe.setState(B,b,zt)}let ot=!1;B.version===He.__version?(He.needsLights&&He.lightsStateVersion!==eo.state.version||He.outputColorSpace!==Re||U.isBatchedMesh&&He.batching===!1||!U.isBatchedMesh&&He.batching===!0||U.isInstancedMesh&&He.instancing===!1||!U.isInstancedMesh&&He.instancing===!0||U.isSkinnedMesh&&He.skinning===!1||!U.isSkinnedMesh&&He.skinning===!0||U.isInstancedMesh&&He.instancingColor===!0&&U.instanceColor===null||U.isInstancedMesh&&He.instancingColor===!1&&U.instanceColor!==null||He.envMap!==Le||B.fog===!0&&He.fog!==ue||He.numClippingPlanes!==void 0&&(He.numClippingPlanes!==Oe.numPlanes||He.numIntersection!==Oe.numIntersection)||He.vertexAlphas!==ze||He.vertexTangents!==Ne||He.morphTargets!==Ue||He.morphNormals!==lt||He.morphColors!==Nt||He.toneMapping!==xt||Ce.isWebGL2===!0&&He.morphTargetsCount!==nt)&&(ot=!0):(ot=!0,He.__version=B.version);let Wi=He.currentProgram;ot===!0&&(Wi=Ls(B,k,U));let pc=!1,Jn=!1,to=!1,Tt=Wi.getUniforms(),Xi=He.uniforms;if(fe.useProgram(Wi.program)&&(pc=!0,Jn=!0,to=!0),B.id!==W&&(W=B.id,Jn=!0),pc||_!==b){Tt.setValue(D,"projectionMatrix",b.projectionMatrix),Tt.setValue(D,"viewMatrix",b.matrixWorldInverse);let zt=Tt.map.cameraPosition;zt!==void 0&&zt.setValue(D,ke.setFromMatrixPosition(b.matrixWorld)),Ce.logarithmicDepthBuffer&&Tt.setValue(D,"logDepthBufFC",2/(Math.log(b.far+1)/Math.LN2)),(B.isMeshPhongMaterial||B.isMeshToonMaterial||B.isMeshLambertMaterial||B.isMeshBasicMaterial||B.isMeshStandardMaterial||B.isShaderMaterial)&&Tt.setValue(D,"isOrthographic",b.isOrthographicCamera===!0),_!==b&&(_=b,Jn=!0,to=!0)}if(U.isSkinnedMesh){Tt.setOptional(D,U,"bindMatrix"),Tt.setOptional(D,U,"bindMatrixInverse");let zt=U.skeleton;zt&&(Ce.floatVertexTextures?(zt.boneTexture===null&&zt.computeBoneTexture(),Tt.setValue(D,"boneTexture",zt.boneTexture,M)):console.warn("THREE.WebGLRenderer: SkinnedMesh can only be used with WebGL 2. With WebGL 1 OES_texture_float and vertex textures support is required."))}U.isBatchedMesh&&(Tt.setOptional(D,U,"batchingTexture"),Tt.setValue(D,"batchingTexture",U._matricesTexture,M));let io=F.morphAttributes;if((io.position!==void 0||io.normal!==void 0||io.color!==void 0&&Ce.isWebGL2===!0)&&Be.update(U,F,Wi),(Jn||He.receiveShadow!==U.receiveShadow)&&(He.receiveShadow=U.receiveShadow,Tt.setValue(D,"receiveShadow",U.receiveShadow)),B.isMeshGouraudMaterial&&B.envMap!==null&&(Xi.envMap.value=Le,Xi.flipEnvMap.value=Le.isCubeTexture&&Le.isRenderTargetTexture===!1?-1:1),Jn&&(Tt.setValue(D,"toneMappingExposure",v.toneMappingExposure),He.needsLights&&Wh(Xi,to),ue&&B.fog===!0&&ce.refreshFogUniforms(Xi,ue),ce.refreshMaterialUniforms(Xi,B,$,z,ve),On.upload(D,uc(He),Xi,M)),B.isShaderMaterial&&B.uniformsNeedUpdate===!0&&(On.upload(D,uc(He),Xi,M),B.uniformsNeedUpdate=!1),B.isSpriteMaterial&&Tt.setValue(D,"center",U.center),Tt.setValue(D,"modelViewMatrix",U.modelViewMatrix),Tt.setValue(D,"normalMatrix",U.normalMatrix),Tt.setValue(D,"modelMatrix",U.matrixWorld),B.isShaderMaterial||B.isRawShaderMaterial){let zt=B.uniformsGroups;for(let no=0,qh=zt.length;no<qh;no++)if(Ce.isWebGL2){let fc=zt[no];ie.update(fc,Wi),ie.bind(fc,Wi)}else console.warn("THREE.WebGLRenderer: Uniform Buffer Objects can only be used with WebGL 2.")}return Wi}function Wh(b,k){b.ambientLightColor.needsUpdate=k,b.lightProbe.needsUpdate=k,b.directionalLights.needsUpdate=k,b.directionalLightShadows.needsUpdate=k,b.pointLights.needsUpdate=k,b.pointLightShadows.needsUpdate=k,b.spotLights.needsUpdate=k,b.spotLightShadows.needsUpdate=k,b.rectAreaLights.needsUpdate=k,b.hemisphereLights.needsUpdate=k}function Xh(b){return b.isMeshLambertMaterial||b.isMeshToonMaterial||b.isMeshPhongMaterial||b.isMeshStandardMaterial||b.isShadowMaterial||b.isShaderMaterial&&b.lights===!0}this.getActiveCubeFace=function(){return C},this.getActiveMipmapLevel=function(){return T},this.getRenderTarget=function(){return R},this.setRenderTargetTextures=function(b,k,F){De.get(b.texture).__webglTexture=k,De.get(b.depthTexture).__webglTexture=F;let B=De.get(b);B.__hasExternalTextures=!0,B.__hasExternalTextures&&(B.__autoAllocateDepthBuffer=F===void 0,B.__autoAllocateDepthBuffer||Se.has("WEBGL_multisampled_render_to_texture")===!0&&(console.warn("THREE.WebGLRenderer: Render-to-texture extension was disabled because an external texture was provided"),B.__useRenderToTexture=!1))},this.setRenderTargetFramebuffer=function(b,k){let F=De.get(b);F.__webglFramebuffer=k,F.__useDefaultFramebuffer=k===void 0},this.setRenderTarget=function(b,k=0,F=0){R=b,C=k,T=F;let B=!0,U=null,ue=!1,_e=!1;if(b){let Le=De.get(b);Le.__useDefaultFramebuffer!==void 0?(fe.bindFramebuffer(D.FRAMEBUFFER,null),B=!1):Le.__webglFramebuffer===void 0?M.setupRenderTarget(b):Le.__hasExternalTextures&&M.rebindTextures(b,De.get(b.texture).__webglTexture,De.get(b.depthTexture).__webglTexture);let ze=b.texture;(ze.isData3DTexture||ze.isDataArrayTexture||ze.isCompressedArrayTexture)&&(_e=!0);let Ne=De.get(b).__webglFramebuffer;b.isWebGLCubeRenderTarget?(Array.isArray(Ne[k])?U=Ne[k][F]:U=Ne[k],ue=!0):Ce.isWebGL2&&b.samples>0&&M.useMultisampledRTT(b)===!1?U=De.get(b).__webglMultisampledFramebuffer:Array.isArray(Ne)?U=Ne[F]:U=Ne,E.copy(b.viewport),H.copy(b.scissor),V=b.scissorTest}else E.copy(Y).multiplyScalar($).floor(),H.copy(se).multiplyScalar($).floor(),V=re;if(fe.bindFramebuffer(D.FRAMEBUFFER,U)&&Ce.drawBuffers&&B&&fe.drawBuffers(b,U),fe.viewport(E),fe.scissor(H),fe.setScissorTest(V),ue){let Le=De.get(b.texture);D.framebufferTexture2D(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,D.TEXTURE_CUBE_MAP_POSITIVE_X+k,Le.__webglTexture,F)}else if(_e){let Le=De.get(b.texture),ze=k||0;D.framebufferTextureLayer(D.FRAMEBUFFER,D.COLOR_ATTACHMENT0,Le.__webglTexture,F||0,ze)}W=-1},this.readRenderTargetPixels=function(b,k,F,B,U,ue,_e){if(!(b&&b.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Re=De.get(b).__webglFramebuffer;if(b.isWebGLCubeRenderTarget&&_e!==void 0&&(Re=Re[_e]),Re){fe.bindFramebuffer(D.FRAMEBUFFER,Re);try{let Le=b.texture,ze=Le.format,Ne=Le.type;if(ze!==Vt&&he.convert(ze)!==D.getParameter(D.IMPLEMENTATION_COLOR_READ_FORMAT)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}let Ue=Ne===ds&&(Se.has("EXT_color_buffer_half_float")||Ce.isWebGL2&&Se.has("EXT_color_buffer_float"));if(Ne!==ki&&he.convert(Ne)!==D.getParameter(D.IMPLEMENTATION_COLOR_READ_TYPE)&&!(Ne===gi&&(Ce.isWebGL2||Se.has("OES_texture_float")||Se.has("WEBGL_color_buffer_float")))&&!Ue){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}k>=0&&k<=b.width-B&&F>=0&&F<=b.height-U&&D.readPixels(k,F,B,U,he.convert(ze),he.convert(Ne),ue)}finally{let Le=R!==null?De.get(R).__webglFramebuffer:null;fe.bindFramebuffer(D.FRAMEBUFFER,Le)}}},this.copyFramebufferToTexture=function(b,k,F=0){let B=Math.pow(2,-F),U=Math.floor(k.image.width*B),ue=Math.floor(k.image.height*B);M.setTexture2D(k,0),D.copyTexSubImage2D(D.TEXTURE_2D,F,0,0,b.x,b.y,U,ue),fe.unbindTexture()},this.copyTextureToTexture=function(b,k,F,B=0){let U=k.image.width,ue=k.image.height,_e=he.convert(F.format),Re=he.convert(F.type);M.setTexture2D(F,0),D.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,F.flipY),D.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,F.premultiplyAlpha),D.pixelStorei(D.UNPACK_ALIGNMENT,F.unpackAlignment),k.isDataTexture?D.texSubImage2D(D.TEXTURE_2D,B,b.x,b.y,U,ue,_e,Re,k.image.data):k.isCompressedTexture?D.compressedTexSubImage2D(D.TEXTURE_2D,B,b.x,b.y,k.mipmaps[0].width,k.mipmaps[0].height,_e,k.mipmaps[0].data):D.texSubImage2D(D.TEXTURE_2D,B,b.x,b.y,_e,Re,k.image),B===0&&F.generateMipmaps&&D.generateMipmap(D.TEXTURE_2D),fe.unbindTexture()},this.copyTextureToTexture3D=function(b,k,F,B,U=0){if(v.isWebGL1Renderer){console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: can only be used with WebGL2.");return}let ue=b.max.x-b.min.x+1,_e=b.max.y-b.min.y+1,Re=b.max.z-b.min.z+1,Le=he.convert(B.format),ze=he.convert(B.type),Ne;if(B.isData3DTexture)M.setTexture3D(B,0),Ne=D.TEXTURE_3D;else if(B.isDataArrayTexture||B.isCompressedArrayTexture)M.setTexture2DArray(B,0),Ne=D.TEXTURE_2D_ARRAY;else{console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.");return}D.pixelStorei(D.UNPACK_FLIP_Y_WEBGL,B.flipY),D.pixelStorei(D.UNPACK_PREMULTIPLY_ALPHA_WEBGL,B.premultiplyAlpha),D.pixelStorei(D.UNPACK_ALIGNMENT,B.unpackAlignment);let Ue=D.getParameter(D.UNPACK_ROW_LENGTH),lt=D.getParameter(D.UNPACK_IMAGE_HEIGHT),Nt=D.getParameter(D.UNPACK_SKIP_PIXELS),xt=D.getParameter(D.UNPACK_SKIP_ROWS),ci=D.getParameter(D.UNPACK_SKIP_IMAGES),nt=F.isCompressedTexture?F.mipmaps[U]:F.image;D.pixelStorei(D.UNPACK_ROW_LENGTH,nt.width),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,nt.height),D.pixelStorei(D.UNPACK_SKIP_PIXELS,b.min.x),D.pixelStorei(D.UNPACK_SKIP_ROWS,b.min.y),D.pixelStorei(D.UNPACK_SKIP_IMAGES,b.min.z),F.isDataTexture||F.isData3DTexture?D.texSubImage3D(Ne,U,k.x,k.y,k.z,ue,_e,Re,Le,ze,nt.data):F.isCompressedArrayTexture?(console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: untested support for compressed srcTexture."),D.compressedTexSubImage3D(Ne,U,k.x,k.y,k.z,ue,_e,Re,Le,nt.data)):D.texSubImage3D(Ne,U,k.x,k.y,k.z,ue,_e,Re,Le,ze,nt),D.pixelStorei(D.UNPACK_ROW_LENGTH,Ue),D.pixelStorei(D.UNPACK_IMAGE_HEIGHT,lt),D.pixelStorei(D.UNPACK_SKIP_PIXELS,Nt),D.pixelStorei(D.UNPACK_SKIP_ROWS,xt),D.pixelStorei(D.UNPACK_SKIP_IMAGES,ci),U===0&&B.generateMipmaps&&D.generateMipmap(Ne),fe.unbindTexture()},this.initTexture=function(b){b.isCubeTexture?M.setTextureCube(b,0):b.isData3DTexture?M.setTexture3D(b,0):b.isDataArrayTexture||b.isCompressedArrayTexture?M.setTexture2DArray(b,0):M.setTexture2D(b,0),fe.unbindTexture()},this.resetState=function(){C=0,T=0,R=null,fe.reset(),A.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return yi}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=e===Ta?"display-p3":"srgb",t.unpackColorSpace=je.workingColorSpace===Gr?"display-p3":"srgb"}get outputEncoding(){return console.warn("THREE.WebGLRenderer: Property .outputEncoding has been removed. Use .outputColorSpace instead."),this.outputColorSpace===st?nn:hh}set outputEncoding(e){console.warn("THREE.WebGLRenderer: Property .outputEncoding has been removed. Use .outputColorSpace instead."),this.outputColorSpace=e===nn?st:mt}get useLegacyLights(){return console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights}set useLegacyLights(e){console.warn("THREE.WebGLRenderer: The property .useLegacyLights has been deprecated. Migrate your lighting according to the following guide: https://discourse.threejs.org/t/updates-to-lighting-in-three-js-r155/53733."),this._useLegacyLights=e}},oa=class extends Wn{};oa.prototype.isWebGL1Renderer=!0;var gs=class extends at{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t}},ys=class{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=Go,this._updateRange={offset:0,count:-1},this.updateRanges=[],this.version=0,this.uuid=Qt()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}get updateRange(){return console.warn("THREE.InterleavedBuffer: updateRange() is deprecated and will be removed in r169. Use addUpdateRange() instead."),this._updateRange}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,i){e*=this.stride,i*=t.stride;for(let s=0,r=this.stride;s<r;s++)this.array[e+s]=t.array[i+s];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Qt()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),i=new this.constructor(t,this.stride);return i.setUsage(this.usage),i}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Qt()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}},Ct=new L,xs=class n{constructor(e,t,i,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=i,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,i=this.data.count;t<i;t++)Ct.fromBufferAttribute(this,t),Ct.applyMatrix4(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)Ct.fromBufferAttribute(this,t),Ct.applyNormalMatrix(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)Ct.fromBufferAttribute(this,t),Ct.transformDirection(e),this.setXYZ(t,Ct.x,Ct.y,Ct.z);return this}setX(e,t){return this.normalized&&(t=Ze(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=Ze(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=Ze(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=Ze(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=ni(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=ni(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=ni(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=ni(t,this.array)),t}setXY(e,t,i){return e=e*this.data.stride+this.offset,this.normalized&&(t=Ze(t,this.array),i=Ze(i,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this}setXYZ(e,t,i,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=Ze(t,this.array),i=Ze(i,this.array),s=Ze(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this.data.array[e+2]=s,this}setXYZW(e,t,i,s,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=Ze(t,this.array),i=Ze(i,this.array),s=Ze(s,this.array),r=Ze(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=i,this.data.array[e+2]=s,this.data.array[e+3]=r,this}clone(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let i=0;i<this.count;i++){let s=i*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return new ft(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new n(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let i=0;i<this.count;i++){let s=i*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}};var kl=new L,Nl=new Qe,Dl=new Qe,ay=new L,Ol=new Ge,er=new L,No=new Ft,Ul=new Ge,Do=new Di,Tr=class extends _t{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=bc,this.bindMatrix=new Ge,this.bindMatrixInverse=new Ge,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){let e=this.geometry;this.boundingBox===null&&(this.boundingBox=new Wt),this.boundingBox.makeEmpty();let t=e.getAttribute("position");for(let i=0;i<t.count;i++)this.getVertexPosition(i,er),this.boundingBox.expandByPoint(er)}computeBoundingSphere(){let e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new Ft),this.boundingSphere.makeEmpty();let t=e.getAttribute("position");for(let i=0;i<t.count;i++)this.getVertexPosition(i,er),this.boundingSphere.expandByPoint(er)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}raycast(e,t){let i=this.material,s=this.matrixWorld;i!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),No.copy(this.boundingSphere),No.applyMatrix4(s),e.ray.intersectsSphere(No)!==!1&&(Ul.copy(s).invert(),Do.copy(e.ray).applyMatrix4(Ul),!(this.boundingBox!==null&&Do.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(e,t,Do)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){let e=new Qe,t=this.geometry.attributes.skinWeight;for(let i=0,s=t.count;i<s;i++){e.fromBufferAttribute(t,i);let r=1/e.manhattanLength();r!==1/0?e.multiplyScalar(r):e.set(1,0,0,0),t.setXYZW(i,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===bc?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===ku?this.bindMatrixInverse.copy(this.bindMatrix).invert():console.warn("THREE.SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(e,t){let i=this.skeleton,s=this.geometry;Nl.fromBufferAttribute(s.attributes.skinIndex,e),Dl.fromBufferAttribute(s.attributes.skinWeight,e),kl.copy(t).applyMatrix4(this.bindMatrix),t.set(0,0,0);for(let r=0;r<4;r++){let o=Dl.getComponent(r);if(o!==0){let a=Nl.getComponent(r);Ol.multiplyMatrices(i.bones[a].matrixWorld,i.boneInverses[a]),t.addScaledVector(ay.copy(kl).applyMatrix4(Ol),o)}}return t.applyMatrix4(this.bindMatrixInverse)}boneTransform(e,t){return console.warn("THREE.SkinnedMesh: .boneTransform() was renamed to .applyBoneTransform() in r151."),this.applyBoneTransform(e,t)}},vs=class extends at{constructor(){super(),this.isBone=!0,this.type="Bone"}},aa=class extends Rt{constructor(e=null,t=1,i=1,s,r,o,a,c,l=pt,h=pt,u,d){super(null,o,a,c,l,h,s,r,u,d),this.isDataTexture=!0,this.image={data:e,width:t,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}},Fl=new Ge,cy=new Ge,Er=class n{constructor(e=[],t=[]){this.uuid=Qt(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){let e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){console.warn("THREE.Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let i=0,s=this.bones.length;i<s;i++)this.boneInverses.push(new Ge)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){let i=new Ge;this.bones[e]&&i.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(i)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){let i=this.bones[e];i&&i.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){let i=this.bones[e];i&&(i.parent&&i.parent.isBone?(i.matrix.copy(i.parent.matrixWorld).invert(),i.matrix.multiply(i.matrixWorld)):i.matrix.copy(i.matrixWorld),i.matrix.decompose(i.position,i.quaternion,i.scale))}}update(){let e=this.bones,t=this.boneInverses,i=this.boneMatrices,s=this.boneTexture;for(let r=0,o=e.length;r<o;r++){let a=e[r]?e[r].matrixWorld:cy;Fl.multiplyMatrices(a,t[r]),Fl.toArray(i,r*16)}s!==null&&(s.needsUpdate=!0)}clone(){return new n(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);let t=new Float32Array(e*e*4);t.set(this.boneMatrices);let i=new aa(t,e,e,Vt,gi);return i.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=i,this}getBoneByName(e){for(let t=0,i=this.bones.length;t<i;t++){let s=this.bones[t];if(s.name===e)return s}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let i=0,s=e.bones.length;i<s;i++){let r=e.bones[i],o=t[r];o===void 0&&(console.warn("THREE.Skeleton: No bone found with UUID:",r),o=new vs),this.bones.push(o),this.boneInverses.push(new Ge().fromArray(e.boneInverses[i]))}return this.init(),this}toJSON(){let e={metadata:{version:4.6,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};e.uuid=this.uuid;let t=this.bones,i=this.boneInverses;for(let s=0,r=t.length;s<r;s++){let o=t[s];e.bones.push(o.uuid);let a=i[s];e.boneInverses.push(a.toArray())}return e}},on=class extends ft{constructor(e,t,i,s=1){super(e,t,i),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}},Rn=new Ge,Bl=new Ge,tr=[],zl=new Wt,ly=new Ge,ns=new _t,ss=new Ft,Ar=class extends _t{constructor(e,t,i){super(e,t),this.isInstancedMesh=!0,this.instanceMatrix=new on(new Float32Array(i*16),16),this.instanceColor=null,this.count=i,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<i;s++)this.setMatrixAt(s,ly)}computeBoundingBox(){let e=this.geometry,t=this.count;this.boundingBox===null&&(this.boundingBox=new Wt),e.boundingBox===null&&e.computeBoundingBox(),this.boundingBox.makeEmpty();for(let i=0;i<t;i++)this.getMatrixAt(i,Rn),zl.copy(e.boundingBox).applyMatrix4(Rn),this.boundingBox.union(zl)}computeBoundingSphere(){let e=this.geometry,t=this.count;this.boundingSphere===null&&(this.boundingSphere=new Ft),e.boundingSphere===null&&e.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let i=0;i<t;i++)this.getMatrixAt(i,Rn),ss.copy(e.boundingSphere).applyMatrix4(Rn),this.boundingSphere.union(ss)}copy(e,t){return super.copy(e,t),this.instanceMatrix.copy(e.instanceMatrix),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}raycast(e,t){let i=this.matrixWorld,s=this.count;if(ns.geometry=this.geometry,ns.material=this.material,ns.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),ss.copy(this.boundingSphere),ss.applyMatrix4(i),e.ray.intersectsSphere(ss)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,Rn),Bl.multiplyMatrices(i,Rn),ns.matrixWorld=Bl,ns.raycast(e,tr);for(let o=0,a=tr.length;o<a;o++){let c=tr[o];c.instanceId=r,c.object=this,t.push(c)}tr.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new on(new Float32Array(this.instanceMatrix.count*3),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"})}};var an=class extends Bt{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new me(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},Hl=new L,Vl=new L,Gl=new Ge,Oo=new Di,ir=new Ft,Xn=class extends at{constructor(e=new Mt,t=new an){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,i=[0];for(let s=1,r=t.count;s<r;s++)Hl.fromBufferAttribute(t,s-1),Vl.fromBufferAttribute(t,s),i[s]=i[s-1],i[s]+=Hl.distanceTo(Vl);e.setAttribute("lineDistance",new it(i,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){let i=this.geometry,s=this.matrixWorld,r=e.params.Line.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),ir.copy(i.boundingSphere),ir.applyMatrix4(s),ir.radius+=r,e.ray.intersectsSphere(ir)===!1)return;Gl.copy(s).invert(),Oo.copy(e.ray).applyMatrix4(Gl);let a=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=a*a,l=new L,h=new L,u=new L,d=new L,f=this.isLineSegments?2:1,g=i.index,m=i.attributes.position;if(g!==null){let p=Math.max(0,o.start),S=Math.min(g.count,o.start+o.count);for(let v=p,w=S-1;v<w;v+=f){let C=g.getX(v),T=g.getX(v+1);if(l.fromBufferAttribute(m,C),h.fromBufferAttribute(m,T),Oo.distanceSqToSegment(l,h,d,u)>c)continue;d.applyMatrix4(this.matrixWorld);let W=e.ray.origin.distanceTo(d);W<e.near||W>e.far||t.push({distance:W,point:u.clone().applyMatrix4(this.matrixWorld),index:v,face:null,faceIndex:null,object:this})}}else{let p=Math.max(0,o.start),S=Math.min(m.count,o.start+o.count);for(let v=p,w=S-1;v<w;v+=f){if(l.fromBufferAttribute(m,v),h.fromBufferAttribute(m,v+1),Oo.distanceSqToSegment(l,h,d,u)>c)continue;d.applyMatrix4(this.matrixWorld);let T=e.ray.origin.distanceTo(d);T<e.near||T>e.far||t.push({distance:T,point:u.clone().applyMatrix4(this.matrixWorld),index:v,face:null,faceIndex:null,object:this})}}}updateMorphTargets(){let t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){let s=t[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}},Wl=new L,Xl=new L,qn=class extends Xn{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,i=[];for(let s=0,r=t.count;s<r;s+=2)Wl.fromBufferAttribute(t,s),Xl.fromBufferAttribute(t,s+1),i[s]=s===0?0:i[s-1],i[s+1]=i[s]+Wl.distanceTo(Xl);e.setAttribute("lineDistance",new it(i,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}},Rr=class extends Xn{constructor(e,t){super(e,t),this.isLineLoop=!0,this.type="LineLoop"}},_s=class extends Bt{constructor(e){super(),this.isPointsMaterial=!0,this.type="PointsMaterial",this.color=new me(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.fog=e.fog,this}},ql=new Ge,ca=new Di,nr=new Ft,sr=new L,Cr=class extends at{constructor(e=new Mt,t=new _s){super(),this.isPoints=!0,this.type="Points",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}raycast(e,t){let i=this.geometry,s=this.matrixWorld,r=e.params.Points.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),nr.copy(i.boundingSphere),nr.applyMatrix4(s),nr.radius+=r,e.ray.intersectsSphere(nr)===!1)return;ql.copy(s).invert(),ca.copy(e.ray).applyMatrix4(ql);let a=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=a*a,l=i.index,u=i.attributes.position;if(l!==null){let d=Math.max(0,o.start),f=Math.min(l.count,o.start+o.count);for(let g=d,y=f;g<y;g++){let m=l.getX(g);sr.fromBufferAttribute(u,m),$l(sr,m,c,s,e,t,this)}}else{let d=Math.max(0,o.start),f=Math.min(u.count,o.start+o.count);for(let g=d,y=f;g<y;g++)sr.fromBufferAttribute(u,g),$l(sr,g,c,s,e,t,this)}}updateMorphTargets(){let t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){let s=t[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}};function $l(n,e,t,i,s,r,o){let a=ca.distanceSqToPoint(n);if(a<t){let c=new L;ca.closestPointToPoint(n,c),c.applyMatrix4(i);let l=s.ray.origin.distanceTo(c);if(l<s.near||l>s.far)return;r.push({distance:l,distanceToRay:Math.sqrt(a),point:c,index:e,face:null,object:o})}}var bs=class n extends Mt{constructor(e=1,t=1,i=1,s=32,r=1,o=!1,a=0,c=Math.PI*2){super(),this.type="CylinderGeometry",this.parameters={radiusTop:e,radiusBottom:t,height:i,radialSegments:s,heightSegments:r,openEnded:o,thetaStart:a,thetaLength:c};let l=this;s=Math.floor(s),r=Math.floor(r);let h=[],u=[],d=[],f=[],g=0,y=[],m=i/2,p=0;S(),o===!1&&(e>0&&v(!0),t>0&&v(!1)),this.setIndex(h),this.setAttribute("position",new it(u,3)),this.setAttribute("normal",new it(d,3)),this.setAttribute("uv",new it(f,2));function S(){let w=new L,C=new L,T=0,R=(t-e)/i;for(let W=0;W<=r;W++){let _=[],E=W/r,H=E*(t-e)+e;for(let V=0;V<=s;V++){let Q=V/s,I=Q*c+a,O=Math.sin(I),z=Math.cos(I);C.x=H*O,C.y=-E*i+m,C.z=H*z,u.push(C.x,C.y,C.z),w.set(O,R,z).normalize(),d.push(w.x,w.y,w.z),f.push(Q,1-E),_.push(g++)}y.push(_)}for(let W=0;W<s;W++)for(let _=0;_<r;_++){let E=y[_][W],H=y[_+1][W],V=y[_+1][W+1],Q=y[_][W+1];h.push(E,H,Q),h.push(H,V,Q),T+=6}l.addGroup(p,T,0),p+=T}function v(w){let C=g,T=new Ee,R=new L,W=0,_=w===!0?e:t,E=w===!0?1:-1;for(let V=1;V<=s;V++)u.push(0,m*E,0),d.push(0,E,0),f.push(.5,.5),g++;let H=g;for(let V=0;V<=s;V++){let I=V/s*c+a,O=Math.cos(I),z=Math.sin(I);R.x=_*z,R.y=m*E,R.z=_*O,u.push(R.x,R.y,R.z),d.push(0,E,0),T.x=O*.5+.5,T.y=z*.5*E+.5,f.push(T.x,T.y),g++}for(let V=0;V<s;V++){let Q=C+V,I=H+V;w===!0?h.push(I,I+1,Q):h.push(I+1,I,Q),W+=3}l.addGroup(p,W,w===!0?1:2),p+=W}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new n(e.radiusTop,e.radiusBottom,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}},Pr=class n extends bs{constructor(e=1,t=1,i=32,s=1,r=!1,o=0,a=Math.PI*2){super(0,e,t,i,s,r,o,a),this.type="ConeGeometry",this.parameters={radius:e,height:t,radialSegments:i,heightSegments:s,openEnded:r,thetaStart:o,thetaLength:a}}static fromJSON(e){return new n(e.radius,e.height,e.radialSegments,e.heightSegments,e.openEnded,e.thetaStart,e.thetaLength)}};var Ss=class n extends Mt{constructor(e=1,t=32,i=16,s=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:i,phiStart:s,phiLength:r,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),i=Math.max(2,Math.floor(i));let c=Math.min(o+a,Math.PI),l=0,h=[],u=new L,d=new L,f=[],g=[],y=[],m=[];for(let p=0;p<=i;p++){let S=[],v=p/i,w=0;p===0&&o===0?w=.5/t:p===i&&c===Math.PI&&(w=-.5/t);for(let C=0;C<=t;C++){let T=C/t;u.x=-e*Math.cos(s+T*r)*Math.sin(o+v*a),u.y=e*Math.cos(o+v*a),u.z=e*Math.sin(s+T*r)*Math.sin(o+v*a),g.push(u.x,u.y,u.z),d.copy(u).normalize(),y.push(d.x,d.y,d.z),m.push(T+w,1-v),S.push(l++)}h.push(S)}for(let p=0;p<i;p++)for(let S=0;S<t;S++){let v=h[p][S+1],w=h[p][S],C=h[p+1][S],T=h[p+1][S+1];(p!==0||o>0)&&f.push(v,w,T),(p!==i-1||c<Math.PI)&&f.push(w,C,T)}this.setIndex(f),this.setAttribute("position",new it(g,3)),this.setAttribute("normal",new it(y,3)),this.setAttribute("uv",new it(m,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new n(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}};var Lr=class n extends Mt{constructor(e=1,t=.4,i=12,s=48,r=Math.PI*2){super(),this.type="TorusGeometry",this.parameters={radius:e,tube:t,radialSegments:i,tubularSegments:s,arc:r},i=Math.floor(i),s=Math.floor(s);let o=[],a=[],c=[],l=[],h=new L,u=new L,d=new L;for(let f=0;f<=i;f++)for(let g=0;g<=s;g++){let y=g/s*r,m=f/i*Math.PI*2;u.x=(e+t*Math.cos(m))*Math.cos(y),u.y=(e+t*Math.cos(m))*Math.sin(y),u.z=t*Math.sin(m),a.push(u.x,u.y,u.z),h.x=e*Math.cos(y),h.y=e*Math.sin(y),d.subVectors(u,h).normalize(),c.push(d.x,d.y,d.z),l.push(g/s),l.push(f/i)}for(let f=1;f<=i;f++)for(let g=1;g<=s;g++){let y=(s+1)*f+g-1,m=(s+1)*(f-1)+g-1,p=(s+1)*(f-1)+g,S=(s+1)*f+g;o.push(y,m,S),o.push(m,p,S)}this.setIndex(o),this.setAttribute("position",new it(a,3)),this.setAttribute("normal",new it(c,3)),this.setAttribute("uv",new it(l,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new n(e.radius,e.tube,e.radialSegments,e.tubularSegments,e.arc)}};var _i=class extends Bt{constructor(e){super(),this.isMeshStandardMaterial=!0,this.defines={STANDARD:""},this.type="MeshStandardMaterial",this.color=new me(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new me(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=uh,this.normalScale=new Ee(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}},Xt=class extends _i{constructor(e){super(),this.isMeshPhysicalMaterial=!0,this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.anisotropyRotation=0,this.anisotropyMap=null,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new Ee(1,1),this.clearcoatNormalMap=null,this.ior=1.5,Object.defineProperty(this,"reflectivity",{get:function(){return St(2.5*(this.ior-1)/(this.ior+1),0,1)},set:function(t){this.ior=(1+.4*t)/(1-.4*t)}}),this.iridescenceMap=null,this.iridescenceIOR=1.3,this.iridescenceThicknessRange=[100,400],this.iridescenceThicknessMap=null,this.sheenColor=new me(0),this.sheenColorMap=null,this.sheenRoughness=1,this.sheenRoughnessMap=null,this.transmissionMap=null,this.thickness=0,this.thicknessMap=null,this.attenuationDistance=1/0,this.attenuationColor=new me(1,1,1),this.specularIntensity=1,this.specularIntensityMap=null,this.specularColor=new me(1,1,1),this.specularColorMap=null,this._anisotropy=0,this._clearcoat=0,this._iridescence=0,this._sheen=0,this._transmission=0,this.setValues(e)}get anisotropy(){return this._anisotropy}set anisotropy(e){this._anisotropy>0!=e>0&&this.version++,this._anisotropy=e}get clearcoat(){return this._clearcoat}set clearcoat(e){this._clearcoat>0!=e>0&&this.version++,this._clearcoat=e}get iridescence(){return this._iridescence}set iridescence(e){this._iridescence>0!=e>0&&this.version++,this._iridescence=e}get sheen(){return this._sheen}set sheen(e){this._sheen>0!=e>0&&this.version++,this._sheen=e}get transmission(){return this._transmission}set transmission(e){this._transmission>0!=e>0&&this.version++,this._transmission=e}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.anisotropy=e.anisotropy,this.anisotropyRotation=e.anisotropyRotation,this.anisotropyMap=e.anisotropyMap,this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.ior=e.ior,this.iridescence=e.iridescence,this.iridescenceMap=e.iridescenceMap,this.iridescenceIOR=e.iridescenceIOR,this.iridescenceThicknessRange=[...e.iridescenceThicknessRange],this.iridescenceThicknessMap=e.iridescenceThicknessMap,this.sheen=e.sheen,this.sheenColor.copy(e.sheenColor),this.sheenColorMap=e.sheenColorMap,this.sheenRoughness=e.sheenRoughness,this.sheenRoughnessMap=e.sheenRoughnessMap,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this.thickness=e.thickness,this.thicknessMap=e.thicknessMap,this.attenuationDistance=e.attenuationDistance,this.attenuationColor.copy(e.attenuationColor),this.specularIntensity=e.specularIntensity,this.specularIntensityMap=e.specularIntensityMap,this.specularColor.copy(e.specularColor),this.specularColorMap=e.specularColorMap,this}};function rr(n,e,t){return!n||!t&&n.constructor===e?n:typeof e.BYTES_PER_ELEMENT=="number"?new e(n):Array.prototype.slice.call(n)}function hy(n){return ArrayBuffer.isView(n)&&!(n instanceof DataView)}function uy(n){function e(s,r){return n[s]-n[r]}let t=n.length,i=new Array(t);for(let s=0;s!==t;++s)i[s]=s;return i.sort(e),i}function Yl(n,e,t){let i=n.length,s=new n.constructor(i);for(let r=0,o=0;o!==i;++r){let a=t[r]*e;for(let c=0;c!==e;++c)s[o++]=n[a+c]}return s}function Sh(n,e,t,i){let s=1,r=n[0];for(;r!==void 0&&r[i]===void 0;)r=n[s++];if(r===void 0)return;let o=r[i];if(o!==void 0)if(Array.isArray(o))do o=r[i],o!==void 0&&(e.push(r.time),t.push.apply(t,o)),r=n[s++];while(r!==void 0);else if(o.toArray!==void 0)do o=r[i],o!==void 0&&(e.push(r.time),o.toArray(t,t.length)),r=n[s++];while(r!==void 0);else do o=r[i],o!==void 0&&(e.push(r.time),t.push(o)),r=n[s++];while(r!==void 0)}var Ui=class{constructor(e,t,i,s){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new t.constructor(i),this.sampleValues=t,this.valueSize=i,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,i=this._cachedIndex,s=t[i],r=t[i-1];e:{t:{let o;i:{n:if(!(e<s)){for(let a=i+2;;){if(s===void 0){if(e<r)break n;return i=t.length,this._cachedIndex=i,this.copySampleValue_(i-1)}if(i===a)break;if(r=s,s=t[++i],e<s)break t}o=t.length;break i}if(!(e>=r)){let a=t[1];e<a&&(i=2,r=a);for(let c=i-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(i===c)break;if(s=r,r=t[--i-1],e>=r)break t}o=i,i=0;break i}break e}for(;i<o;){let a=i+o>>>1;e<t[a]?o=a:i=a+1}if(s=t[i],r=t[i-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return i=t.length,this._cachedIndex=i,this.copySampleValue_(i-1)}this._cachedIndex=i,this.intervalChanged_(i,r,s)}return this.interpolate_(i,r,e,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,i=this.sampleValues,s=this.valueSize,r=e*s;for(let o=0;o!==s;++o)t[o]=i[r+o];return t}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}},la=class extends Ui{constructor(e,t,i,s){super(e,t,i,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Cn,endingEnd:Cn}}intervalChanged_(e,t,i){let s=this.parameterPositions,r=e-2,o=e+1,a=s[r],c=s[o];if(a===void 0)switch(this.getSettings_().endingStart){case Pn:r=e,a=2*t-i;break;case cr:r=s.length-2,a=t+s[r]-s[r+1];break;default:r=e,a=i}if(c===void 0)switch(this.getSettings_().endingEnd){case Pn:o=e,c=2*i-t;break;case cr:o=1,c=i+s[1]-s[0];break;default:o=e-1,c=t}let l=(i-t)*.5,h=this.valueSize;this._weightPrev=l/(t-a),this._weightNext=l/(c-i),this._offsetPrev=r*h,this._offsetNext=o*h}interpolate_(e,t,i,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=e*a,l=c-a,h=this._offsetPrev,u=this._offsetNext,d=this._weightPrev,f=this._weightNext,g=(i-t)/(s-t),y=g*g,m=y*g,p=-d*m+2*d*y-d*g,S=(1+d)*m+(-1.5-2*d)*y+(-.5+d)*g+1,v=(-1-f)*m+(1.5+f)*y+.5*g,w=f*m-f*y;for(let C=0;C!==a;++C)r[C]=p*o[h+C]+S*o[l+C]+v*o[c+C]+w*o[u+C];return r}},Ir=class extends Ui{constructor(e,t,i,s){super(e,t,i,s)}interpolate_(e,t,i,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=e*a,l=c-a,h=(i-t)/(s-t),u=1-h;for(let d=0;d!==a;++d)r[d]=o[l+d]*u+o[c+d]*h;return r}},ha=class extends Ui{constructor(e,t,i,s){super(e,t,i,s)}interpolate_(e){return this.copySampleValue_(e-1)}},qt=class{constructor(e,t,i,s){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=rr(t,this.TimeBufferType),this.values=rr(i,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,i;if(t.toJSON!==this.toJSON)i=t.toJSON(e);else{i={name:e.name,times:rr(e.times,Array),values:rr(e.values,Array)};let s=e.getInterpolation();s!==e.DefaultInterpolation&&(i.interpolation=s)}return i.type=e.ValueTypeName,i}InterpolantFactoryMethodDiscrete(e){return new ha(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new Ir(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new la(this.times,this.values,this.getValueSize(),e)}setInterpolation(e){let t;switch(e){case zn:t=this.InterpolantFactoryMethodDiscrete;break;case rn:t=this.InterpolantFactoryMethodLinear;break;case ho:t=this.InterpolantFactoryMethodSmooth;break}if(t===void 0){let i="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(i);return console.warn("THREE.KeyframeTrack:",i),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return zn;case this.InterpolantFactoryMethodLinear:return rn;case this.InterpolantFactoryMethodSmooth:return ho}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let i=0,s=t.length;i!==s;++i)t[i]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let i=0,s=t.length;i!==s;++i)t[i]*=e}return this}trim(e,t){let i=this.times,s=i.length,r=0,o=s-1;for(;r!==s&&i[r]<e;)++r;for(;o!==-1&&i[o]>t;)--o;if(++o,r!==0||o!==s){r>=o&&(o=Math.max(o,1),r=o-1);let a=this.getValueSize();this.times=i.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),e=!1);let i=this.times,s=this.values,r=i.length;r===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),e=!1);let o=null;for(let a=0;a!==r;a++){let c=i[a];if(typeof c=="number"&&isNaN(c)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,a,c),e=!1;break}if(o!==null&&o>c){console.error("THREE.KeyframeTrack: Out of order keys.",this,a,c,o),e=!1;break}o=c}if(s!==void 0&&hy(s))for(let a=0,c=s.length;a!==c;++a){let l=s[a];if(isNaN(l)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,a,l),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),i=this.getValueSize(),s=this.getInterpolation()===ho,r=e.length-1,o=1;for(let a=1;a<r;++a){let c=!1,l=e[a],h=e[a+1];if(l!==h&&(a!==1||l!==e[0]))if(s)c=!0;else{let u=a*i,d=u-i,f=u+i;for(let g=0;g!==i;++g){let y=t[u+g];if(y!==t[d+g]||y!==t[f+g]){c=!0;break}}}if(c){if(a!==o){e[o]=e[a];let u=a*i,d=o*i;for(let f=0;f!==i;++f)t[d+f]=t[u+f]}++o}}if(r>0){e[o]=e[r];for(let a=r*i,c=o*i,l=0;l!==i;++l)t[c+l]=t[a+l];++o}return o!==e.length?(this.times=e.slice(0,o),this.values=t.slice(0,o*i)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),i=this.constructor,s=new i(this.name,e,t);return s.createInterpolant=this.createInterpolant,s}};qt.prototype.TimeBufferType=Float32Array;qt.prototype.ValueBufferType=Float32Array;qt.prototype.DefaultInterpolation=rn;var Fi=class extends qt{};Fi.prototype.ValueTypeName="bool";Fi.prototype.ValueBufferType=Array;Fi.prototype.DefaultInterpolation=zn;Fi.prototype.InterpolantFactoryMethodLinear=void 0;Fi.prototype.InterpolantFactoryMethodSmooth=void 0;var kr=class extends qt{};kr.prototype.ValueTypeName="color";var bi=class extends qt{};bi.prototype.ValueTypeName="number";var ua=class extends Ui{constructor(e,t,i,s){super(e,t,i,s)}interpolate_(e,t,i,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=(i-t)/(s-t),l=e*a;for(let h=l+a;l!==h;l+=4)wt.slerpFlat(r,0,o,l-a,o,l,c);return r}},ai=class extends qt{InterpolantFactoryMethodLinear(e){return new ua(this.times,this.values,this.getValueSize(),e)}};ai.prototype.ValueTypeName="quaternion";ai.prototype.DefaultInterpolation=rn;ai.prototype.InterpolantFactoryMethodSmooth=void 0;var Bi=class extends qt{};Bi.prototype.ValueTypeName="string";Bi.prototype.ValueBufferType=Array;Bi.prototype.DefaultInterpolation=zn;Bi.prototype.InterpolantFactoryMethodLinear=void 0;Bi.prototype.InterpolantFactoryMethodSmooth=void 0;var Si=class extends qt{};Si.prototype.ValueTypeName="vector";var $n=class{constructor(e,t=-1,i,s=Ma){this.name=e,this.tracks=i,this.duration=t,this.blendMode=s,this.uuid=Qt(),this.duration<0&&this.resetDuration()}static parse(e){let t=[],i=e.tracks,s=1/(e.fps||1);for(let o=0,a=i.length;o!==a;++o)t.push(py(i[o]).scale(s));let r=new this(e.name,e.duration,t,e.blendMode);return r.uuid=e.uuid,r}static toJSON(e){let t=[],i=e.tracks,s={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode};for(let r=0,o=i.length;r!==o;++r)t.push(qt.toJSON(i[r]));return s}static CreateFromMorphTargetSequence(e,t,i,s){let r=t.length,o=[];for(let a=0;a<r;a++){let c=[],l=[];c.push((a+r-1)%r,a,(a+1)%r),l.push(0,1,0);let h=uy(c);c=Yl(c,1,h),l=Yl(l,1,h),!s&&c[0]===0&&(c.push(r),l.push(l[0])),o.push(new bi(".morphTargetInfluences["+t[a].name+"]",c,l).scale(1/i))}return new this(e,-1,o)}static findByName(e,t){let i=e;if(!Array.isArray(e)){let s=e;i=s.geometry&&s.geometry.animations||s.animations}for(let s=0;s<i.length;s++)if(i[s].name===t)return i[s];return null}static CreateClipsFromMorphTargetSequences(e,t,i){let s={},r=/^([\w-]*?)([\d]+)$/;for(let a=0,c=e.length;a<c;a++){let l=e[a],h=l.name.match(r);if(h&&h.length>1){let u=h[1],d=s[u];d||(s[u]=d=[]),d.push(l)}}let o=[];for(let a in s)o.push(this.CreateFromMorphTargetSequence(a,s[a],t,i));return o}static parseAnimation(e,t){if(!e)return console.error("THREE.AnimationClip: No animation in JSONLoader data."),null;let i=function(u,d,f,g,y){if(f.length!==0){let m=[],p=[];Sh(f,m,p,g),m.length!==0&&y.push(new u(d,m,p))}},s=[],r=e.name||"default",o=e.fps||30,a=e.blendMode,c=e.length||-1,l=e.hierarchy||[];for(let u=0;u<l.length;u++){let d=l[u].keys;if(!(!d||d.length===0))if(d[0].morphTargets){let f={},g;for(g=0;g<d.length;g++)if(d[g].morphTargets)for(let y=0;y<d[g].morphTargets.length;y++)f[d[g].morphTargets[y]]=-1;for(let y in f){let m=[],p=[];for(let S=0;S!==d[g].morphTargets.length;++S){let v=d[g];m.push(v.time),p.push(v.morphTarget===y?1:0)}s.push(new bi(".morphTargetInfluence["+y+"]",m,p))}c=f.length*o}else{let f=".bones["+t[u].name+"]";i(Si,f+".position",d,"pos",s),i(ai,f+".quaternion",d,"rot",s),i(Si,f+".scale",d,"scl",s)}}return s.length===0?null:new this(r,c,s,a)}resetDuration(){let e=this.tracks,t=0;for(let i=0,s=e.length;i!==s;++i){let r=this.tracks[i];t=Math.max(t,r.times[r.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e=e&&this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){let e=[];for(let t=0;t<this.tracks.length;t++)e.push(this.tracks[t].clone());return new this.constructor(this.name,this.duration,e,this.blendMode)}toJSON(){return this.constructor.toJSON(this)}};function dy(n){switch(n.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return bi;case"vector":case"vector2":case"vector3":case"vector4":return Si;case"color":return kr;case"quaternion":return ai;case"bool":case"boolean":return Fi;case"string":return Bi}throw new Error("THREE.KeyframeTrack: Unsupported typeName: "+n)}function py(n){if(n.type===void 0)throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");let e=dy(n.type);if(n.times===void 0){let t=[],i=[];Sh(n.keys,t,i,"value"),n.times=t,n.values=i}return e.parse!==void 0?e.parse(n):new e(n.name,n.times,n.values,n.interpolation)}var Pi={enabled:!1,files:{},add:function(n,e){this.enabled!==!1&&(this.files[n]=e)},get:function(n){if(this.enabled!==!1)return this.files[n]},remove:function(n){delete this.files[n]},clear:function(){this.files={}}},da=class{constructor(e,t,i){let s=this,r=!1,o=0,a=0,c,l=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=i,this.itemStart=function(h){a++,r===!1&&s.onStart!==void 0&&s.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,s.onProgress!==void 0&&s.onProgress(h,o,a),o===a&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return c?c(h):h},this.setURLModifier=function(h){return c=h,this},this.addHandler=function(h,u){return l.push(h,u),this},this.removeHandler=function(h){let u=l.indexOf(h);return u!==-1&&l.splice(u,2),this},this.getHandler=function(h){for(let u=0,d=l.length;u<d;u+=2){let f=l[u],g=l[u+1];if(f.global&&(f.lastIndex=0),f.test(h))return g}return null}}},fy=new da,wi=class{constructor(e){this.manager=e!==void 0?e:fy,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){let i=this;return new Promise(function(s,r){i.load(e,s,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}};wi.DEFAULT_MATERIAL_NAME="__DEFAULT";var fi={},pa=class extends Error{constructor(e,t){super(e),this.response=t}},ws=class extends wi{constructor(e){super(e)}load(e,t,i,s){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let r=Pi.get(e);if(r!==void 0)return this.manager.itemStart(e),setTimeout(()=>{t&&t(r),this.manager.itemEnd(e)},0),r;if(fi[e]!==void 0){fi[e].push({onLoad:t,onProgress:i,onError:s});return}fi[e]=[],fi[e].push({onLoad:t,onProgress:i,onError:s});let o=new Request(e,{headers:new Headers(this.requestHeader),credentials:this.withCredentials?"include":"same-origin"}),a=this.mimeType,c=this.responseType;fetch(o).then(l=>{if(l.status===200||l.status===0){if(l.status===0&&console.warn("THREE.FileLoader: HTTP Status 0 received."),typeof ReadableStream>"u"||l.body===void 0||l.body.getReader===void 0)return l;let h=fi[e],u=l.body.getReader(),d=l.headers.get("Content-Length")||l.headers.get("X-File-Size"),f=d?parseInt(d):0,g=f!==0,y=0,m=new ReadableStream({start(p){S();function S(){u.read().then(({done:v,value:w})=>{if(v)p.close();else{y+=w.byteLength;let C=new ProgressEvent("progress",{lengthComputable:g,loaded:y,total:f});for(let T=0,R=h.length;T<R;T++){let W=h[T];W.onProgress&&W.onProgress(C)}p.enqueue(w),S()}})}}});return new Response(m)}else throw new pa(`fetch for "${l.url}" responded with ${l.status}: ${l.statusText}`,l)}).then(l=>{switch(c){case"arraybuffer":return l.arrayBuffer();case"blob":return l.blob();case"document":return l.text().then(h=>new DOMParser().parseFromString(h,a));case"json":return l.json();default:if(a===void 0)return l.text();{let u=/charset="?([^;"\s]*)"?/i.exec(a),d=u&&u[1]?u[1].toLowerCase():void 0,f=new TextDecoder(d);return l.arrayBuffer().then(g=>f.decode(g))}}}).then(l=>{Pi.add(e,l);let h=fi[e];delete fi[e];for(let u=0,d=h.length;u<d;u++){let f=h[u];f.onLoad&&f.onLoad(l)}}).catch(l=>{let h=fi[e];if(h===void 0)throw this.manager.itemError(e),l;delete fi[e];for(let u=0,d=h.length;u<d;u++){let f=h[u];f.onError&&f.onError(l)}this.manager.itemError(e)}).finally(()=>{this.manager.itemEnd(e)}),this.manager.itemStart(e)}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}};var fa=class extends wi{constructor(e){super(e)}load(e,t,i,s){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let r=this,o=Pi.get(e);if(o!==void 0)return r.manager.itemStart(e),setTimeout(function(){t&&t(o),r.manager.itemEnd(e)},0),o;let a=ps("img");function c(){h(),Pi.add(e,this),t&&t(this),r.manager.itemEnd(e)}function l(u){h(),s&&s(u),r.manager.itemError(e),r.manager.itemEnd(e)}function h(){a.removeEventListener("load",c,!1),a.removeEventListener("error",l,!1)}return a.addEventListener("load",c,!1),a.addEventListener("error",l,!1),e.slice(0,5)!=="data:"&&this.crossOrigin!==void 0&&(a.crossOrigin=this.crossOrigin),r.manager.itemStart(e),a.src=e,a}};var Nr=class extends wi{constructor(e){super(e)}load(e,t,i,s){let r=new Rt,o=new fa(this.manager);return o.setCrossOrigin(this.crossOrigin),o.setPath(this.path),o.load(e,function(a){r.image=a,r.needsUpdate=!0,t!==void 0&&t(r)},i,s),r}},Yn=class extends at{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new me(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),t}};var Uo=new Ge,Kl=new L,jl=new L,Ms=class{constructor(e){this.camera=e,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Ee(512,512),this.map=null,this.mapPass=null,this.matrix=new Ge,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new fs,this._frameExtents=new Ee(1,1),this._viewportCount=1,this._viewports=[new Qe(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera,i=this.matrix;Kl.setFromMatrixPosition(e.matrixWorld),t.position.copy(Kl),jl.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(jl),t.updateMatrixWorld(),Uo.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Uo),i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(Uo)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.bias=e.bias,this.radius=e.radius,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},ma=class extends Ms{constructor(){super(new dt(50,1,.5,500)),this.isSpotLightShadow=!0,this.focus=1}updateMatrices(e){let t=this.camera,i=Hn*2*e.angle*this.focus,s=this.mapSize.width/this.mapSize.height,r=e.distance||t.far;(i!==t.fov||s!==t.aspect||r!==t.far)&&(t.fov=i,t.aspect=s,t.far=r,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}},Dr=class extends Yn{constructor(e,t,i=0,s=Math.PI/3,r=0,o=2){super(e,t),this.isSpotLight=!0,this.type="SpotLight",this.position.copy(at.DEFAULT_UP),this.updateMatrix(),this.target=new at,this.distance=i,this.angle=s,this.penumbra=r,this.decay=o,this.map=null,this.shadow=new ma}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}},Zl=new Ge,rs=new L,Fo=new L,ga=class extends Ms{constructor(){super(new dt(90,1,.5,500)),this.isPointLightShadow=!0,this._frameExtents=new Ee(4,2),this._viewportCount=6,this._viewports=[new Qe(2,1,1,1),new Qe(0,1,1,1),new Qe(3,1,1,1),new Qe(1,1,1,1),new Qe(3,0,1,1),new Qe(1,0,1,1)],this._cubeDirections=[new L(1,0,0),new L(-1,0,0),new L(0,0,1),new L(0,0,-1),new L(0,1,0),new L(0,-1,0)],this._cubeUps=[new L(0,1,0),new L(0,1,0),new L(0,1,0),new L(0,1,0),new L(0,0,1),new L(0,0,-1)]}updateMatrices(e,t=0){let i=this.camera,s=this.matrix,r=e.distance||i.far;r!==i.far&&(i.far=r,i.updateProjectionMatrix()),rs.setFromMatrixPosition(e.matrixWorld),i.position.copy(rs),Fo.copy(i.position),Fo.add(this._cubeDirections[t]),i.up.copy(this._cubeUps[t]),i.lookAt(Fo),i.updateMatrixWorld(),s.makeTranslation(-rs.x,-rs.y,-rs.z),Zl.multiplyMatrices(i.projectionMatrix,i.matrixWorldInverse),this._frustum.setFromProjectionMatrix(Zl)}},Or=class extends Yn{constructor(e,t,i=0,s=2){super(e,t),this.isPointLight=!0,this.type="PointLight",this.distance=i,this.decay=s,this.shadow=new ga}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e,t){return super.copy(e,t),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}},ya=class extends Ms{constructor(){super(new Gn(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}},cn=class extends Yn{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(at.DEFAULT_UP),this.updateMatrix(),this.target=new at,this.shadow=new ya}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}},Kn=class extends Yn{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}};var zi=class{static decodeText(e){if(typeof TextDecoder<"u")return new TextDecoder().decode(e);let t="";for(let i=0,s=e.length;i<s;i++)t+=String.fromCharCode(e[i]);try{return decodeURIComponent(escape(t))}catch{return t}}static extractUrlBase(e){let t=e.lastIndexOf("/");return t===-1?"./":e.slice(0,t+1)}static resolveURL(e,t){return typeof e!="string"||e===""?"":(/^https?:\/\//i.test(t)&&/^\//.test(e)&&(t=t.replace(/(^https?:\/\/[^\/]+).*/i,"$1")),/^(https?:)?\/\//i.test(e)||/^data:.*,.*$/i.test(e)||/^blob:.*$/i.test(e)?e:t+e)}};var Ur=class extends wi{constructor(e){super(e),this.isImageBitmapLoader=!0,typeof createImageBitmap>"u"&&console.warn("THREE.ImageBitmapLoader: createImageBitmap() not supported."),typeof fetch>"u"&&console.warn("THREE.ImageBitmapLoader: fetch() not supported."),this.options={premultiplyAlpha:"none"}}setOptions(e){return this.options=e,this}load(e,t,i,s){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let r=this,o=Pi.get(e);if(o!==void 0){if(r.manager.itemStart(e),o.then){o.then(l=>{t&&t(l),r.manager.itemEnd(e)}).catch(l=>{s&&s(l)});return}return setTimeout(function(){t&&t(o),r.manager.itemEnd(e)},0),o}let a={};a.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",a.headers=this.requestHeader;let c=fetch(e,a).then(function(l){return l.blob()}).then(function(l){return createImageBitmap(l,Object.assign(r.options,{colorSpaceConversion:"none"}))}).then(function(l){return Pi.add(e,l),t&&t(l),r.manager.itemEnd(e),l}).catch(function(l){s&&s(l),Pi.remove(e),r.manager.itemError(e),r.manager.itemEnd(e)});Pi.add(e,c),r.manager.itemStart(e)}};var Fr=class{constructor(e=!0){this.autoStart=e,this.startTime=0,this.oldTime=0,this.elapsedTime=0,this.running=!1}start(){this.startTime=Jl(),this.oldTime=this.startTime,this.elapsedTime=0,this.running=!0}stop(){this.getElapsedTime(),this.running=!1,this.autoStart=!1}getElapsedTime(){return this.getDelta(),this.elapsedTime}getDelta(){let e=0;if(this.autoStart&&!this.running)return this.start(),0;if(this.running){let t=Jl();e=(t-this.oldTime)/1e3,this.oldTime=t,this.elapsedTime+=e}return e}};function Jl(){return(typeof performance>"u"?Date:performance).now()}var xa=class{constructor(e,t,i){this.binding=e,this.valueSize=i;let s,r,o;switch(t){case"quaternion":s=this._slerp,r=this._slerpAdditive,o=this._setAdditiveIdentityQuaternion,this.buffer=new Float64Array(i*6),this._workIndex=5;break;case"string":case"bool":s=this._select,r=this._select,o=this._setAdditiveIdentityOther,this.buffer=new Array(i*5);break;default:s=this._lerp,r=this._lerpAdditive,o=this._setAdditiveIdentityNumeric,this.buffer=new Float64Array(i*5)}this._mixBufferRegion=s,this._mixBufferRegionAdditive=r,this._setIdentity=o,this._origIndex=3,this._addIndex=4,this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,this.useCount=0,this.referenceCount=0}accumulate(e,t){let i=this.buffer,s=this.valueSize,r=e*s+s,o=this.cumulativeWeight;if(o===0){for(let a=0;a!==s;++a)i[r+a]=i[a];o=t}else{o+=t;let a=t/o;this._mixBufferRegion(i,r,0,a,s)}this.cumulativeWeight=o}accumulateAdditive(e){let t=this.buffer,i=this.valueSize,s=i*this._addIndex;this.cumulativeWeightAdditive===0&&this._setIdentity(),this._mixBufferRegionAdditive(t,s,0,e,i),this.cumulativeWeightAdditive+=e}apply(e){let t=this.valueSize,i=this.buffer,s=e*t+t,r=this.cumulativeWeight,o=this.cumulativeWeightAdditive,a=this.binding;if(this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,r<1){let c=t*this._origIndex;this._mixBufferRegion(i,s,c,1-r,t)}o>0&&this._mixBufferRegionAdditive(i,s,this._addIndex*t,1,t);for(let c=t,l=t+t;c!==l;++c)if(i[c]!==i[c+t]){a.setValue(i,s);break}}saveOriginalState(){let e=this.binding,t=this.buffer,i=this.valueSize,s=i*this._origIndex;e.getValue(t,s);for(let r=i,o=s;r!==o;++r)t[r]=t[s+r%i];this._setIdentity(),this.cumulativeWeight=0,this.cumulativeWeightAdditive=0}restoreOriginalState(){let e=this.valueSize*3;this.binding.setValue(this.buffer,e)}_setAdditiveIdentityNumeric(){let e=this._addIndex*this.valueSize,t=e+this.valueSize;for(let i=e;i<t;i++)this.buffer[i]=0}_setAdditiveIdentityQuaternion(){this._setAdditiveIdentityNumeric(),this.buffer[this._addIndex*this.valueSize+3]=1}_setAdditiveIdentityOther(){let e=this._origIndex*this.valueSize,t=this._addIndex*this.valueSize;for(let i=0;i<this.valueSize;i++)this.buffer[t+i]=this.buffer[e+i]}_select(e,t,i,s,r){if(s>=.5)for(let o=0;o!==r;++o)e[t+o]=e[i+o]}_slerp(e,t,i,s){wt.slerpFlat(e,t,e,t,e,i,s)}_slerpAdditive(e,t,i,s,r){let o=this._workIndex*r;wt.multiplyQuaternionsFlat(e,o,e,t,e,i),wt.slerpFlat(e,t,e,t,e,o,s)}_lerp(e,t,i,s,r){let o=1-s;for(let a=0;a!==r;++a){let c=t+a;e[c]=e[c]*o+e[i+a]*s}}_lerpAdditive(e,t,i,s,r){for(let o=0;o!==r;++o){let a=t+o;e[a]=e[a]+e[i+o]*s}}},Ra="\\[\\]\\.:\\/",my=new RegExp("["+Ra+"]","g"),Ca="[^"+Ra+"]",gy="[^"+Ra.replace("\\.","")+"]",yy=/((?:WC+[\/:])*)/.source.replace("WC",Ca),xy=/(WCOD+)?/.source.replace("WCOD",gy),vy=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Ca),_y=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Ca),by=new RegExp("^"+yy+xy+vy+_y+"$"),Sy=["material","materials","bones","map"],va=class{constructor(e,t,i){let s=i||Je.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,s)}getValue(e,t){this.bind();let i=this._targetGroup.nCachedObjects_,s=this._bindings[i];s!==void 0&&s.getValue(e,t)}setValue(e,t){let i=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=i.length;s!==r;++s)i[s].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,i=e.length;t!==i;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,i=e.length;t!==i;++t)e[t].unbind()}},Je=class n{constructor(e,t,i){this.path=t,this.parsedPath=i||n.parseTrackName(t),this.node=n.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,i){return e&&e.isAnimationObjectGroup?new n.Composite(e,t,i):new n(e,t,i)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(my,"")}static parseTrackName(e){let t=by.exec(e);if(t===null)throw new Error("PropertyBinding: Cannot parse trackName: "+e);let i={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},s=i.nodeName&&i.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=i.nodeName.substring(s+1);Sy.indexOf(r)!==-1&&(i.nodeName=i.nodeName.substring(0,s),i.objectName=r)}if(i.propertyName===null||i.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return i}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let i=e.skeleton.getBoneByName(t);if(i!==void 0)return i}if(e.children){let i=function(r){for(let o=0;o<r.length;o++){let a=r[o];if(a.name===t||a.uuid===t)return a;let c=i(a.children);if(c)return c}return null},s=i(e.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)e[t++]=i[s]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)i[s]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)i[s]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let i=this.resolvedProperty;for(let s=0,r=i.length;s!==r;++s)i[s]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,i=t.objectName,s=t.propertyName,r=t.propertyIndex;if(e||(e=n.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){console.warn("THREE.PropertyBinding: No target node found for track: "+this.path+".");return}if(i){let l=t.objectIndex;switch(i){case"materials":if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===l){l=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[i]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[i]}if(l!==void 0){if(e[l]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[l]}}let o=e[s];if(o===void 0){let l=t.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+l+"."+s+" but it wasn't found.",e);return}let a=this.Versioning.None;this.targetObject=e,e.needsUpdate!==void 0?a=this.Versioning.NeedsUpdate:e.matrixWorldNeedsUpdate!==void 0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!e.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[r]!==void 0&&(r=e.morphTargetDictionary[r])}c=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(c=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=s;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};Je.Composite=va;Je.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};Je.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};Je.prototype.GetterByBindingType=[Je.prototype._getValue_direct,Je.prototype._getValue_array,Je.prototype._getValue_arrayElement,Je.prototype._getValue_toArray];Je.prototype.SetterByBindingTypeAndVersioning=[[Je.prototype._setValue_direct,Je.prototype._setValue_direct_setNeedsUpdate,Je.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[Je.prototype._setValue_array,Je.prototype._setValue_array_setNeedsUpdate,Je.prototype._setValue_array_setMatrixWorldNeedsUpdate],[Je.prototype._setValue_arrayElement,Je.prototype._setValue_arrayElement_setNeedsUpdate,Je.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[Je.prototype._setValue_fromArray,Je.prototype._setValue_fromArray_setNeedsUpdate,Je.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var _a=class{constructor(e,t,i=null,s=t.blendMode){this._mixer=e,this._clip=t,this._localRoot=i,this.blendMode=s;let r=t.tracks,o=r.length,a=new Array(o),c={endingStart:Cn,endingEnd:Cn};for(let l=0;l!==o;++l){let h=r[l].createInterpolant(null);a[l]=h,h.settings=c}this._interpolantSettings=c,this._interpolants=a,this._propertyBindings=new Array(o),this._cacheIndex=null,this._byClipCacheIndex=null,this._timeScaleInterpolant=null,this._weightInterpolant=null,this.loop=As,this._loopCount=-1,this._startTime=null,this.time=0,this.timeScale=1,this._effectiveTimeScale=1,this.weight=1,this._effectiveWeight=1,this.repetitions=1/0,this.paused=!1,this.enabled=!0,this.clampWhenFinished=!1,this.zeroSlopeAtStart=!0,this.zeroSlopeAtEnd=!0}play(){return this._mixer._activateAction(this),this}stop(){return this._mixer._deactivateAction(this),this.reset()}reset(){return this.paused=!1,this.enabled=!0,this.time=0,this._loopCount=-1,this._startTime=null,this.stopFading().stopWarping()}isRunning(){return this.enabled&&!this.paused&&this.timeScale!==0&&this._startTime===null&&this._mixer._isActiveAction(this)}isScheduled(){return this._mixer._isActiveAction(this)}startAt(e){return this._startTime=e,this}setLoop(e,t){return this.loop=e,this.repetitions=t,this}setEffectiveWeight(e){return this.weight=e,this._effectiveWeight=this.enabled?e:0,this.stopFading()}getEffectiveWeight(){return this._effectiveWeight}fadeIn(e){return this._scheduleFading(e,0,1)}fadeOut(e){return this._scheduleFading(e,1,0)}crossFadeFrom(e,t,i){if(e.fadeOut(t),this.fadeIn(t),i){let s=this._clip.duration,r=e._clip.duration,o=r/s,a=s/r;e.warp(1,o,t),this.warp(a,1,t)}return this}crossFadeTo(e,t,i){return e.crossFadeFrom(this,t,i)}stopFading(){let e=this._weightInterpolant;return e!==null&&(this._weightInterpolant=null,this._mixer._takeBackControlInterpolant(e)),this}setEffectiveTimeScale(e){return this.timeScale=e,this._effectiveTimeScale=this.paused?0:e,this.stopWarping()}getEffectiveTimeScale(){return this._effectiveTimeScale}setDuration(e){return this.timeScale=this._clip.duration/e,this.stopWarping()}syncWith(e){return this.time=e.time,this.timeScale=e.timeScale,this.stopWarping()}halt(e){return this.warp(this._effectiveTimeScale,0,e)}warp(e,t,i){let s=this._mixer,r=s.time,o=this.timeScale,a=this._timeScaleInterpolant;a===null&&(a=s._lendControlInterpolant(),this._timeScaleInterpolant=a);let c=a.parameterPositions,l=a.sampleValues;return c[0]=r,c[1]=r+i,l[0]=e/o,l[1]=t/o,this}stopWarping(){let e=this._timeScaleInterpolant;return e!==null&&(this._timeScaleInterpolant=null,this._mixer._takeBackControlInterpolant(e)),this}getMixer(){return this._mixer}getClip(){return this._clip}getRoot(){return this._localRoot||this._mixer._root}_update(e,t,i,s){if(!this.enabled){this._updateWeight(e);return}let r=this._startTime;if(r!==null){let c=(e-r)*i;c<0||i===0?t=0:(this._startTime=null,t=i*c)}t*=this._updateTimeScale(e);let o=this._updateTime(t),a=this._updateWeight(e);if(a>0){let c=this._interpolants,l=this._propertyBindings;switch(this.blendMode){case Gu:for(let h=0,u=c.length;h!==u;++h)c[h].evaluate(o),l[h].accumulateAdditive(a);break;case Ma:default:for(let h=0,u=c.length;h!==u;++h)c[h].evaluate(o),l[h].accumulate(s,a)}}}_updateWeight(e){let t=0;if(this.enabled){t=this.weight;let i=this._weightInterpolant;if(i!==null){let s=i.evaluate(e)[0];t*=s,e>i.parameterPositions[1]&&(this.stopFading(),s===0&&(this.enabled=!1))}}return this._effectiveWeight=t,t}_updateTimeScale(e){let t=0;if(!this.paused){t=this.timeScale;let i=this._timeScaleInterpolant;if(i!==null){let s=i.evaluate(e)[0];t*=s,e>i.parameterPositions[1]&&(this.stopWarping(),t===0?this.paused=!0:this.timeScale=t)}}return this._effectiveTimeScale=t,t}_updateTime(e){let t=this._clip.duration,i=this.loop,s=this.time+e,r=this._loopCount,o=i===Vu;if(e===0)return r===-1?s:o&&(r&1)===1?t-s:s;if(i===wa){r===-1&&(this._loopCount=0,this._setEndings(!0,!0,!1));e:{if(s>=t)s=t;else if(s<0)s=0;else{this.time=s;break e}this.clampWhenFinished?this.paused=!0:this.enabled=!1,this.time=s,this._mixer.dispatchEvent({type:"finished",action:this,direction:e<0?-1:1})}}else{if(r===-1&&(e>=0?(r=0,this._setEndings(!0,this.repetitions===0,o)):this._setEndings(this.repetitions===0,!0,o)),s>=t||s<0){let a=Math.floor(s/t);s-=t*a,r+=Math.abs(a);let c=this.repetitions-r;if(c<=0)this.clampWhenFinished?this.paused=!0:this.enabled=!1,s=e>0?t:0,this.time=s,this._mixer.dispatchEvent({type:"finished",action:this,direction:e>0?1:-1});else{if(c===1){let l=e<0;this._setEndings(l,!l,o)}else this._setEndings(!1,!1,o);this._loopCount=r,this.time=s,this._mixer.dispatchEvent({type:"loop",action:this,loopDelta:a})}}else this.time=s;if(o&&(r&1)===1)return t-s}return s}_setEndings(e,t,i){let s=this._interpolantSettings;i?(s.endingStart=Pn,s.endingEnd=Pn):(e?s.endingStart=this.zeroSlopeAtStart?Pn:Cn:s.endingStart=cr,t?s.endingEnd=this.zeroSlopeAtEnd?Pn:Cn:s.endingEnd=cr)}_scheduleFading(e,t,i){let s=this._mixer,r=s.time,o=this._weightInterpolant;o===null&&(o=s._lendControlInterpolant(),this._weightInterpolant=o);let a=o.parameterPositions,c=o.sampleValues;return a[0]=r,c[0]=t,a[1]=r+e,c[1]=i,this}},wy=new Float32Array(1),Br=class extends ei{constructor(e){super(),this._root=e,this._initMemoryManager(),this._accuIndex=0,this.time=0,this.timeScale=1}_bindAction(e,t){let i=e._localRoot||this._root,s=e._clip.tracks,r=s.length,o=e._propertyBindings,a=e._interpolants,c=i.uuid,l=this._bindingsByRootAndName,h=l[c];h===void 0&&(h={},l[c]=h);for(let u=0;u!==r;++u){let d=s[u],f=d.name,g=h[f];if(g!==void 0)++g.referenceCount,o[u]=g;else{if(g=o[u],g!==void 0){g._cacheIndex===null&&(++g.referenceCount,this._addInactiveBinding(g,c,f));continue}let y=t&&t._propertyBindings[u].binding.parsedPath;g=new xa(Je.create(i,f,y),d.ValueTypeName,d.getValueSize()),++g.referenceCount,this._addInactiveBinding(g,c,f),o[u]=g}a[u].resultBuffer=g.buffer}}_activateAction(e){if(!this._isActiveAction(e)){if(e._cacheIndex===null){let i=(e._localRoot||this._root).uuid,s=e._clip.uuid,r=this._actionsByClip[s];this._bindAction(e,r&&r.knownActions[0]),this._addInactiveAction(e,s,i)}let t=e._propertyBindings;for(let i=0,s=t.length;i!==s;++i){let r=t[i];r.useCount++===0&&(this._lendBinding(r),r.saveOriginalState())}this._lendAction(e)}}_deactivateAction(e){if(this._isActiveAction(e)){let t=e._propertyBindings;for(let i=0,s=t.length;i!==s;++i){let r=t[i];--r.useCount===0&&(r.restoreOriginalState(),this._takeBackBinding(r))}this._takeBackAction(e)}}_initMemoryManager(){this._actions=[],this._nActiveActions=0,this._actionsByClip={},this._bindings=[],this._nActiveBindings=0,this._bindingsByRootAndName={},this._controlInterpolants=[],this._nActiveControlInterpolants=0;let e=this;this.stats={actions:{get total(){return e._actions.length},get inUse(){return e._nActiveActions}},bindings:{get total(){return e._bindings.length},get inUse(){return e._nActiveBindings}},controlInterpolants:{get total(){return e._controlInterpolants.length},get inUse(){return e._nActiveControlInterpolants}}}}_isActiveAction(e){let t=e._cacheIndex;return t!==null&&t<this._nActiveActions}_addInactiveAction(e,t,i){let s=this._actions,r=this._actionsByClip,o=r[t];if(o===void 0)o={knownActions:[e],actionByRoot:{}},e._byClipCacheIndex=0,r[t]=o;else{let a=o.knownActions;e._byClipCacheIndex=a.length,a.push(e)}e._cacheIndex=s.length,s.push(e),o.actionByRoot[i]=e}_removeInactiveAction(e){let t=this._actions,i=t[t.length-1],s=e._cacheIndex;i._cacheIndex=s,t[s]=i,t.pop(),e._cacheIndex=null;let r=e._clip.uuid,o=this._actionsByClip,a=o[r],c=a.knownActions,l=c[c.length-1],h=e._byClipCacheIndex;l._byClipCacheIndex=h,c[h]=l,c.pop(),e._byClipCacheIndex=null;let u=a.actionByRoot,d=(e._localRoot||this._root).uuid;delete u[d],c.length===0&&delete o[r],this._removeInactiveBindingsForAction(e)}_removeInactiveBindingsForAction(e){let t=e._propertyBindings;for(let i=0,s=t.length;i!==s;++i){let r=t[i];--r.referenceCount===0&&this._removeInactiveBinding(r)}}_lendAction(e){let t=this._actions,i=e._cacheIndex,s=this._nActiveActions++,r=t[s];e._cacheIndex=s,t[s]=e,r._cacheIndex=i,t[i]=r}_takeBackAction(e){let t=this._actions,i=e._cacheIndex,s=--this._nActiveActions,r=t[s];e._cacheIndex=s,t[s]=e,r._cacheIndex=i,t[i]=r}_addInactiveBinding(e,t,i){let s=this._bindingsByRootAndName,r=this._bindings,o=s[t];o===void 0&&(o={},s[t]=o),o[i]=e,e._cacheIndex=r.length,r.push(e)}_removeInactiveBinding(e){let t=this._bindings,i=e.binding,s=i.rootNode.uuid,r=i.path,o=this._bindingsByRootAndName,a=o[s],c=t[t.length-1],l=e._cacheIndex;c._cacheIndex=l,t[l]=c,t.pop(),delete a[r],Object.keys(a).length===0&&delete o[s]}_lendBinding(e){let t=this._bindings,i=e._cacheIndex,s=this._nActiveBindings++,r=t[s];e._cacheIndex=s,t[s]=e,r._cacheIndex=i,t[i]=r}_takeBackBinding(e){let t=this._bindings,i=e._cacheIndex,s=--this._nActiveBindings,r=t[s];e._cacheIndex=s,t[s]=e,r._cacheIndex=i,t[i]=r}_lendControlInterpolant(){let e=this._controlInterpolants,t=this._nActiveControlInterpolants++,i=e[t];return i===void 0&&(i=new Ir(new Float32Array(2),new Float32Array(2),1,wy),i.__cacheIndex=t,e[t]=i),i}_takeBackControlInterpolant(e){let t=this._controlInterpolants,i=e.__cacheIndex,s=--this._nActiveControlInterpolants,r=t[s];e.__cacheIndex=s,t[s]=e,r.__cacheIndex=i,t[i]=r}clipAction(e,t,i){let s=t||this._root,r=s.uuid,o=typeof e=="string"?$n.findByName(s,e):e,a=o!==null?o.uuid:e,c=this._actionsByClip[a],l=null;if(i===void 0&&(o!==null?i=o.blendMode:i=Ma),c!==void 0){let u=c.actionByRoot[r];if(u!==void 0&&u.blendMode===i)return u;l=c.knownActions[0],o===null&&(o=l._clip)}if(o===null)return null;let h=new _a(this,o,t,i);return this._bindAction(h,l),this._addInactiveAction(h,a,r),h}existingAction(e,t){let i=t||this._root,s=i.uuid,r=typeof e=="string"?$n.findByName(i,e):e,o=r?r.uuid:e,a=this._actionsByClip[o];return a!==void 0&&a.actionByRoot[s]||null}stopAllAction(){let e=this._actions,t=this._nActiveActions;for(let i=t-1;i>=0;--i)e[i].stop();return this}update(e){e*=this.timeScale;let t=this._actions,i=this._nActiveActions,s=this.time+=e,r=Math.sign(e),o=this._accuIndex^=1;for(let l=0;l!==i;++l)t[l]._update(s,e,r,o);let a=this._bindings,c=this._nActiveBindings;for(let l=0;l!==c;++l)a[l].apply(o);return this}setTime(e){this.time=0;for(let t=0;t<this._actions.length;t++)this._actions[t].time=0;return this.update(e)}getRoot(){return this._root}uncacheClip(e){let t=this._actions,i=e.uuid,s=this._actionsByClip,r=s[i];if(r!==void 0){let o=r.knownActions;for(let a=0,c=o.length;a!==c;++a){let l=o[a];this._deactivateAction(l);let h=l._cacheIndex,u=t[t.length-1];l._cacheIndex=null,l._byClipCacheIndex=null,u._cacheIndex=h,t[h]=u,t.pop(),this._removeInactiveBindingsForAction(l)}delete s[i]}}uncacheRoot(e){let t=e.uuid,i=this._actionsByClip;for(let o in i){let a=i[o].actionByRoot,c=a[t];c!==void 0&&(this._deactivateAction(c),this._removeInactiveAction(c))}let s=this._bindingsByRootAndName,r=s[t];if(r!==void 0)for(let o in r){let a=r[o];a.restoreOriginalState(),this._removeInactiveBinding(a)}}uncacheAction(e,t){let i=this.existingAction(e,t);i!==null&&(this._deactivateAction(i),this._removeInactiveAction(i))}};var Ts=class{constructor(e=1,t=0,i=0){return this.radius=e,this.phi=t,this.theta=i,this}set(e,t,i){return this.radius=e,this.phi=t,this.theta=i,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=Math.max(1e-6,Math.min(Math.PI-1e-6,this.phi)),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,i){return this.radius=Math.sqrt(e*e+t*t+i*i),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,i),this.phi=Math.acos(St(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}};var Es=class extends qn{constructor(e=10,t=10,i=4473924,s=8947848){i=new me(i),s=new me(s);let r=t/2,o=e/t,a=e/2,c=[],l=[];for(let d=0,f=0,g=-a;d<=t;d++,g+=o){c.push(-a,0,g,a,0,g),c.push(g,0,-a,g,0,a);let y=d===r?i:s;y.toArray(l,f),f+=3,y.toArray(l,f),f+=3,y.toArray(l,f),f+=3,y.toArray(l,f),f+=3}let h=new Mt;h.setAttribute("position",new it(c,3)),h.setAttribute("color",new it(l,3));let u=new an({vertexColors:!0,toneMapped:!1});super(h,u),this.type="GridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}};var zr=class extends qn{constructor(e=1){let t=[0,0,0,e,0,0,0,0,0,0,e,0,0,0,0,0,0,e],i=[1,0,0,1,.6,0,0,1,0,.6,1,0,0,0,1,0,.6,1],s=new Mt;s.setAttribute("position",new it(t,3)),s.setAttribute("color",new it(i,3));let r=new an({vertexColors:!0,toneMapped:!1});super(s,r),this.type="AxesHelper"}setColors(e,t,i){let s=new me,r=this.geometry.attributes.color.array;return s.set(e),s.toArray(r,0),s.toArray(r,3),s.set(t),s.toArray(r,6),s.toArray(r,9),s.set(i),s.toArray(r,12),s.toArray(r,15),this.geometry.attributes.color.needsUpdate=!0,this}dispose(){this.geometry.dispose(),this.material.dispose()}};typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"160"}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="160");var wh={type:"change"},Pa={type:"start"},Mh={type:"end"},qr=new Di,Th=new Zt,Ty=Math.cos(70*Wr.DEG2RAD),$r=class extends ei{constructor(e,t){super(),this.object=e,this.domElement=t,this.domElement.style.touchAction="none",this.enabled=!0,this.target=new L,this.cursor=new L,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:ln.ROTATE,MIDDLE:ln.DOLLY,RIGHT:ln.PAN},this.touches={ONE:hn.ROTATE,TWO:hn.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this.getPolarAngle=function(){return a.phi},this.getAzimuthalAngle=function(){return a.theta},this.getDistance=function(){return this.object.position.distanceTo(this.target)},this.listenToKeyEvents=function(A){A.addEventListener("keydown",Me),this._domElementKeyEvents=A},this.stopListenToKeyEvents=function(){this._domElementKeyEvents.removeEventListener("keydown",Me),this._domElementKeyEvents=null},this.saveState=function(){i.target0.copy(i.target),i.position0.copy(i.object.position),i.zoom0=i.object.zoom},this.reset=function(){i.target.copy(i.target0),i.object.position.copy(i.position0),i.object.zoom=i.zoom0,i.object.updateProjectionMatrix(),i.dispatchEvent(wh),i.update(),r=s.NONE},this.update=(function(){let A=new L,ie=new wt().setFromUnitVectors(e.up,new L(0,1,0)),xe=ie.clone().invert(),de=new L,J=new wt,P=new L,ne=2*Math.PI;return function(Ae=null){let we=i.object.position;A.copy(we).sub(i.target),A.applyQuaternion(ie),a.setFromVector3(A),i.autoRotate&&r===s.NONE&&V(E(Ae)),i.enableDamping?(a.theta+=c.theta*i.dampingFactor,a.phi+=c.phi*i.dampingFactor):(a.theta+=c.theta,a.phi+=c.phi);let Xe=i.minAzimuthAngle,qe=i.maxAzimuthAngle;isFinite(Xe)&&isFinite(qe)&&(Xe<-Math.PI?Xe+=ne:Xe>Math.PI&&(Xe-=ne),qe<-Math.PI?qe+=ne:qe>Math.PI&&(qe-=ne),Xe<=qe?a.theta=Math.max(Xe,Math.min(qe,a.theta)):a.theta=a.theta>(Xe+qe)/2?Math.max(Xe,a.theta):Math.min(qe,a.theta)),a.phi=Math.max(i.minPolarAngle,Math.min(i.maxPolarAngle,a.phi)),a.makeSafe(),i.enableDamping===!0?i.target.addScaledVector(h,i.dampingFactor):i.target.add(h),i.target.sub(i.cursor),i.target.clampLength(i.minTargetRadius,i.maxTargetRadius),i.target.add(i.cursor),i.zoomToCursor&&T||i.object.isOrthographicCamera?a.radius=Y(a.radius):a.radius=Y(a.radius*l),A.setFromSpherical(a),A.applyQuaternion(xe),we.copy(i.target).add(A),i.object.lookAt(i.target),i.enableDamping===!0?(c.theta*=1-i.dampingFactor,c.phi*=1-i.dampingFactor,h.multiplyScalar(1-i.dampingFactor)):(c.set(0,0,0),h.set(0,0,0));let rt=!1;if(i.zoomToCursor&&T){let ct=null;if(i.object.isPerspectiveCamera){let Ye=A.length();ct=Y(Ye*l);let ht=Ye-ct;i.object.position.addScaledVector(w,ht),i.object.updateMatrixWorld()}else if(i.object.isOrthographicCamera){let Ye=new L(C.x,C.y,0);Ye.unproject(i.object),i.object.zoom=Math.max(i.minZoom,Math.min(i.maxZoom,i.object.zoom/l)),i.object.updateProjectionMatrix(),rt=!0;let ht=new L(C.x,C.y,0);ht.unproject(i.object),i.object.position.sub(ht).add(Ye),i.object.updateMatrixWorld(),ct=A.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),i.zoomToCursor=!1;ct!==null&&(this.screenSpacePanning?i.target.set(0,0,-1).transformDirection(i.object.matrix).multiplyScalar(ct).add(i.object.position):(qr.origin.copy(i.object.position),qr.direction.set(0,0,-1).transformDirection(i.object.matrix),Math.abs(i.object.up.dot(qr.direction))<Ty?e.lookAt(i.target):(Th.setFromNormalAndCoplanarPoint(i.object.up,i.target),qr.intersectPlane(Th,i.target))))}else i.object.isOrthographicCamera&&(i.object.zoom=Math.max(i.minZoom,Math.min(i.maxZoom,i.object.zoom/l)),i.object.updateProjectionMatrix(),rt=!0);return l=1,T=!1,rt||de.distanceToSquared(i.object.position)>o||8*(1-J.dot(i.object.quaternion))>o||P.distanceToSquared(i.target)>0?(i.dispatchEvent(wh),de.copy(i.object.position),J.copy(i.object.quaternion),P.copy(i.target),!0):!1}})(),this.dispose=function(){i.domElement.removeEventListener("contextmenu",Ke),i.domElement.removeEventListener("pointerdown",M),i.domElement.removeEventListener("pointercancel",N),i.domElement.removeEventListener("wheel",te),i.domElement.removeEventListener("pointermove",x),i.domElement.removeEventListener("pointerup",N),i._domElementKeyEvents!==null&&(i._domElementKeyEvents.removeEventListener("keydown",Me),i._domElementKeyEvents=null)};let i=this,s={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},r=s.NONE,o=1e-6,a=new Ts,c=new Ts,l=1,h=new L,u=new Ee,d=new Ee,f=new Ee,g=new Ee,y=new Ee,m=new Ee,p=new Ee,S=new Ee,v=new Ee,w=new L,C=new Ee,T=!1,R=[],W={},_=!1;function E(A){return A!==null?2*Math.PI/60*i.autoRotateSpeed*A:2*Math.PI/60/60*i.autoRotateSpeed}function H(A){let ie=Math.abs(A*.01);return Math.pow(.95,i.zoomSpeed*ie)}function V(A){c.theta-=A}function Q(A){c.phi-=A}let I=(function(){let A=new L;return function(xe,de){A.setFromMatrixColumn(de,0),A.multiplyScalar(-xe),h.add(A)}})(),O=(function(){let A=new L;return function(xe,de){i.screenSpacePanning===!0?A.setFromMatrixColumn(de,1):(A.setFromMatrixColumn(de,0),A.crossVectors(i.object.up,A)),A.multiplyScalar(xe),h.add(A)}})(),z=(function(){let A=new L;return function(xe,de){let J=i.domElement;if(i.object.isPerspectiveCamera){let P=i.object.position;A.copy(P).sub(i.target);let ne=A.length();ne*=Math.tan(i.object.fov/2*Math.PI/180),I(2*xe*ne/J.clientHeight,i.object.matrix),O(2*de*ne/J.clientHeight,i.object.matrix)}else i.object.isOrthographicCamera?(I(xe*(i.object.right-i.object.left)/i.object.zoom/J.clientWidth,i.object.matrix),O(de*(i.object.top-i.object.bottom)/i.object.zoom/J.clientHeight,i.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),i.enablePan=!1)}})();function $(A){i.object.isPerspectiveCamera||i.object.isOrthographicCamera?l/=A:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),i.enableZoom=!1)}function X(A){i.object.isPerspectiveCamera||i.object.isOrthographicCamera?l*=A:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),i.enableZoom=!1)}function q(A,ie){if(!i.zoomToCursor)return;T=!0;let xe=i.domElement.getBoundingClientRect(),de=A-xe.left,J=ie-xe.top,P=xe.width,ne=xe.height;C.x=de/P*2-1,C.y=-(J/ne)*2+1,w.set(C.x,C.y,1).unproject(i.object).sub(i.object.position).normalize()}function Y(A){return Math.max(i.minDistance,Math.min(i.maxDistance,A))}function se(A){u.set(A.clientX,A.clientY)}function re(A){q(A.clientX,A.clientX),p.set(A.clientX,A.clientY)}function G(A){g.set(A.clientX,A.clientY)}function K(A){d.set(A.clientX,A.clientY),f.subVectors(d,u).multiplyScalar(i.rotateSpeed);let ie=i.domElement;V(2*Math.PI*f.x/ie.clientHeight),Q(2*Math.PI*f.y/ie.clientHeight),u.copy(d),i.update()}function le(A){S.set(A.clientX,A.clientY),v.subVectors(S,p),v.y>0?$(H(v.y)):v.y<0&&X(H(v.y)),p.copy(S),i.update()}function ve(A){y.set(A.clientX,A.clientY),m.subVectors(y,g).multiplyScalar(i.panSpeed),z(m.x,m.y),g.copy(y),i.update()}function ye(A){q(A.clientX,A.clientY),A.deltaY<0?X(H(A.deltaY)):A.deltaY>0&&$(H(A.deltaY)),i.update()}function Ie(A){let ie=!1;switch(A.code){case i.keys.UP:A.ctrlKey||A.metaKey||A.shiftKey?Q(2*Math.PI*i.rotateSpeed/i.domElement.clientHeight):z(0,i.keyPanSpeed),ie=!0;break;case i.keys.BOTTOM:A.ctrlKey||A.metaKey||A.shiftKey?Q(-2*Math.PI*i.rotateSpeed/i.domElement.clientHeight):z(0,-i.keyPanSpeed),ie=!0;break;case i.keys.LEFT:A.ctrlKey||A.metaKey||A.shiftKey?V(2*Math.PI*i.rotateSpeed/i.domElement.clientHeight):z(i.keyPanSpeed,0),ie=!0;break;case i.keys.RIGHT:A.ctrlKey||A.metaKey||A.shiftKey?V(-2*Math.PI*i.rotateSpeed/i.domElement.clientHeight):z(-i.keyPanSpeed,0),ie=!0;break}ie&&(A.preventDefault(),i.update())}function ke(A){if(R.length===1)u.set(A.pageX,A.pageY);else{let ie=he(A),xe=.5*(A.pageX+ie.x),de=.5*(A.pageY+ie.y);u.set(xe,de)}}function Te(A){if(R.length===1)g.set(A.pageX,A.pageY);else{let ie=he(A),xe=.5*(A.pageX+ie.x),de=.5*(A.pageY+ie.y);g.set(xe,de)}}function We(A){let ie=he(A),xe=A.pageX-ie.x,de=A.pageY-ie.y,J=Math.sqrt(xe*xe+de*de);p.set(0,J)}function D(A){i.enableZoom&&We(A),i.enablePan&&Te(A)}function bt(A){i.enableZoom&&We(A),i.enableRotate&&ke(A)}function Se(A){if(R.length==1)d.set(A.pageX,A.pageY);else{let xe=he(A),de=.5*(A.pageX+xe.x),J=.5*(A.pageY+xe.y);d.set(de,J)}f.subVectors(d,u).multiplyScalar(i.rotateSpeed);let ie=i.domElement;V(2*Math.PI*f.x/ie.clientHeight),Q(2*Math.PI*f.y/ie.clientHeight),u.copy(d)}function Ce(A){if(R.length===1)y.set(A.pageX,A.pageY);else{let ie=he(A),xe=.5*(A.pageX+ie.x),de=.5*(A.pageY+ie.y);y.set(xe,de)}m.subVectors(y,g).multiplyScalar(i.panSpeed),z(m.x,m.y),g.copy(y)}function fe(A){let ie=he(A),xe=A.pageX-ie.x,de=A.pageY-ie.y,J=Math.sqrt(xe*xe+de*de);S.set(0,J),v.set(0,Math.pow(S.y/p.y,i.zoomSpeed)),$(v.y),p.copy(S);let P=(A.pageX+ie.x)*.5,ne=(A.pageY+ie.y)*.5;q(P,ne)}function et(A){i.enableZoom&&fe(A),i.enablePan&&Ce(A)}function De(A){i.enableZoom&&fe(A),i.enableRotate&&Se(A)}function M(A){i.enabled!==!1&&(R.length===0&&(i.domElement.setPointerCapture(A.pointerId),i.domElement.addEventListener("pointermove",x),i.domElement.addEventListener("pointerup",N)),Be(A),A.pointerType==="touch"?Oe(A):ee(A))}function x(A){i.enabled!==!1&&(A.pointerType==="touch"?j(A):Z(A))}function N(A){Pe(A),R.length===0&&(i.domElement.releasePointerCapture(A.pointerId),i.domElement.removeEventListener("pointermove",x),i.domElement.removeEventListener("pointerup",N)),i.dispatchEvent(Mh),r=s.NONE}function ee(A){let ie;switch(A.button){case 0:ie=i.mouseButtons.LEFT;break;case 1:ie=i.mouseButtons.MIDDLE;break;case 2:ie=i.mouseButtons.RIGHT;break;default:ie=-1}switch(ie){case ln.DOLLY:if(i.enableZoom===!1)return;re(A),r=s.DOLLY;break;case ln.ROTATE:if(A.ctrlKey||A.metaKey||A.shiftKey){if(i.enablePan===!1)return;G(A),r=s.PAN}else{if(i.enableRotate===!1)return;se(A),r=s.ROTATE}break;case ln.PAN:if(A.ctrlKey||A.metaKey||A.shiftKey){if(i.enableRotate===!1)return;se(A),r=s.ROTATE}else{if(i.enablePan===!1)return;G(A),r=s.PAN}break;default:r=s.NONE}r!==s.NONE&&i.dispatchEvent(Pa)}function Z(A){switch(r){case s.ROTATE:if(i.enableRotate===!1)return;K(A);break;case s.DOLLY:if(i.enableZoom===!1)return;le(A);break;case s.PAN:if(i.enablePan===!1)return;ve(A);break}}function te(A){i.enabled===!1||i.enableZoom===!1||r!==s.NONE||(A.preventDefault(),i.dispatchEvent(Pa),ye(ge(A)),i.dispatchEvent(Mh))}function ge(A){let ie=A.deltaMode,xe={clientX:A.clientX,clientY:A.clientY,deltaY:A.deltaY};switch(ie){case 1:xe.deltaY*=16;break;case 2:xe.deltaY*=100;break}return A.ctrlKey&&!_&&(xe.deltaY*=10),xe}function ce(A){A.key==="Control"&&(_=!0,document.addEventListener("keyup",pe,{passive:!0,capture:!0}))}function pe(A){A.key==="Control"&&(_=!1,document.removeEventListener("keyup",pe,{passive:!0,capture:!0}))}function Me(A){i.enabled===!1||i.enablePan===!1||Ie(A)}function Oe(A){switch(be(A),R.length){case 1:switch(i.touches.ONE){case hn.ROTATE:if(i.enableRotate===!1)return;ke(A),r=s.TOUCH_ROTATE;break;case hn.PAN:if(i.enablePan===!1)return;Te(A),r=s.TOUCH_PAN;break;default:r=s.NONE}break;case 2:switch(i.touches.TWO){case hn.DOLLY_PAN:if(i.enableZoom===!1&&i.enablePan===!1)return;D(A),r=s.TOUCH_DOLLY_PAN;break;case hn.DOLLY_ROTATE:if(i.enableZoom===!1&&i.enableRotate===!1)return;bt(A),r=s.TOUCH_DOLLY_ROTATE;break;default:r=s.NONE}break;default:r=s.NONE}r!==s.NONE&&i.dispatchEvent(Pa)}function j(A){switch(be(A),r){case s.TOUCH_ROTATE:if(i.enableRotate===!1)return;Se(A),i.update();break;case s.TOUCH_PAN:if(i.enablePan===!1)return;Ce(A),i.update();break;case s.TOUCH_DOLLY_PAN:if(i.enableZoom===!1&&i.enablePan===!1)return;et(A),i.update();break;case s.TOUCH_DOLLY_ROTATE:if(i.enableZoom===!1&&i.enableRotate===!1)return;De(A),i.update();break;default:r=s.NONE}}function Ke(A){i.enabled!==!1&&A.preventDefault()}function Be(A){R.push(A.pointerId)}function Pe(A){delete W[A.pointerId];for(let ie=0;ie<R.length;ie++)if(R[ie]==A.pointerId){R.splice(ie,1);return}}function be(A){let ie=W[A.pointerId];ie===void 0&&(ie=new Ee,W[A.pointerId]=ie),ie.set(A.pageX,A.pageY)}function he(A){let ie=A.pointerId===R[0]?R[1]:R[0];return W[ie]}i.domElement.addEventListener("contextmenu",Ke),i.domElement.addEventListener("pointerdown",M),i.domElement.addEventListener("pointercancel",N),i.domElement.addEventListener("wheel",te,{passive:!1}),document.addEventListener("keydown",ce,{passive:!0,capture:!0}),this.update()}};function La(n,e){if(e===lh)return console.warn("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Geometry already defined as triangles."),n;if(e===Rs||e===Vr){let t=n.getIndex();if(t===null){let o=[],a=n.getAttribute("position");if(a!==void 0){for(let c=0;c<a.count;c++)o.push(c);n.setIndex(o),t=n.getIndex()}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Undefined position attribute. Processing not possible."),n}let i=t.count-2,s=[];if(e===Rs)for(let o=1;o<=i;o++)s.push(t.getX(0)),s.push(t.getX(o)),s.push(t.getX(o+1));else for(let o=0;o<i;o++)o%2===0?(s.push(t.getX(o)),s.push(t.getX(o+1)),s.push(t.getX(o+2))):(s.push(t.getX(o+2)),s.push(t.getX(o+1)),s.push(t.getX(o)));s.length/3!==i&&console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unable to generate correct amount of triangles.");let r=n.clone();return r.setIndex(s),r.clearGroups(),r}else return console.error("THREE.BufferGeometryUtils.toTrianglesDrawMode(): Unknown draw mode:",e),n}var Yr=class extends wi{constructor(e){super(e),this.dracoLoader=null,this.ktx2Loader=null,this.meshoptDecoder=null,this.pluginCallbacks=[],this.register(function(t){return new Fa(t)}),this.register(function(t){return new $a(t)}),this.register(function(t){return new Ya(t)}),this.register(function(t){return new Ka(t)}),this.register(function(t){return new za(t)}),this.register(function(t){return new Ha(t)}),this.register(function(t){return new Va(t)}),this.register(function(t){return new Ga(t)}),this.register(function(t){return new Ua(t)}),this.register(function(t){return new Wa(t)}),this.register(function(t){return new Ba(t)}),this.register(function(t){return new qa(t)}),this.register(function(t){return new Xa(t)}),this.register(function(t){return new Da(t)}),this.register(function(t){return new ja(t)}),this.register(function(t){return new Za(t)})}load(e,t,i,s){let r=this,o;if(this.resourcePath!=="")o=this.resourcePath;else if(this.path!==""){let l=zi.extractUrlBase(e);o=zi.resolveURL(l,this.path)}else o=zi.extractUrlBase(e);this.manager.itemStart(e);let a=function(l){s?s(l):console.error(l),r.manager.itemError(e),r.manager.itemEnd(e)},c=new ws(this.manager);c.setPath(this.path),c.setResponseType("arraybuffer"),c.setRequestHeader(this.requestHeader),c.setWithCredentials(this.withCredentials),c.load(e,function(l){try{r.parse(l,o,function(h){t(h),r.manager.itemEnd(e)},a)}catch(h){a(h)}},i,a)}setDRACOLoader(e){return this.dracoLoader=e,this}setDDSLoader(){throw new Error('THREE.GLTFLoader: "MSFT_texture_dds" no longer supported. Please update to "KHR_texture_basisu".')}setKTX2Loader(e){return this.ktx2Loader=e,this}setMeshoptDecoder(e){return this.meshoptDecoder=e,this}register(e){return this.pluginCallbacks.indexOf(e)===-1&&this.pluginCallbacks.push(e),this}unregister(e){return this.pluginCallbacks.indexOf(e)!==-1&&this.pluginCallbacks.splice(this.pluginCallbacks.indexOf(e),1),this}parse(e,t,i,s){let r,o={},a={},c=new TextDecoder;if(typeof e=="string")r=JSON.parse(e);else if(e instanceof ArrayBuffer)if(c.decode(new Uint8Array(e,0,4))===Ph){try{o[$e.KHR_BINARY_GLTF]=new Ja(e)}catch(u){s&&s(u);return}r=JSON.parse(o[$e.KHR_BINARY_GLTF].content)}else r=JSON.parse(c.decode(e));else r=e;if(r.asset===void 0||r.asset.version[0]<2){s&&s(new Error("THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported."));return}let l=new rc(r,{path:t||this.resourcePath||"",crossOrigin:this.crossOrigin,requestHeader:this.requestHeader,manager:this.manager,ktx2Loader:this.ktx2Loader,meshoptDecoder:this.meshoptDecoder});l.fileLoader.setRequestHeader(this.requestHeader);for(let h=0;h<this.pluginCallbacks.length;h++){let u=this.pluginCallbacks[h](l);u.name||console.error("THREE.GLTFLoader: Invalid plugin found: missing name"),a[u.name]=u,o[u.name]=!0}if(r.extensionsUsed)for(let h=0;h<r.extensionsUsed.length;++h){let u=r.extensionsUsed[h],d=r.extensionsRequired||[];switch(u){case $e.KHR_MATERIALS_UNLIT:o[u]=new Oa;break;case $e.KHR_DRACO_MESH_COMPRESSION:o[u]=new Qa(r,this.dracoLoader);break;case $e.KHR_TEXTURE_TRANSFORM:o[u]=new ec;break;case $e.KHR_MESH_QUANTIZATION:o[u]=new tc;break;default:d.indexOf(u)>=0&&a[u]===void 0&&console.warn('THREE.GLTFLoader: Unknown extension "'+u+'".')}}l.setExtensions(o),l.setPlugins(a),l.parse(i,s)}parseAsync(e,t){let i=this;return new Promise(function(s,r){i.parse(e,t,s,r)})}};function Ey(){let n={};return{get:function(e){return n[e]},add:function(e,t){n[e]=t},remove:function(e){delete n[e]},removeAll:function(){n={}}}}var $e={KHR_BINARY_GLTF:"KHR_binary_glTF",KHR_DRACO_MESH_COMPRESSION:"KHR_draco_mesh_compression",KHR_LIGHTS_PUNCTUAL:"KHR_lights_punctual",KHR_MATERIALS_CLEARCOAT:"KHR_materials_clearcoat",KHR_MATERIALS_IOR:"KHR_materials_ior",KHR_MATERIALS_SHEEN:"KHR_materials_sheen",KHR_MATERIALS_SPECULAR:"KHR_materials_specular",KHR_MATERIALS_TRANSMISSION:"KHR_materials_transmission",KHR_MATERIALS_IRIDESCENCE:"KHR_materials_iridescence",KHR_MATERIALS_ANISOTROPY:"KHR_materials_anisotropy",KHR_MATERIALS_UNLIT:"KHR_materials_unlit",KHR_MATERIALS_VOLUME:"KHR_materials_volume",KHR_TEXTURE_BASISU:"KHR_texture_basisu",KHR_TEXTURE_TRANSFORM:"KHR_texture_transform",KHR_MESH_QUANTIZATION:"KHR_mesh_quantization",KHR_MATERIALS_EMISSIVE_STRENGTH:"KHR_materials_emissive_strength",EXT_MATERIALS_BUMP:"EXT_materials_bump",EXT_TEXTURE_WEBP:"EXT_texture_webp",EXT_TEXTURE_AVIF:"EXT_texture_avif",EXT_MESHOPT_COMPRESSION:"EXT_meshopt_compression",EXT_MESH_GPU_INSTANCING:"EXT_mesh_gpu_instancing"},Da=class{constructor(e){this.parser=e,this.name=$e.KHR_LIGHTS_PUNCTUAL,this.cache={refs:{},uses:{}}}_markDefs(){let e=this.parser,t=this.parser.json.nodes||[];for(let i=0,s=t.length;i<s;i++){let r=t[i];r.extensions&&r.extensions[this.name]&&r.extensions[this.name].light!==void 0&&e._addNodeRef(this.cache,r.extensions[this.name].light)}}_loadLight(e){let t=this.parser,i="light:"+e,s=t.cache.get(i);if(s)return s;let r=t.json,c=((r.extensions&&r.extensions[this.name]||{}).lights||[])[e],l,h=new me(16777215);c.color!==void 0&&h.setRGB(c.color[0],c.color[1],c.color[2],mt);let u=c.range!==void 0?c.range:0;switch(c.type){case"directional":l=new cn(h),l.target.position.set(0,0,-1),l.add(l.target);break;case"point":l=new Or(h),l.distance=u;break;case"spot":l=new Dr(h),l.distance=u,c.spot=c.spot||{},c.spot.innerConeAngle=c.spot.innerConeAngle!==void 0?c.spot.innerConeAngle:0,c.spot.outerConeAngle=c.spot.outerConeAngle!==void 0?c.spot.outerConeAngle:Math.PI/4,l.angle=c.spot.outerConeAngle,l.penumbra=1-c.spot.innerConeAngle/c.spot.outerConeAngle,l.target.position.set(0,0,-1),l.add(l.target);break;default:throw new Error("THREE.GLTFLoader: Unexpected light type: "+c.type)}return l.position.set(0,0,0),l.decay=2,Vi(l,c),c.intensity!==void 0&&(l.intensity=c.intensity),l.name=t.createUniqueName(c.name||"light_"+e),s=Promise.resolve(l),t.cache.add(i,s),s}getDependency(e,t){if(e==="light")return this._loadLight(t)}createNodeAttachment(e){let t=this,i=this.parser,r=i.json.nodes[e],a=(r.extensions&&r.extensions[this.name]||{}).light;return a===void 0?null:this._loadLight(a).then(function(c){return i._getNodeRef(t.cache,a,c)})}},Oa=class{constructor(){this.name=$e.KHR_MATERIALS_UNLIT}getMaterialType(){return oi}extendParams(e,t,i){let s=[];e.color=new me(1,1,1),e.opacity=1;let r=t.pbrMetallicRoughness;if(r){if(Array.isArray(r.baseColorFactor)){let o=r.baseColorFactor;e.color.setRGB(o[0],o[1],o[2],mt),e.opacity=o[3]}r.baseColorTexture!==void 0&&s.push(i.assignTexture(e,"map",r.baseColorTexture,st))}return Promise.all(s)}},Ua=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_EMISSIVE_STRENGTH}extendMaterialParams(e,t){let s=this.parser.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=s.extensions[this.name].emissiveStrength;return r!==void 0&&(t.emissiveIntensity=r),Promise.resolve()}},Fa=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_CLEARCOAT}getMaterialType(e){let i=this.parser.json.materials[e];return!i.extensions||!i.extensions[this.name]?null:Xt}extendMaterialParams(e,t){let i=this.parser,s=i.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[],o=s.extensions[this.name];if(o.clearcoatFactor!==void 0&&(t.clearcoat=o.clearcoatFactor),o.clearcoatTexture!==void 0&&r.push(i.assignTexture(t,"clearcoatMap",o.clearcoatTexture)),o.clearcoatRoughnessFactor!==void 0&&(t.clearcoatRoughness=o.clearcoatRoughnessFactor),o.clearcoatRoughnessTexture!==void 0&&r.push(i.assignTexture(t,"clearcoatRoughnessMap",o.clearcoatRoughnessTexture)),o.clearcoatNormalTexture!==void 0&&(r.push(i.assignTexture(t,"clearcoatNormalMap",o.clearcoatNormalTexture)),o.clearcoatNormalTexture.scale!==void 0)){let a=o.clearcoatNormalTexture.scale;t.clearcoatNormalScale=new Ee(a,a)}return Promise.all(r)}},Ba=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_IRIDESCENCE}getMaterialType(e){let i=this.parser.json.materials[e];return!i.extensions||!i.extensions[this.name]?null:Xt}extendMaterialParams(e,t){let i=this.parser,s=i.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[],o=s.extensions[this.name];return o.iridescenceFactor!==void 0&&(t.iridescence=o.iridescenceFactor),o.iridescenceTexture!==void 0&&r.push(i.assignTexture(t,"iridescenceMap",o.iridescenceTexture)),o.iridescenceIor!==void 0&&(t.iridescenceIOR=o.iridescenceIor),t.iridescenceThicknessRange===void 0&&(t.iridescenceThicknessRange=[100,400]),o.iridescenceThicknessMinimum!==void 0&&(t.iridescenceThicknessRange[0]=o.iridescenceThicknessMinimum),o.iridescenceThicknessMaximum!==void 0&&(t.iridescenceThicknessRange[1]=o.iridescenceThicknessMaximum),o.iridescenceThicknessTexture!==void 0&&r.push(i.assignTexture(t,"iridescenceThicknessMap",o.iridescenceThicknessTexture)),Promise.all(r)}},za=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_SHEEN}getMaterialType(e){let i=this.parser.json.materials[e];return!i.extensions||!i.extensions[this.name]?null:Xt}extendMaterialParams(e,t){let i=this.parser,s=i.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[];t.sheenColor=new me(0,0,0),t.sheenRoughness=0,t.sheen=1;let o=s.extensions[this.name];if(o.sheenColorFactor!==void 0){let a=o.sheenColorFactor;t.sheenColor.setRGB(a[0],a[1],a[2],mt)}return o.sheenRoughnessFactor!==void 0&&(t.sheenRoughness=o.sheenRoughnessFactor),o.sheenColorTexture!==void 0&&r.push(i.assignTexture(t,"sheenColorMap",o.sheenColorTexture,st)),o.sheenRoughnessTexture!==void 0&&r.push(i.assignTexture(t,"sheenRoughnessMap",o.sheenRoughnessTexture)),Promise.all(r)}},Ha=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_TRANSMISSION}getMaterialType(e){let i=this.parser.json.materials[e];return!i.extensions||!i.extensions[this.name]?null:Xt}extendMaterialParams(e,t){let i=this.parser,s=i.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[],o=s.extensions[this.name];return o.transmissionFactor!==void 0&&(t.transmission=o.transmissionFactor),o.transmissionTexture!==void 0&&r.push(i.assignTexture(t,"transmissionMap",o.transmissionTexture)),Promise.all(r)}},Va=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_VOLUME}getMaterialType(e){let i=this.parser.json.materials[e];return!i.extensions||!i.extensions[this.name]?null:Xt}extendMaterialParams(e,t){let i=this.parser,s=i.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[],o=s.extensions[this.name];t.thickness=o.thicknessFactor!==void 0?o.thicknessFactor:0,o.thicknessTexture!==void 0&&r.push(i.assignTexture(t,"thicknessMap",o.thicknessTexture)),t.attenuationDistance=o.attenuationDistance||1/0;let a=o.attenuationColor||[1,1,1];return t.attenuationColor=new me().setRGB(a[0],a[1],a[2],mt),Promise.all(r)}},Ga=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_IOR}getMaterialType(e){let i=this.parser.json.materials[e];return!i.extensions||!i.extensions[this.name]?null:Xt}extendMaterialParams(e,t){let s=this.parser.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=s.extensions[this.name];return t.ior=r.ior!==void 0?r.ior:1.5,Promise.resolve()}},Wa=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_SPECULAR}getMaterialType(e){let i=this.parser.json.materials[e];return!i.extensions||!i.extensions[this.name]?null:Xt}extendMaterialParams(e,t){let i=this.parser,s=i.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[],o=s.extensions[this.name];t.specularIntensity=o.specularFactor!==void 0?o.specularFactor:1,o.specularTexture!==void 0&&r.push(i.assignTexture(t,"specularIntensityMap",o.specularTexture));let a=o.specularColorFactor||[1,1,1];return t.specularColor=new me().setRGB(a[0],a[1],a[2],mt),o.specularColorTexture!==void 0&&r.push(i.assignTexture(t,"specularColorMap",o.specularColorTexture,st)),Promise.all(r)}},Xa=class{constructor(e){this.parser=e,this.name=$e.EXT_MATERIALS_BUMP}getMaterialType(e){let i=this.parser.json.materials[e];return!i.extensions||!i.extensions[this.name]?null:Xt}extendMaterialParams(e,t){let i=this.parser,s=i.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[],o=s.extensions[this.name];return t.bumpScale=o.bumpFactor!==void 0?o.bumpFactor:1,o.bumpTexture!==void 0&&r.push(i.assignTexture(t,"bumpMap",o.bumpTexture)),Promise.all(r)}},qa=class{constructor(e){this.parser=e,this.name=$e.KHR_MATERIALS_ANISOTROPY}getMaterialType(e){let i=this.parser.json.materials[e];return!i.extensions||!i.extensions[this.name]?null:Xt}extendMaterialParams(e,t){let i=this.parser,s=i.json.materials[e];if(!s.extensions||!s.extensions[this.name])return Promise.resolve();let r=[],o=s.extensions[this.name];return o.anisotropyStrength!==void 0&&(t.anisotropy=o.anisotropyStrength),o.anisotropyRotation!==void 0&&(t.anisotropyRotation=o.anisotropyRotation),o.anisotropyTexture!==void 0&&r.push(i.assignTexture(t,"anisotropyMap",o.anisotropyTexture)),Promise.all(r)}},$a=class{constructor(e){this.parser=e,this.name=$e.KHR_TEXTURE_BASISU}loadTexture(e){let t=this.parser,i=t.json,s=i.textures[e];if(!s.extensions||!s.extensions[this.name])return null;let r=s.extensions[this.name],o=t.options.ktx2Loader;if(!o){if(i.extensionsRequired&&i.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures");return null}return t.loadTextureImage(e,r.source,o)}},Ya=class{constructor(e){this.parser=e,this.name=$e.EXT_TEXTURE_WEBP,this.isSupported=null}loadTexture(e){let t=this.name,i=this.parser,s=i.json,r=s.textures[e];if(!r.extensions||!r.extensions[t])return null;let o=r.extensions[t],a=s.images[o.source],c=i.textureLoader;if(a.uri){let l=i.options.manager.getHandler(a.uri);l!==null&&(c=l)}return this.detectSupport().then(function(l){if(l)return i.loadTextureImage(e,o.source,c);if(s.extensionsRequired&&s.extensionsRequired.indexOf(t)>=0)throw new Error("THREE.GLTFLoader: WebP required by asset but unsupported.");return i.loadTexture(e)})}detectSupport(){return this.isSupported||(this.isSupported=new Promise(function(e){let t=new Image;t.src="data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA",t.onload=t.onerror=function(){e(t.height===1)}})),this.isSupported}},Ka=class{constructor(e){this.parser=e,this.name=$e.EXT_TEXTURE_AVIF,this.isSupported=null}loadTexture(e){let t=this.name,i=this.parser,s=i.json,r=s.textures[e];if(!r.extensions||!r.extensions[t])return null;let o=r.extensions[t],a=s.images[o.source],c=i.textureLoader;if(a.uri){let l=i.options.manager.getHandler(a.uri);l!==null&&(c=l)}return this.detectSupport().then(function(l){if(l)return i.loadTextureImage(e,o.source,c);if(s.extensionsRequired&&s.extensionsRequired.indexOf(t)>=0)throw new Error("THREE.GLTFLoader: AVIF required by asset but unsupported.");return i.loadTexture(e)})}detectSupport(){return this.isSupported||(this.isSupported=new Promise(function(e){let t=new Image;t.src="data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAABcAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEDQgMgkQAAAAB8dSLfI=",t.onload=t.onerror=function(){e(t.height===1)}})),this.isSupported}},ja=class{constructor(e){this.name=$e.EXT_MESHOPT_COMPRESSION,this.parser=e}loadBufferView(e){let t=this.parser.json,i=t.bufferViews[e];if(i.extensions&&i.extensions[this.name]){let s=i.extensions[this.name],r=this.parser.getDependency("buffer",s.buffer),o=this.parser.options.meshoptDecoder;if(!o||!o.supported){if(t.extensionsRequired&&t.extensionsRequired.indexOf(this.name)>=0)throw new Error("THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files");return null}return r.then(function(a){let c=s.byteOffset||0,l=s.byteLength||0,h=s.count,u=s.byteStride,d=new Uint8Array(a,c,l);return o.decodeGltfBufferAsync?o.decodeGltfBufferAsync(h,u,d,s.mode,s.filter).then(function(f){return f.buffer}):o.ready.then(function(){let f=new ArrayBuffer(h*u);return o.decodeGltfBuffer(new Uint8Array(f),h,u,d,s.mode,s.filter),f})})}else return null}},Za=class{constructor(e){this.name=$e.EXT_MESH_GPU_INSTANCING,this.parser=e}createNodeMesh(e){let t=this.parser.json,i=t.nodes[e];if(!i.extensions||!i.extensions[this.name]||i.mesh===void 0)return null;let s=t.meshes[i.mesh];for(let l of s.primitives)if(l.mode!==$t.TRIANGLES&&l.mode!==$t.TRIANGLE_STRIP&&l.mode!==$t.TRIANGLE_FAN&&l.mode!==void 0)return null;let o=i.extensions[this.name].attributes,a=[],c={};for(let l in o)a.push(this.parser.getDependency("accessor",o[l]).then(h=>(c[l]=h,c[l])));return a.length<1?null:(a.push(this.parser.createNodeMesh(e)),Promise.all(a).then(l=>{let h=l.pop(),u=h.isGroup?h.children:[h],d=l[0].count,f=[];for(let g of u){let y=new Ge,m=new L,p=new wt,S=new L(1,1,1),v=new Ar(g.geometry,g.material,d);for(let w=0;w<d;w++)c.TRANSLATION&&m.fromBufferAttribute(c.TRANSLATION,w),c.ROTATION&&p.fromBufferAttribute(c.ROTATION,w),c.SCALE&&S.fromBufferAttribute(c.SCALE,w),v.setMatrixAt(w,y.compose(m,p,S));for(let w in c)if(w==="_COLOR_0"){let C=c[w];v.instanceColor=new on(C.array,C.itemSize,C.normalized)}else w!=="TRANSLATION"&&w!=="ROTATION"&&w!=="SCALE"&&g.geometry.setAttribute(w,c[w]);at.prototype.copy.call(v,g),this.parser.assignFinalMaterial(v),f.push(v)}return h.isGroup?(h.clear(),h.add(...f),h):f[0]}))}},Ph="glTF",Cs=12,Eh={JSON:1313821514,BIN:5130562},Ja=class{constructor(e){this.name=$e.KHR_BINARY_GLTF,this.content=null,this.body=null;let t=new DataView(e,0,Cs),i=new TextDecoder;if(this.header={magic:i.decode(new Uint8Array(e.slice(0,4))),version:t.getUint32(4,!0),length:t.getUint32(8,!0)},this.header.magic!==Ph)throw new Error("THREE.GLTFLoader: Unsupported glTF-Binary header.");if(this.header.version<2)throw new Error("THREE.GLTFLoader: Legacy binary file detected.");let s=this.header.length-Cs,r=new DataView(e,Cs),o=0;for(;o<s;){let a=r.getUint32(o,!0);o+=4;let c=r.getUint32(o,!0);if(o+=4,c===Eh.JSON){let l=new Uint8Array(e,Cs+o,a);this.content=i.decode(l)}else if(c===Eh.BIN){let l=Cs+o;this.body=e.slice(l,l+a)}o+=a}if(this.content===null)throw new Error("THREE.GLTFLoader: JSON content not found.")}},Qa=class{constructor(e,t){if(!t)throw new Error("THREE.GLTFLoader: No DRACOLoader instance provided.");this.name=$e.KHR_DRACO_MESH_COMPRESSION,this.json=e,this.dracoLoader=t,this.dracoLoader.preload()}decodePrimitive(e,t){let i=this.json,s=this.dracoLoader,r=e.extensions[this.name].bufferView,o=e.extensions[this.name].attributes,a={},c={},l={};for(let h in o){let u=nc[h]||h.toLowerCase();a[u]=o[h]}for(let h in e.attributes){let u=nc[h]||h.toLowerCase();if(o[h]!==void 0){let d=i.accessors[e.attributes[h]],f=Zn[d.componentType];l[u]=f.name,c[u]=d.normalized===!0}}return t.getDependency("bufferView",r).then(function(h){return new Promise(function(u,d){s.decodeDracoFile(h,function(f){for(let g in f.attributes){let y=f.attributes[g],m=c[g];m!==void 0&&(y.normalized=m)}u(f)},a,l,mt,d)})})}},ec=class{constructor(){this.name=$e.KHR_TEXTURE_TRANSFORM}extendTexture(e,t){return(t.texCoord===void 0||t.texCoord===e.channel)&&t.offset===void 0&&t.rotation===void 0&&t.scale===void 0||(e=e.clone(),t.texCoord!==void 0&&(e.channel=t.texCoord),t.offset!==void 0&&e.offset.fromArray(t.offset),t.rotation!==void 0&&(e.rotation=t.rotation),t.scale!==void 0&&e.repeat.fromArray(t.scale),e.needsUpdate=!0),e}},tc=class{constructor(){this.name=$e.KHR_MESH_QUANTIZATION}},Kr=class extends Ui{constructor(e,t,i,s){super(e,t,i,s)}copySampleValue_(e){let t=this.resultBuffer,i=this.sampleValues,s=this.valueSize,r=e*s*3+s;for(let o=0;o!==s;o++)t[o]=i[r+o];return t}interpolate_(e,t,i,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,c=a*2,l=a*3,h=s-t,u=(i-t)/h,d=u*u,f=d*u,g=e*l,y=g-l,m=-2*f+3*d,p=f-d,S=1-m,v=p-d+u;for(let w=0;w!==a;w++){let C=o[y+w+a],T=o[y+w+c]*h,R=o[g+w+a],W=o[g+w]*h;r[w]=S*C+v*T+m*R+p*W}return r}},Ay=new wt,ic=class extends Kr{interpolate_(e,t,i,s){let r=super.interpolate_(e,t,i,s);return Ay.fromArray(r).normalize().toArray(r),r}},$t={FLOAT:5126,FLOAT_MAT3:35675,FLOAT_MAT4:35676,FLOAT_VEC2:35664,FLOAT_VEC3:35665,FLOAT_VEC4:35666,LINEAR:9729,REPEAT:10497,SAMPLER_2D:35678,POINTS:0,LINES:1,LINE_LOOP:2,LINE_STRIP:3,TRIANGLES:4,TRIANGLE_STRIP:5,TRIANGLE_FAN:6,UNSIGNED_BYTE:5121,UNSIGNED_SHORT:5123},Zn={5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array},Ah={9728:pt,9729:Lt,9984:ar,9985:ba,9986:os,9987:Ni},Rh={33071:Ut,33648:us,10497:sn},Ia={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT2:4,MAT3:9,MAT4:16},nc={POSITION:"position",NORMAL:"normal",TANGENT:"tangent",TEXCOORD_0:"uv",TEXCOORD_1:"uv1",TEXCOORD_2:"uv2",TEXCOORD_3:"uv3",COLOR_0:"color",WEIGHTS_0:"skinWeight",JOINTS_0:"skinIndex"},Hi={scale:"scale",translation:"position",rotation:"quaternion",weights:"morphTargetInfluences"},Ry={CUBICSPLINE:void 0,LINEAR:rn,STEP:zn},ka={OPAQUE:"OPAQUE",MASK:"MASK",BLEND:"BLEND"};function Cy(n){return n.DefaultMaterial===void 0&&(n.DefaultMaterial=new _i({color:16777215,emissive:0,metalness:1,roughness:1,transparent:!1,depthTest:!0,side:ri})),n.DefaultMaterial}function un(n,e,t){for(let i in t.extensions)n[i]===void 0&&(e.userData.gltfExtensions=e.userData.gltfExtensions||{},e.userData.gltfExtensions[i]=t.extensions[i])}function Vi(n,e){e.extras!==void 0&&(typeof e.extras=="object"?Object.assign(n.userData,e.extras):console.warn("THREE.GLTFLoader: Ignoring primitive type .extras, "+e.extras))}function Py(n,e,t){let i=!1,s=!1,r=!1;for(let l=0,h=e.length;l<h;l++){let u=e[l];if(u.POSITION!==void 0&&(i=!0),u.NORMAL!==void 0&&(s=!0),u.COLOR_0!==void 0&&(r=!0),i&&s&&r)break}if(!i&&!s&&!r)return Promise.resolve(n);let o=[],a=[],c=[];for(let l=0,h=e.length;l<h;l++){let u=e[l];if(i){let d=u.POSITION!==void 0?t.getDependency("accessor",u.POSITION):n.attributes.position;o.push(d)}if(s){let d=u.NORMAL!==void 0?t.getDependency("accessor",u.NORMAL):n.attributes.normal;a.push(d)}if(r){let d=u.COLOR_0!==void 0?t.getDependency("accessor",u.COLOR_0):n.attributes.color;c.push(d)}}return Promise.all([Promise.all(o),Promise.all(a),Promise.all(c)]).then(function(l){let h=l[0],u=l[1],d=l[2];return i&&(n.morphAttributes.position=h),s&&(n.morphAttributes.normal=u),r&&(n.morphAttributes.color=d),n.morphTargetsRelative=!0,n})}function Ly(n,e){if(n.updateMorphTargets(),e.weights!==void 0)for(let t=0,i=e.weights.length;t<i;t++)n.morphTargetInfluences[t]=e.weights[t];if(e.extras&&Array.isArray(e.extras.targetNames)){let t=e.extras.targetNames;if(n.morphTargetInfluences.length===t.length){n.morphTargetDictionary={};for(let i=0,s=t.length;i<s;i++)n.morphTargetDictionary[t[i]]=i}else console.warn("THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.")}}function Iy(n){let e,t=n.extensions&&n.extensions[$e.KHR_DRACO_MESH_COMPRESSION];if(t?e="draco:"+t.bufferView+":"+t.indices+":"+Na(t.attributes):e=n.indices+":"+Na(n.attributes)+":"+n.mode,n.targets!==void 0)for(let i=0,s=n.targets.length;i<s;i++)e+=":"+Na(n.targets[i]);return e}function Na(n){let e="",t=Object.keys(n).sort();for(let i=0,s=t.length;i<s;i++)e+=t[i]+":"+n[t[i]]+";";return e}function sc(n){switch(n){case Int8Array:return 1/127;case Uint8Array:return 1/255;case Int16Array:return 1/32767;case Uint16Array:return 1/65535;default:throw new Error("THREE.GLTFLoader: Unsupported normalized accessor component type.")}}function ky(n){return n.search(/\.jpe?g($|\?)/i)>0||n.search(/^data\:image\/jpeg/)===0?"image/jpeg":n.search(/\.webp($|\?)/i)>0||n.search(/^data\:image\/webp/)===0?"image/webp":"image/png"}var Ny=new Ge,rc=class{constructor(e={},t={}){this.json=e,this.extensions={},this.plugins={},this.options=t,this.cache=new Ey,this.associations=new Map,this.primitiveCache={},this.nodeCache={},this.meshCache={refs:{},uses:{}},this.cameraCache={refs:{},uses:{}},this.lightCache={refs:{},uses:{}},this.sourceCache={},this.textureCache={},this.nodeNamesUsed={};let i=!1,s=!1,r=-1;typeof navigator<"u"&&(i=/^((?!chrome|android).)*safari/i.test(navigator.userAgent)===!0,s=navigator.userAgent.indexOf("Firefox")>-1,r=s?navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1]:-1),typeof createImageBitmap>"u"||i||s&&r<98?this.textureLoader=new Nr(this.options.manager):this.textureLoader=new Ur(this.options.manager),this.textureLoader.setCrossOrigin(this.options.crossOrigin),this.textureLoader.setRequestHeader(this.options.requestHeader),this.fileLoader=new ws(this.options.manager),this.fileLoader.setResponseType("arraybuffer"),this.options.crossOrigin==="use-credentials"&&this.fileLoader.setWithCredentials(!0)}setExtensions(e){this.extensions=e}setPlugins(e){this.plugins=e}parse(e,t){let i=this,s=this.json,r=this.extensions;this.cache.removeAll(),this.nodeCache={},this._invokeAll(function(o){return o._markDefs&&o._markDefs()}),Promise.all(this._invokeAll(function(o){return o.beforeRoot&&o.beforeRoot()})).then(function(){return Promise.all([i.getDependencies("scene"),i.getDependencies("animation"),i.getDependencies("camera")])}).then(function(o){let a={scene:o[0][s.scene||0],scenes:o[0],animations:o[1],cameras:o[2],asset:s.asset,parser:i,userData:{}};return un(r,a,s),Vi(a,s),Promise.all(i._invokeAll(function(c){return c.afterRoot&&c.afterRoot(a)})).then(function(){e(a)})}).catch(t)}_markDefs(){let e=this.json.nodes||[],t=this.json.skins||[],i=this.json.meshes||[];for(let s=0,r=t.length;s<r;s++){let o=t[s].joints;for(let a=0,c=o.length;a<c;a++)e[o[a]].isBone=!0}for(let s=0,r=e.length;s<r;s++){let o=e[s];o.mesh!==void 0&&(this._addNodeRef(this.meshCache,o.mesh),o.skin!==void 0&&(i[o.mesh].isSkinnedMesh=!0)),o.camera!==void 0&&this._addNodeRef(this.cameraCache,o.camera)}}_addNodeRef(e,t){t!==void 0&&(e.refs[t]===void 0&&(e.refs[t]=e.uses[t]=0),e.refs[t]++)}_getNodeRef(e,t,i){if(e.refs[t]<=1)return i;let s=i.clone(),r=(o,a)=>{let c=this.associations.get(o);c!=null&&this.associations.set(a,c);for(let[l,h]of o.children.entries())r(h,a.children[l])};return r(i,s),s.name+="_instance_"+e.uses[t]++,s}_invokeOne(e){let t=Object.values(this.plugins);t.push(this);for(let i=0;i<t.length;i++){let s=e(t[i]);if(s)return s}return null}_invokeAll(e){let t=Object.values(this.plugins);t.unshift(this);let i=[];for(let s=0;s<t.length;s++){let r=e(t[s]);r&&i.push(r)}return i}getDependency(e,t){let i=e+":"+t,s=this.cache.get(i);if(!s){switch(e){case"scene":s=this.loadScene(t);break;case"node":s=this._invokeOne(function(r){return r.loadNode&&r.loadNode(t)});break;case"mesh":s=this._invokeOne(function(r){return r.loadMesh&&r.loadMesh(t)});break;case"accessor":s=this.loadAccessor(t);break;case"bufferView":s=this._invokeOne(function(r){return r.loadBufferView&&r.loadBufferView(t)});break;case"buffer":s=this.loadBuffer(t);break;case"material":s=this._invokeOne(function(r){return r.loadMaterial&&r.loadMaterial(t)});break;case"texture":s=this._invokeOne(function(r){return r.loadTexture&&r.loadTexture(t)});break;case"skin":s=this.loadSkin(t);break;case"animation":s=this._invokeOne(function(r){return r.loadAnimation&&r.loadAnimation(t)});break;case"camera":s=this.loadCamera(t);break;default:if(s=this._invokeOne(function(r){return r!=this&&r.getDependency&&r.getDependency(e,t)}),!s)throw new Error("Unknown type: "+e);break}this.cache.add(i,s)}return s}getDependencies(e){let t=this.cache.get(e);if(!t){let i=this,s=this.json[e+(e==="mesh"?"es":"s")]||[];t=Promise.all(s.map(function(r,o){return i.getDependency(e,o)})),this.cache.add(e,t)}return t}loadBuffer(e){let t=this.json.buffers[e],i=this.fileLoader;if(t.type&&t.type!=="arraybuffer")throw new Error("THREE.GLTFLoader: "+t.type+" buffer type is not supported.");if(t.uri===void 0&&e===0)return Promise.resolve(this.extensions[$e.KHR_BINARY_GLTF].body);let s=this.options;return new Promise(function(r,o){i.load(zi.resolveURL(t.uri,s.path),r,void 0,function(){o(new Error('THREE.GLTFLoader: Failed to load buffer "'+t.uri+'".'))})})}loadBufferView(e){let t=this.json.bufferViews[e];return this.getDependency("buffer",t.buffer).then(function(i){let s=t.byteLength||0,r=t.byteOffset||0;return i.slice(r,r+s)})}loadAccessor(e){let t=this,i=this.json,s=this.json.accessors[e];if(s.bufferView===void 0&&s.sparse===void 0){let o=Ia[s.type],a=Zn[s.componentType],c=s.normalized===!0,l=new a(s.count*o);return Promise.resolve(new ft(l,o,c))}let r=[];return s.bufferView!==void 0?r.push(this.getDependency("bufferView",s.bufferView)):r.push(null),s.sparse!==void 0&&(r.push(this.getDependency("bufferView",s.sparse.indices.bufferView)),r.push(this.getDependency("bufferView",s.sparse.values.bufferView))),Promise.all(r).then(function(o){let a=o[0],c=Ia[s.type],l=Zn[s.componentType],h=l.BYTES_PER_ELEMENT,u=h*c,d=s.byteOffset||0,f=s.bufferView!==void 0?i.bufferViews[s.bufferView].byteStride:void 0,g=s.normalized===!0,y,m;if(f&&f!==u){let p=Math.floor(d/f),S="InterleavedBuffer:"+s.bufferView+":"+s.componentType+":"+p+":"+s.count,v=t.cache.get(S);v||(y=new l(a,p*f,s.count*f/h),v=new ys(y,f/h),t.cache.add(S,v)),m=new xs(v,c,d%f/h,g)}else a===null?y=new l(s.count*c):y=new l(a,d,s.count*c),m=new ft(y,c,g);if(s.sparse!==void 0){let p=Ia.SCALAR,S=Zn[s.sparse.indices.componentType],v=s.sparse.indices.byteOffset||0,w=s.sparse.values.byteOffset||0,C=new S(o[1],v,s.sparse.count*p),T=new l(o[2],w,s.sparse.count*c);a!==null&&(m=new ft(m.array.slice(),m.itemSize,m.normalized));for(let R=0,W=C.length;R<W;R++){let _=C[R];if(m.setX(_,T[R*c]),c>=2&&m.setY(_,T[R*c+1]),c>=3&&m.setZ(_,T[R*c+2]),c>=4&&m.setW(_,T[R*c+3]),c>=5)throw new Error("THREE.GLTFLoader: Unsupported itemSize in sparse BufferAttribute.")}}return m})}loadTexture(e){let t=this.json,i=this.options,r=t.textures[e].source,o=t.images[r],a=this.textureLoader;if(o.uri){let c=i.manager.getHandler(o.uri);c!==null&&(a=c)}return this.loadTextureImage(e,r,a)}loadTextureImage(e,t,i){let s=this,r=this.json,o=r.textures[e],a=r.images[t],c=(a.uri||a.bufferView)+":"+o.sampler;if(this.textureCache[c])return this.textureCache[c];let l=this.loadImageSource(t,i).then(function(h){h.flipY=!1,h.name=o.name||a.name||"",h.name===""&&typeof a.uri=="string"&&a.uri.startsWith("data:image/")===!1&&(h.name=a.uri);let d=(r.samplers||{})[o.sampler]||{};return h.magFilter=Ah[d.magFilter]||Lt,h.minFilter=Ah[d.minFilter]||Ni,h.wrapS=Rh[d.wrapS]||sn,h.wrapT=Rh[d.wrapT]||sn,s.associations.set(h,{textures:e}),h}).catch(function(){return null});return this.textureCache[c]=l,l}loadImageSource(e,t){let i=this,s=this.json,r=this.options;if(this.sourceCache[e]!==void 0)return this.sourceCache[e].then(u=>u.clone());let o=s.images[e],a=self.URL||self.webkitURL,c=o.uri||"",l=!1;if(o.bufferView!==void 0)c=i.getDependency("bufferView",o.bufferView).then(function(u){l=!0;let d=new Blob([u],{type:o.mimeType});return c=a.createObjectURL(d),c});else if(o.uri===void 0)throw new Error("THREE.GLTFLoader: Image "+e+" is missing URI and bufferView");let h=Promise.resolve(c).then(function(u){return new Promise(function(d,f){let g=d;t.isImageBitmapLoader===!0&&(g=function(y){let m=new Rt(y);m.needsUpdate=!0,d(m)}),t.load(zi.resolveURL(u,r.path),g,void 0,f)})}).then(function(u){return l===!0&&a.revokeObjectURL(c),u.userData.mimeType=o.mimeType||ky(o.uri),u}).catch(function(u){throw console.error("THREE.GLTFLoader: Couldn't load texture",c),u});return this.sourceCache[e]=h,h}assignTexture(e,t,i,s){let r=this;return this.getDependency("texture",i.index).then(function(o){if(!o)return null;if(i.texCoord!==void 0&&i.texCoord>0&&(o=o.clone(),o.channel=i.texCoord),r.extensions[$e.KHR_TEXTURE_TRANSFORM]){let a=i.extensions!==void 0?i.extensions[$e.KHR_TEXTURE_TRANSFORM]:void 0;if(a){let c=r.associations.get(o);o=r.extensions[$e.KHR_TEXTURE_TRANSFORM].extendTexture(o,a),r.associations.set(o,c)}}return s!==void 0&&(o.colorSpace=s),e[t]=o,o})}assignFinalMaterial(e){let t=e.geometry,i=e.material,s=t.attributes.tangent===void 0,r=t.attributes.color!==void 0,o=t.attributes.normal===void 0;if(e.isPoints){let a="PointsMaterial:"+i.uuid,c=this.cache.get(a);c||(c=new _s,Bt.prototype.copy.call(c,i),c.color.copy(i.color),c.map=i.map,c.sizeAttenuation=!1,this.cache.add(a,c)),i=c}else if(e.isLine){let a="LineBasicMaterial:"+i.uuid,c=this.cache.get(a);c||(c=new an,Bt.prototype.copy.call(c,i),c.color.copy(i.color),c.map=i.map,this.cache.add(a,c)),i=c}if(s||r||o){let a="ClonedMaterial:"+i.uuid+":";s&&(a+="derivative-tangents:"),r&&(a+="vertex-colors:"),o&&(a+="flat-shading:");let c=this.cache.get(a);c||(c=i.clone(),r&&(c.vertexColors=!0),o&&(c.flatShading=!0),s&&(c.normalScale&&(c.normalScale.y*=-1),c.clearcoatNormalScale&&(c.clearcoatNormalScale.y*=-1)),this.cache.add(a,c),this.associations.set(c,this.associations.get(i))),i=c}e.material=i}getMaterialType(){return _i}loadMaterial(e){let t=this,i=this.json,s=this.extensions,r=i.materials[e],o,a={},c=r.extensions||{},l=[];if(c[$e.KHR_MATERIALS_UNLIT]){let u=s[$e.KHR_MATERIALS_UNLIT];o=u.getMaterialType(),l.push(u.extendParams(a,r,t))}else{let u=r.pbrMetallicRoughness||{};if(a.color=new me(1,1,1),a.opacity=1,Array.isArray(u.baseColorFactor)){let d=u.baseColorFactor;a.color.setRGB(d[0],d[1],d[2],mt),a.opacity=d[3]}u.baseColorTexture!==void 0&&l.push(t.assignTexture(a,"map",u.baseColorTexture,st)),a.metalness=u.metallicFactor!==void 0?u.metallicFactor:1,a.roughness=u.roughnessFactor!==void 0?u.roughnessFactor:1,u.metallicRoughnessTexture!==void 0&&(l.push(t.assignTexture(a,"metalnessMap",u.metallicRoughnessTexture)),l.push(t.assignTexture(a,"roughnessMap",u.metallicRoughnessTexture))),o=this._invokeOne(function(d){return d.getMaterialType&&d.getMaterialType(e)}),l.push(Promise.all(this._invokeAll(function(d){return d.extendMaterialParams&&d.extendMaterialParams(e,a)})))}r.doubleSided===!0&&(a.side=Jt);let h=r.alphaMode||ka.OPAQUE;if(h===ka.BLEND?(a.transparent=!0,a.depthWrite=!1):(a.transparent=!1,h===ka.MASK&&(a.alphaTest=r.alphaCutoff!==void 0?r.alphaCutoff:.5)),r.normalTexture!==void 0&&o!==oi&&(l.push(t.assignTexture(a,"normalMap",r.normalTexture)),a.normalScale=new Ee(1,1),r.normalTexture.scale!==void 0)){let u=r.normalTexture.scale;a.normalScale.set(u,u)}if(r.occlusionTexture!==void 0&&o!==oi&&(l.push(t.assignTexture(a,"aoMap",r.occlusionTexture)),r.occlusionTexture.strength!==void 0&&(a.aoMapIntensity=r.occlusionTexture.strength)),r.emissiveFactor!==void 0&&o!==oi){let u=r.emissiveFactor;a.emissive=new me().setRGB(u[0],u[1],u[2],mt)}return r.emissiveTexture!==void 0&&o!==oi&&l.push(t.assignTexture(a,"emissiveMap",r.emissiveTexture,st)),Promise.all(l).then(function(){let u=new o(a);return r.name&&(u.name=r.name),Vi(u,r),t.associations.set(u,{materials:e}),r.extensions&&un(s,u,r),u})}createUniqueName(e){let t=Je.sanitizeNodeName(e||"");return t in this.nodeNamesUsed?t+"_"+ ++this.nodeNamesUsed[t]:(this.nodeNamesUsed[t]=0,t)}loadGeometries(e){let t=this,i=this.extensions,s=this.primitiveCache;function r(a){return i[$e.KHR_DRACO_MESH_COMPRESSION].decodePrimitive(a,t).then(function(c){return Ch(c,a,t)})}let o=[];for(let a=0,c=e.length;a<c;a++){let l=e[a],h=Iy(l),u=s[h];if(u)o.push(u.promise);else{let d;l.extensions&&l.extensions[$e.KHR_DRACO_MESH_COMPRESSION]?d=r(l):d=Ch(new Mt,l,t),s[h]={primitive:l,promise:d},o.push(d)}}return Promise.all(o)}loadMesh(e){let t=this,i=this.json,s=this.extensions,r=i.meshes[e],o=r.primitives,a=[];for(let c=0,l=o.length;c<l;c++){let h=o[c].material===void 0?Cy(this.cache):this.getDependency("material",o[c].material);a.push(h)}return a.push(t.loadGeometries(o)),Promise.all(a).then(function(c){let l=c.slice(0,c.length-1),h=c[c.length-1],u=[];for(let f=0,g=h.length;f<g;f++){let y=h[f],m=o[f],p,S=l[f];if(m.mode===$t.TRIANGLES||m.mode===$t.TRIANGLE_STRIP||m.mode===$t.TRIANGLE_FAN||m.mode===void 0)p=r.isSkinnedMesh===!0?new Tr(y,S):new _t(y,S),p.isSkinnedMesh===!0&&p.normalizeSkinWeights(),m.mode===$t.TRIANGLE_STRIP?p.geometry=La(p.geometry,Vr):m.mode===$t.TRIANGLE_FAN&&(p.geometry=La(p.geometry,Rs));else if(m.mode===$t.LINES)p=new qn(y,S);else if(m.mode===$t.LINE_STRIP)p=new Xn(y,S);else if(m.mode===$t.LINE_LOOP)p=new Rr(y,S);else if(m.mode===$t.POINTS)p=new Cr(y,S);else throw new Error("THREE.GLTFLoader: Primitive mode unsupported: "+m.mode);Object.keys(p.geometry.morphAttributes).length>0&&Ly(p,r),p.name=t.createUniqueName(r.name||"mesh_"+e),Vi(p,r),m.extensions&&un(s,p,m),t.assignFinalMaterial(p),u.push(p)}for(let f=0,g=u.length;f<g;f++)t.associations.set(u[f],{meshes:e,primitives:f});if(u.length===1)return r.extensions&&un(s,u[0],r),u[0];let d=new si;r.extensions&&un(s,d,r),t.associations.set(d,{meshes:e});for(let f=0,g=u.length;f<g;f++)d.add(u[f]);return d})}loadCamera(e){let t,i=this.json.cameras[e],s=i[i.type];if(!s){console.warn("THREE.GLTFLoader: Missing camera parameters.");return}return i.type==="perspective"?t=new dt(Wr.radToDeg(s.yfov),s.aspectRatio||1,s.znear||1,s.zfar||2e6):i.type==="orthographic"&&(t=new Gn(-s.xmag,s.xmag,s.ymag,-s.ymag,s.znear,s.zfar)),i.name&&(t.name=this.createUniqueName(i.name)),Vi(t,i),Promise.resolve(t)}loadSkin(e){let t=this.json.skins[e],i=[];for(let s=0,r=t.joints.length;s<r;s++)i.push(this._loadNodeShallow(t.joints[s]));return t.inverseBindMatrices!==void 0?i.push(this.getDependency("accessor",t.inverseBindMatrices)):i.push(null),Promise.all(i).then(function(s){let r=s.pop(),o=s,a=[],c=[];for(let l=0,h=o.length;l<h;l++){let u=o[l];if(u){a.push(u);let d=new Ge;r!==null&&d.fromArray(r.array,l*16),c.push(d)}else console.warn('THREE.GLTFLoader: Joint "%s" could not be found.',t.joints[l])}return new Er(a,c)})}loadAnimation(e){let t=this.json,i=this,s=t.animations[e],r=s.name?s.name:"animation_"+e,o=[],a=[],c=[],l=[],h=[];for(let u=0,d=s.channels.length;u<d;u++){let f=s.channels[u],g=s.samplers[f.sampler],y=f.target,m=y.node,p=s.parameters!==void 0?s.parameters[g.input]:g.input,S=s.parameters!==void 0?s.parameters[g.output]:g.output;y.node!==void 0&&(o.push(this.getDependency("node",m)),a.push(this.getDependency("accessor",p)),c.push(this.getDependency("accessor",S)),l.push(g),h.push(y))}return Promise.all([Promise.all(o),Promise.all(a),Promise.all(c),Promise.all(l),Promise.all(h)]).then(function(u){let d=u[0],f=u[1],g=u[2],y=u[3],m=u[4],p=[];for(let S=0,v=d.length;S<v;S++){let w=d[S],C=f[S],T=g[S],R=y[S],W=m[S];if(w===void 0)continue;w.updateMatrix&&w.updateMatrix();let _=i._createAnimationTracks(w,C,T,R,W);if(_)for(let E=0;E<_.length;E++)p.push(_[E])}return new $n(r,void 0,p)})}createNodeMesh(e){let t=this.json,i=this,s=t.nodes[e];return s.mesh===void 0?null:i.getDependency("mesh",s.mesh).then(function(r){let o=i._getNodeRef(i.meshCache,s.mesh,r);return s.weights!==void 0&&o.traverse(function(a){if(a.isMesh)for(let c=0,l=s.weights.length;c<l;c++)a.morphTargetInfluences[c]=s.weights[c]}),o})}loadNode(e){let t=this.json,i=this,s=t.nodes[e],r=i._loadNodeShallow(e),o=[],a=s.children||[];for(let l=0,h=a.length;l<h;l++)o.push(i.getDependency("node",a[l]));let c=s.skin===void 0?Promise.resolve(null):i.getDependency("skin",s.skin);return Promise.all([r,Promise.all(o),c]).then(function(l){let h=l[0],u=l[1],d=l[2];d!==null&&h.traverse(function(f){f.isSkinnedMesh&&f.bind(d,Ny)});for(let f=0,g=u.length;f<g;f++)h.add(u[f]);return h})}_loadNodeShallow(e){let t=this.json,i=this.extensions,s=this;if(this.nodeCache[e]!==void 0)return this.nodeCache[e];let r=t.nodes[e],o=r.name?s.createUniqueName(r.name):"",a=[],c=s._invokeOne(function(l){return l.createNodeMesh&&l.createNodeMesh(e)});return c&&a.push(c),r.camera!==void 0&&a.push(s.getDependency("camera",r.camera).then(function(l){return s._getNodeRef(s.cameraCache,r.camera,l)})),s._invokeAll(function(l){return l.createNodeAttachment&&l.createNodeAttachment(e)}).forEach(function(l){a.push(l)}),this.nodeCache[e]=Promise.all(a).then(function(l){let h;if(r.isBone===!0?h=new vs:l.length>1?h=new si:l.length===1?h=l[0]:h=new at,h!==l[0])for(let u=0,d=l.length;u<d;u++)h.add(l[u]);if(r.name&&(h.userData.name=r.name,h.name=o),Vi(h,r),r.extensions&&un(i,h,r),r.matrix!==void 0){let u=new Ge;u.fromArray(r.matrix),h.applyMatrix4(u)}else r.translation!==void 0&&h.position.fromArray(r.translation),r.rotation!==void 0&&h.quaternion.fromArray(r.rotation),r.scale!==void 0&&h.scale.fromArray(r.scale);return s.associations.has(h)||s.associations.set(h,{}),s.associations.get(h).nodes=e,h}),this.nodeCache[e]}loadScene(e){let t=this.extensions,i=this.json.scenes[e],s=this,r=new si;i.name&&(r.name=s.createUniqueName(i.name)),Vi(r,i),i.extensions&&un(t,r,i);let o=i.nodes||[],a=[];for(let c=0,l=o.length;c<l;c++)a.push(s.getDependency("node",o[c]));return Promise.all(a).then(function(c){for(let h=0,u=c.length;h<u;h++)r.add(c[h]);let l=h=>{let u=new Map;for(let[d,f]of s.associations)(d instanceof Bt||d instanceof Rt)&&u.set(d,f);return h.traverse(d=>{let f=s.associations.get(d);f!=null&&u.set(d,f)}),u};return s.associations=l(r),r})}_createAnimationTracks(e,t,i,s,r){let o=[],a=e.name?e.name:e.uuid,c=[];Hi[r.path]===Hi.weights?e.traverse(function(d){d.morphTargetInfluences&&c.push(d.name?d.name:d.uuid)}):c.push(a);let l;switch(Hi[r.path]){case Hi.weights:l=bi;break;case Hi.rotation:l=ai;break;case Hi.position:case Hi.scale:l=Si;break;default:i.itemSize===1?l=bi:l=Si;break}let h=s.interpolation!==void 0?Ry[s.interpolation]:rn,u=this._getArrayFromAccessor(i);for(let d=0,f=c.length;d<f;d++){let g=new l(c[d]+"."+Hi[r.path],t.array,u,h);s.interpolation==="CUBICSPLINE"&&this._createCubicSplineTrackInterpolant(g),o.push(g)}return o}_getArrayFromAccessor(e){let t=e.array;if(e.normalized){let i=sc(t.constructor),s=new Float32Array(t.length);for(let r=0,o=t.length;r<o;r++)s[r]=t[r]*i;t=s}return t}_createCubicSplineTrackInterpolant(e){e.createInterpolant=function(i){let s=this instanceof ai?ic:Kr;return new s(this.times,this.values,this.getValueSize()/3,i)},e.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline=!0}};function Dy(n,e,t){let i=e.attributes,s=new Wt;if(i.POSITION!==void 0){let a=t.json.accessors[i.POSITION],c=a.min,l=a.max;if(c!==void 0&&l!==void 0){if(s.set(new L(c[0],c[1],c[2]),new L(l[0],l[1],l[2])),a.normalized){let h=sc(Zn[a.componentType]);s.min.multiplyScalar(h),s.max.multiplyScalar(h)}}else{console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.");return}}else return;let r=e.targets;if(r!==void 0){let a=new L,c=new L;for(let l=0,h=r.length;l<h;l++){let u=r[l];if(u.POSITION!==void 0){let d=t.json.accessors[u.POSITION],f=d.min,g=d.max;if(f!==void 0&&g!==void 0){if(c.setX(Math.max(Math.abs(f[0]),Math.abs(g[0]))),c.setY(Math.max(Math.abs(f[1]),Math.abs(g[1]))),c.setZ(Math.max(Math.abs(f[2]),Math.abs(g[2]))),d.normalized){let y=sc(Zn[d.componentType]);c.multiplyScalar(y)}a.max(c)}else console.warn("THREE.GLTFLoader: Missing min/max properties for accessor POSITION.")}}s.expandByVector(a)}n.boundingBox=s;let o=new Ft;s.getCenter(o.center),o.radius=s.min.distanceTo(s.max)/2,n.boundingSphere=o}function Ch(n,e,t){let i=e.attributes,s=[];function r(o,a){return t.getDependency("accessor",o).then(function(c){n.setAttribute(a,c)})}for(let o in i){let a=nc[o]||o.toLowerCase();a in n.attributes||s.push(r(i[o],a))}if(e.indices!==void 0&&!n.index){let o=t.getDependency("accessor",e.indices).then(function(a){n.setIndex(a)});s.push(o)}return je.workingColorSpace!==mt&&"COLOR_0"in i&&console.warn(`THREE.GLTFLoader: Converting vertex colors from "srgb-linear" to "${je.workingColorSpace}" not supported.`),Vi(n,e),Dy(n,e,t),Promise.all(s).then(function(){return e.targets!==void 0?Py(n,e.targets,t):n})}var Oy=class{debug(){}info(){}warn(){}error(){}};var jr=new Oy;var Lh={debug:(n,e)=>jr.debug(n,e),info:(n,e)=>jr.info(n,e),warn:(n,e)=>jr.warn(n,e),error:(n,e)=>jr.error(n,e)};var Ih=class{constructor(n,e,t=100){this.pool=[],this.createFn=n,this.resetFn=e,this.maxSize=t}acquire(){return this.pool.length>0?this.pool.pop():this.createFn()}release(n){this.pool.length<this.maxSize&&(this.resetFn(n),this.pool.push(n))}clear(){this.pool.length=0}get stats(){return{pooled:this.pool.length,maxSize:this.maxSize}}},v0=new Ih(()=>({type:"",value:"",line:0,column:0}),n=>{n.type="",n.value="",n.line=0,n.column=0}),_0=new Ih(()=>[],n=>{n.length=0},50);var Zr={maxCodeLength:5e4,maxBlocks:100,suspiciousKeywords:["process","require","eval","import","constructor","prototype","__proto__","fs","child_process","exec","spawn"]};function Uy(n){let e="",t=0;for(;t<n.length;){if(n[t]==="/"&&n[t+1]==="/"){for(;t<n.length&&n[t]!==`
`;)t++;continue}if(n[t]==="/"&&n[t+1]==="*"){for(t+=2;t<n.length-1&&!(n[t]==="*"&&n[t+1]==="/");)t++;t+=2;continue}if(n[t]==='"'){for(t++;t<n.length&&n[t]!=='"';)n[t]==="\\"&&t+1<n.length&&t++,t++;t++;continue}if(n[t]==="'"){for(t++;t<n.length&&n[t]!=="'";)n[t]==="\\"&&t+1<n.length&&t++,t++;t++;continue}e+=n[t],t++}return e}var kh=class{constructor(){this.errors=[],this.warnings=[],this.tokens=[],this.position=0,this.sourceLines=[],this.keywordSet=new Set(["orb","function","connect","to","as","gate","stream","from","through","return","if","else","nexus","building","pillar","foundation","for","while","forEach","in","of","break","continue","import","export","module","use","type","interface","extends","implements","is","async","await","spawn","parallel","class","new","this","super","static","private","public","try","catch","finally","throw","const","let","var","animate","modify","pulse","move","show","hide","scale","focus","environment","composition","template","settings","chat","cube","sphere","plane","cylinder","cone","torus","pyramid","box","mesh","model","object","light","camera","npc","player","entity","trigger","zone","portal","spatial_group","interactive","traits","on_interact","on_collision","on_enter","on_exit"])}createError(n,e,t,i){let s=t?.line||0,r=t?.column||0,o="";if(this.sourceLines.length>0&&s>0){let a=[];s>1&&a.push(`${s-1} | ${this.sourceLines[s-2]||""}`),a.push(`${s} | ${this.sourceLines[s-1]||""}`),a.push(`    ${" ".repeat(r)}^`),s<this.sourceLines.length&&a.push(`${s+1} | ${this.sourceLines[s]||""}`),o=a.join(`
`)}return{line:s,column:r,message:e,code:n,context:o,suggestion:i,severity:"error"}}findSimilarKeyword(n){if(!n)return;let e=n.toLowerCase(),t,i=0;for(let s of this.keywordSet){let r=this.similarity(e,s);r>i&&r>.6&&(i=r,t=s)}return t}similarity(n,e){if(n===e)return 1;if(n.length===0||e.length===0)return 0;let t=Math.max(n.length,e.length),i=0;for(let s=0;s<Math.min(n.length,e.length);s++)n[s]===e[s]&&i++;return(n.startsWith(e)||e.startsWith(n))&&(i=Math.max(i,Math.min(n.length,e.length))),i/t}addError(n){this.errors.some(e=>e.line===n.line&&e.message===n.message)||this.errors.push(n)}synchronize(){for(;this.position<this.tokens.length;){let n=this.currentToken();if(!n)break;if(n.type==="newline"){this.advance();break}if(n.type==="keyword"&&["orb","function","gate","for","while","if","return","object","template","composition","spatial_group","logic"].includes(n.value))break;if(n.type==="punctuation"&&["}",";"].includes(n.value)){this.advance();break}this.advance()}}parse(n){if(this.errors=[],this.warnings=[],this.tokens=[],this.position=0,this.sourceLines=n.split(`
`),n.length>Zr.maxCodeLength)return{success:!1,ast:[],errors:[{line:0,column:0,message:`Code exceeds max length (${Zr.maxCodeLength})`,code:"HS009",severity:"error"}],warnings:[]};let e=Uy(n).toLowerCase();for(let t of Zr.suspiciousKeywords)if(new RegExp(`\\b${t}\\b`,"i").test(e))return Lh.warn("Suspicious keyword detected",{keyword:t}),{success:!1,ast:[],errors:[{line:0,column:0,message:`Suspicious keyword detected: ${t}`,code:"HS010",severity:"error"}],warnings:[]};try{this.tokens=this.tokenize(n);let t=this.parseProgram();return{success:this.errors.length===0,ast:t,errors:this.errors,warnings:this.warnings}}catch(t){return this.addError({line:0,column:0,message:String(t),code:"HS004",severity:"error"}),{success:!1,ast:[],errors:this.errors,warnings:this.warnings}}}tokenize(n){let e=[],t=1,i=1,s=0;for(;s<n.length;){let r=n[s];if(r===" "||r==="	"||r==="\r"){s++,i++;continue}if(r===`
`){e.push({type:"newline",value:`
`,line:t,column:i}),t++,i=1,s++;continue}if(r==="/"&&n[s+1]==="/"){for(;s<n.length&&n[s]!==`
`;)s++;continue}if(r==='"'||r==="'"){let l=r,h="",u=i;for(s++,i++;s<n.length&&n[s]!==l;)n[s]==="\\"&&s+1<n.length?(h+=n[s+1],s+=2,i+=2):(h+=n[s],s++,i++);s++,i++,e.push({type:"string",value:h,line:t,column:u});continue}if(/[0-9]/.test(r)||r==="-"&&/[0-9]/.test(n[s+1])){let l="",h=i;for(;s<n.length&&/[0-9.\-]/.test(n[s]);)l+=n[s],s++,i++;e.push({type:"number",value:l,line:t,column:h});continue}if(/[a-zA-Z_]/.test(r)){let l="",h=i;for(;s<n.length&&/[a-zA-Z0-9_]/.test(n[s]);)l+=n[s],s++,i++;let u=this.keywordSet.has(l.toLowerCase());e.push({type:u?"keyword":"identifier",value:l,line:t,column:h});continue}let o=["===","!==","==","!=",">=","<=","&&","||","??","?.","++","--","+=","-=","*=","/=","%=","=>","->"],a=!1;for(let l of o)if(n.substring(s,s+l.length)===l){e.push({type:"operator",value:l,line:t,column:i}),s+=l.length,i+=l.length,a=!0;break}if(a)continue;if(["{","}","(",")","[","]",":",",",".",";","=","<",">","+","-","*","/","%","!","&","|","?","#","@"].includes(r)){e.push({type:"punctuation",value:r,line:t,column:i}),s++,i++;continue}s++,i++}return e}parseProgram(){let n=[],e=0,t=50;for(;this.position<this.tokens.length;){if(this.errors.length>=t){this.addError({line:0,column:0,message:`Too many errors (${t}+), stopping parse`,code:"HS009",severity:"error"});break}for(;this.currentToken()?.type==="newline";)this.advance();if(this.position>=this.tokens.length)break;if(e++,e>Zr.maxBlocks){this.addError({line:0,column:0,message:"Too many blocks in program",code:"HS009",severity:"error"});break}let i=this.errors.length,s=this.parseDeclaration();s?n.push(s):this.errors.length>i&&this.synchronize()}return n}parseDeclaration(){let n=this.currentToken();if(!n)return null;if(n.type==="keyword")switch(n.value.toLowerCase()){case"orb":case"object":return this.parseOrb();case"function":return this.parseFunction();case"connect":return this.parseConnection();case"gate":case"if":return this.parseGate();case"stream":return this.parseStream();case"nexus":return this.parseNexus();case"building":case"class":return this.parseBuilding();case"for":return this.parseForLoop();case"while":return this.parseWhileLoop();case"foreach":return this.parseForEachLoop();case"import":return this.parseImport();case"export":return this.parseExport();case"ui2d":case"card":case"metric":case"button":case"row":case"col":case"text":return this.parseUIElement();case"const":case"let":case"var":return this.parseVariableDeclaration();case"animate":return this.parseAnimate();case"modify":return this.parseModify();case"scale":return this.parseScale();case"focus":return this.parseFocus();case"environment":return this.parseEnvironment();case"composition":return this.parseComposition();case"template":return this.parseTemplate();case"settings":return this.parseSettings();case"chat":return this.parseChat();default:return this.advance(),null}return this.advance(),null}parseForLoop(){if(this.expect("keyword","for"),!this.check("punctuation","("))return this.errors.push({line:0,column:0,message:"Expected ( after for"}),null;this.advance();let n="",e="",t="",i=0;for(;this.position<this.tokens.length;){let r=this.currentToken();if(!r)break;if(r.value===";"&&i===0){this.advance();break}r.value==="("&&i++,r.value===")"&&i--,n+=r.value+" ",this.advance()}for(i=0;this.position<this.tokens.length;){let r=this.currentToken();if(!r)break;if(r.value===";"&&i===0){this.advance();break}r.value==="("&&i++,r.value===")"&&i--,e+=r.value+" ",this.advance()}for(i=0;this.position<this.tokens.length;){let r=this.currentToken();if(!r)break;if(r.value===")"&&i===0){this.advance();break}r.value==="("&&i++,r.value===")"&&i--,t+=r.value+" ",this.advance()}let s=[];if(this.check("punctuation","{")){this.advance();let r=1;for(;r>0&&this.position<this.tokens.length;)this.check("punctuation","{")&&r++,this.check("punctuation","}")&&r--,this.advance()}return{type:"for-loop",init:n.trim(),condition:e.trim(),update:t.trim(),body:s,position:{x:0,y:0,z:0}}}parseWhileLoop(){this.expect("keyword","while");let n="";if(this.check("punctuation","(")){this.advance();let e=1;for(;e>0&&this.position<this.tokens.length;){let t=this.currentToken();if(!t)break;if(t.value==="("&&e++,t.value===")"&&(e--,e===0)){this.advance();break}n+=t.value+" ",this.advance()}}if(this.check("punctuation","{")){this.advance();let e=1;for(;e>0&&this.position<this.tokens.length;)this.check("punctuation","{")&&e++,this.check("punctuation","}")&&e--,this.advance()}return{type:"while-loop",condition:n.trim(),body:[],position:{x:0,y:0,z:0}}}parseForEachLoop(){this.expect("keyword","forEach");let n=this.expectIdentifier();this.expect("keyword","in");let e=this.expectIdentifier();if(this.check("punctuation","{")){this.advance();let t=1;for(;t>0&&this.position<this.tokens.length;)this.check("punctuation","{")&&t++,this.check("punctuation","}")&&t--,this.advance()}return{type:"foreach-loop",variable:n||"item",collection:e||"items",body:[],position:{x:0,y:0,z:0}}}parseImport(){this.expect("keyword","import");let n=[],e="",t;if(this.check("punctuation","{")){for(this.advance();!this.check("punctuation","}")&&this.position<this.tokens.length;){let i=this.expectIdentifier();i&&n.push(i),this.check("punctuation",",")&&this.advance()}this.expect("punctuation","}")}else t=this.expectIdentifier()||void 0;if(this.check("keyword","from")){this.advance();let i=this.currentToken();i?.type==="string"&&(e=i.value,this.advance())}return{type:"import",imports:n,defaultImport:t,modulePath:e,position:{x:0,y:0,z:0}}}parseExport(){if(this.expect("keyword","export"),this.currentToken()?.type==="keyword")return{type:"export",declaration:this.parseDeclaration()||void 0,position:{x:0,y:0,z:0}};let e=[];if(this.check("punctuation","{")){for(this.advance();!this.check("punctuation","}")&&this.position<this.tokens.length;){let t=this.expectIdentifier();t&&e.push(t),this.check("punctuation",",")&&this.advance()}this.expect("punctuation","}")}return{type:"export",exports:e,position:{x:0,y:0,z:0}}}parseVariableDeclaration(){let n=this.currentToken()?.value.toLowerCase(),e=n==="let"?"let":n==="var"?"var":"const";this.advance();let t=this.expectIdentifier();if(!t)return null;let i;this.check("punctuation",":")&&(this.advance(),i=this.expectIdentifier()||void 0);let s;if(this.check("punctuation","=")){this.advance();let r=this.currentToken();r?.type==="string"?(s=r.value,this.advance()):r?.type==="number"?(s=parseFloat(r.value),this.advance()):r?.type==="identifier"?(r.value==="true"?s=!0:r.value==="false"?s=!1:s=r.value,this.advance()):this.check("punctuation","[")?s=this.parseArray():this.check("punctuation","{")&&(s=this.parseObject())}return{type:"variable-declaration",kind:e,name:t,dataType:i,value:s,position:{x:0,y:0,z:0}}}parseOrb(){let n=this.currentToken();this.check("keyword","orb")||this.check("keyword","object")?this.advance():this.expect("keyword","orb");let e="";this.check("punctuation","#")?(this.advance(),e=this.expectName()||`orb_${Date.now()}`):e=this.expectName()||`orb_${Date.now()}`;let t={},i=[],s,r;if(this.check("punctuation","{")){for(this.advance();!this.check("punctuation","}")&&this.position<this.tokens.length&&(this.skipNewlines(),!this.check("punctuation","}"));){let o=this.currentToken();if(o?.type==="punctuation"&&o.value==="@"){let a=this.parseDirective();a&&i.push(a)}else{let a=this.parseProperty();a&&(a.key==="position"||a.key==="at"?s=this.parsePosition(a.value):a.key==="color"||a.key==="glow"||a.key==="size"?(r=r||{shape:"orb",color:"#00ffff",size:.5,glow:!0,interactive:!0},a.key==="color"&&(r.color=String(a.value)),a.key==="glow"&&(r.glow=!!a.value),a.key==="size"&&(r.size=Number(a.value))):t[a.key]=a.value)}this.skipNewlines()}this.expect("punctuation","}")}return{type:"orb",name:e,position:s||{x:0,y:0,z:0},hologram:r||{shape:"orb",color:"#00ffff",size:.5,glow:!0,interactive:!0},properties:t,directives:i,methods:[],line:n?.line||0}}parseDirective(){this.expect("punctuation","@");let n=this.expectIdentifier();if(!n)return null;if(n==="state")return{type:"state",body:this.parseObject()};if(n.startsWith("on_")){let t="";if(this.check("punctuation","{")){this.advance();let i=1;for(;i>0&&this.position<this.tokens.length;){let s=this.advance();if(s.value==="{"&&i++,s.value==="}"&&i--,i>0)t+=s.value+" ";else if(i<0)break}}else{let i=this.advance();i&&(t=i.value)}return{type:"lifecycle",hook:n,body:t}}let e={};if(this.check("punctuation","(")){for(this.advance();!this.check("punctuation",")")&&this.position<this.tokens.length;){let t=this.parseProperty();t&&(e[t.key]=t.value),this.check("punctuation",",")&&this.advance()}this.expect("punctuation",")")}else this.check("punctuation","{")&&(e=this.parseObject());return{type:"trait",name:n,config:e}}parseFunction(){this.expect("keyword","function");let n=this.expectIdentifier();if(!n)return null;let e=[],t;if(this.check("punctuation","(")){for(this.advance();!this.check("punctuation",")")&&this.position<this.tokens.length;){let s=this.expectIdentifier();if(!s)break;let r="any";this.check("punctuation",":")&&(this.advance(),r=this.expectIdentifier()||"any"),e.push({type:"parameter",name:s,dataType:r}),this.check("punctuation",",")&&this.advance()}this.expect("punctuation",")")}this.check("punctuation",":")&&(this.advance(),t=this.expectIdentifier()||void 0);let i=[];if(this.check("punctuation","{")){this.advance();let s=1;for(;s>0&&this.position<this.tokens.length;)this.check("punctuation","{")&&s++,this.check("punctuation","}")&&s--,this.advance()}return{type:"method",name:n,parameters:e,body:i,returnType:t,position:{x:0,y:0,z:0},hologram:{shape:"cube",color:"#ff6b35",size:1.5,glow:!0,interactive:!0}}}parseConnection(){this.expect("keyword","connect");let n=this.expectIdentifier();if(!n)return null;this.expect("keyword","to");let e=this.expectIdentifier();if(!e)return null;let t="any";if(this.check("keyword","as")){this.advance();let i=this.currentToken();(i?.type==="string"||i?.type==="identifier")&&(t=i.value,this.advance())}return{type:"connection",from:n,to:e,dataType:t,bidirectional:!1}}parseScale(){this.expect("keyword","scale");let n=this.expectIdentifier()||"standard",e={galactic:1e6,macro:1e3,standard:1,micro:.001,atomic:1e-6},t=[];if(this.check("punctuation","{")){for(this.advance();!this.check("punctuation","}")&&this.position<this.tokens.length;){this.skipNewlines();let i=this.parseDeclaration();i&&t.push(i),this.skipNewlines()}this.expect("punctuation","}")}return{type:"scale",magnitude:n,multiplier:e[n]||1,body:t,position:{x:0,y:0,z:0}}}parseFocus(){this.expect("keyword","focus");let n=this.expectIdentifier()||"origin",e=[];if(this.check("punctuation","{")){for(this.advance();!this.check("punctuation","}")&&this.position<this.tokens.length;){this.skipNewlines();let t=this.parseDeclaration();t&&e.push(t),this.skipNewlines()}this.expect("punctuation","}")}return{type:"focus",target:n,body:e,position:{x:0,y:0,z:0}}}parseEnvironment(){this.expect("keyword","environment");let n={};for(;this.position<this.tokens.length&&this.currentToken()?.type!=="newline"&&!this.check("punctuation","}");){let e=this.expectIdentifier();if(!e)break;n[e]=this.parseLiteral()}return{type:"environment",settings:n}}parseComposition(){this.expect("keyword","composition");let n=this.expectName()||"unnamed",e=[];if(this.check("punctuation","{")){for(this.advance();!this.check("punctuation","}")&&this.position<this.tokens.length;){this.skipNewlines();let t=this.parseDeclaration();t&&e.push(t),this.skipNewlines()}this.expect("punctuation","}")}return{type:"composition",name:n,children:e}}parseTemplate(){this.expect("keyword","template");let n=this.expectName()||"template",e=[];if(this.check("punctuation","(")){for(this.advance();!this.check("punctuation",")")&&this.position<this.tokens.length;){let i=this.expectIdentifier();i&&e.push(i),this.check("punctuation",",")&&this.advance()}this.expect("punctuation",")")}let t=[];if(this.check("punctuation","{")){for(this.advance();!this.check("punctuation","}")&&this.position<this.tokens.length;){this.skipNewlines();let i=this.parseDeclaration();i&&t.push(i),this.skipNewlines()}this.expect("punctuation","}")}return{type:"template",name:n,parameters:e,body:t}}parseGate(){this.expect("keyword","gate"),this.expectIdentifier();let n="";if(this.check("punctuation","(")){for(this.advance();!this.check("punctuation",")")&&this.position<this.tokens.length;){let e=this.currentToken();e&&(n+=e.value+" "),this.advance()}this.expect("punctuation",")")}if(this.check("punctuation","{")){this.advance();let e=1;for(;e>0&&this.position<this.tokens.length;)this.check("punctuation","{")&&e++,this.check("punctuation","}")&&e--,this.advance()}return{type:"gate",condition:n.trim(),truePath:[],falsePath:[],position:{x:0,y:0,z:0},hologram:{shape:"pyramid",color:"#4ecdc4",size:1,glow:!0,interactive:!0}}}parseStream(){this.expect("keyword","stream");let n=this.expectIdentifier();if(!n)return null;let e="unknown";if(this.check("keyword","from")&&(this.advance(),e=this.expectIdentifier()||"unknown"),this.check("punctuation","{")){this.advance();let t=1;for(;t>0&&this.position<this.tokens.length;)this.check("punctuation","{")&&t++,this.check("punctuation","}")&&t--,this.advance()}return{type:"stream",name:n,source:e,transformations:[],position:{x:0,y:0,z:0},hologram:{shape:"cylinder",color:"#45b7d1",size:2,glow:!0,interactive:!0}}}parseNexus(){if(this.expect("keyword","nexus"),!this.expectIdentifier())return null;if(this.check("punctuation","{")){this.advance();let e=1;for(;e>0&&this.position<this.tokens.length;)this.check("punctuation","{")&&e++,this.check("punctuation","}")&&e--,this.advance()}return{type:"nexus",position:{x:0,y:0,z:0},hologram:{shape:"sphere",color:"#9b59b6",size:3,glow:!0,interactive:!0}}}parseBuilding(){if(this.expect("keyword","building"),!this.expectName())return null;if(this.check("punctuation","{")){this.advance();let e=1;for(;e>0&&this.position<this.tokens.length;)this.check("punctuation","{")&&e++,this.check("punctuation","}")&&e--,this.advance()}return{type:"building",position:{x:0,y:0,z:0},hologram:{shape:"cube",color:"#e74c3c",size:4,glow:!0,interactive:!0}}}parseLiteral(){let n=this.currentToken();if(!n)return null;if(n.type==="string")return this.advance(),n.value;if(n.type==="number")return this.advance(),parseFloat(n.value);if(n.type==="identifier"){let e=n.value.toLowerCase();return this.advance(),e==="true"?!0:e==="false"?!1:e==="null"?null:n.value}return this.check("punctuation","[")?this.parseArray():this.check("punctuation","{")?this.parseObject():(this.advance(),n.value)}parseProperty(){let n=this.expectIdentifier();if(!n)return null;if(!this.check("punctuation",":"))return{key:n,value:!0};this.advance();let e=this.parseLiteral();return{key:n,value:e}}parseArray(){let n=[];for(this.expect("punctuation","[");!this.check("punctuation","]")&&this.position<this.tokens.length;){let e=this.currentToken();(e?.type==="string"||e?.type==="number"||e?.type==="identifier")&&(e.type==="number"?n.push(parseFloat(e.value)):n.push(e.value),this.advance()),this.check("punctuation",",")&&this.advance()}return this.expect("punctuation","]"),n}parseObject(){let n={};for(this.expect("punctuation","{");!this.check("punctuation","}")&&this.position<this.tokens.length&&(this.skipNewlines(),!this.check("punctuation","}"));){let e=this.parseProperty();e&&(n[e.key]=e.value),this.skipNewlines(),this.check("punctuation",",")&&this.advance()}return this.expect("punctuation","}"),n}parsePosition(n){if(Array.isArray(n))return{x:Number(n[0])||0,y:Number(n[1])||0,z:Number(n[2])||0};if(typeof n=="object"&&n!==null){let e=n;return{x:Number(e.x)||0,y:Number(e.y)||0,z:Number(e.z)||0}}return{x:0,y:0,z:0}}currentToken(){return this.tokens[this.position]}advance(){return this.tokens[this.position++]}check(n,e){let t=this.currentToken();return!(!t||t.type!==n||e!==void 0&&t.value.toLowerCase()!==e.toLowerCase())}expect(n,e){if(this.check(n,e))return this.advance(),!0;let t=this.currentToken(),i;if(n==="keyword"&&e&&t?.type==="identifier"){let s=this.findSimilarKeyword(t.value);s&&(i=`Did you mean '${s}'?`)}return this.addError(this.createError(n==="keyword"?"HS001":n==="identifier"?"HS002":"HS003",`Expected ${n}${e?` '${e}'`:""}, got ${t?.type||"EOF"} '${t?.value||""}'`,t,i)),!1}expectIdentifier(){let n=this.currentToken();return n?.type==="identifier"||n?.type==="keyword"?(this.advance(),n.value):(this.addError(this.createError("HS002",`Expected identifier, got ${n?.type||"EOF"}`,n,n?.type==="number"?"Identifiers cannot start with a number":void 0)),null)}expectName(){let n=this.currentToken();if(n?.type==="identifier"||n?.type==="keyword")return this.advance(),n.value;if(n?.type==="string"){this.advance();let e=n.value;return e.startsWith('"')&&e.endsWith('"')||e.startsWith("'")&&e.endsWith("'")?e.slice(1,-1):e}return this.addError(this.createError("HS002",`Expected name (identifier or string), got ${n?.type||"EOF"}`,n)),null}parseAnimate(){this.expect("keyword","animate");let n=this.expectIdentifier();if(!n)return null;let e={};for(;this.position<this.tokens.length;){this.skipNewlines();let t=this.currentToken();if(!t||t.type==="newline"||t.type==="keyword"&&this.keywordSet.has(t.value.toLowerCase()))break;let i=this.parseProperty();if(i)e[i.key]=i.value;else break}return{type:"expression-statement",expression:`animate("${n}", ${JSON.stringify(e)})`,position:{x:0,y:0,z:0}}}parseModify(){this.expect("keyword","modify");let n=this.expectIdentifier();if(!n)return null;let e={};if(this.check("punctuation","{")){for(this.advance();!this.check("punctuation","}")&&this.position<this.tokens.length&&(this.skipNewlines(),!this.check("punctuation","}"));){let t=this.parseProperty();t&&(e[t.key]=t.value),this.skipNewlines()}this.expect("punctuation","}")}return{type:"expression-statement",expression:`modify("${n}", ${JSON.stringify(e)})`,position:{x:0,y:0,z:0}}}parseUIElement(){let n=this.currentToken();if(!n)return null;let e=n.value;this.advance();let t=`${e}_${Date.now()}`,i=this.currentToken();if(i?.type==="punctuation"&&i.value==="#"){this.advance();let r=this.currentToken();r&&(t=r.value,this.advance())}else i?.type==="identifier"&&i.value.startsWith("#")&&(t=i.value.slice(1)||t,this.advance());let s={};if(this.check("punctuation","{")){for(this.advance();!this.check("punctuation","}")&&this.position<this.tokens.length&&(this.skipNewlines(),!this.check("punctuation","}"));){let r=this.parseProperty();r&&(s[r.key]=r.value),this.skipNewlines()}this.expect("punctuation","}")}return{type:"ui2d",name:e,properties:{id:t,...s},position:{x:0,y:0,z:0}}}parseSettings(){return this.expect("keyword","settings"),{type:"expression-statement",expression:"showSettings()",position:{x:0,y:0,z:0}}}parseChat(){return this.expect("keyword","chat"),{type:"expression-statement",expression:"openChat()",position:{x:0,y:0,z:0}}}skipNewlines(){for(;this.currentToken()?.type==="newline";)this.advance()}};var Nh=(n=>typeof qi<"u"?qi:typeof Proxy<"u"?new Proxy(n,{get:(e,t)=>(typeof qi<"u"?qi:e)[t]}):n)(function(n){if(typeof qi<"u")return qi.apply(this,arguments);throw Error('Dynamic require of "'+n+'" is not supported')});var Fy=["grabbable","throwable","pointable","hoverable","scalable","rotatable","stackable","snappable","breakable","stretchable","moldable","skeleton","body","face","expressive","hair","clothing","hands","character_voice","locomotion","poseable","morph","networked","proactive","recordable","streamable","camera","video","trackable","survey","abtest","heatmap","shareable","embeddable","qr","collaborative","particle","transition","filter","trail","spatial_audio","voice","reactive_audio","narrator","responsive","procedural","captioned","timeline","choreography"],By=["on_mount","on_unmount","on_update","on_data_update","on_grab","on_release","on_hover_enter","on_hover_exit","on_point_enter","on_point_exit","on_collision","on_trigger_enter","on_trigger_exit","on_click","on_double_click","on_controller_button","on_trigger_hold","on_trigger_release","on_grip_hold","on_grip_release","on_stretch","on_sculpt","on_pose_change","on_expression_change","on_gesture","on_speak","on_pose_save","on_morph_change","on_record_start","on_record_stop","on_record_pause","on_stream_start","on_stream_stop","on_viewer_join","on_viewer_leave","on_chat_message","on_camera_switch","on_video_end","on_video_error","on_track_event","on_survey_start","on_survey_complete","on_survey_skip","on_variant_assigned","on_conversion","on_hotspot_detected","on_share","on_share_complete","on_embed","on_scan","on_user_join","on_user_leave","on_draw_stroke","on_object_lock","on_object_unlock","on_particle_spawn","on_particle_death","on_transition_start","on_transition_complete","on_filter_change","on_audio_start","on_audio_end","on_voice_command","on_speech_start","on_speech_end","on_beat","on_frequency_peak","on_narration_start","on_narration_end","on_user_question","on_response_ready","on_emotion_change","on_generation_complete","on_timeline_start","on_timeline_complete","on_keyframe_hit","on_keyframe_add","on_beat_sync","on_move_complete"],Dh=class Jr{constructor(){this.parser=new kh}validate(e){let t=[];try{this.parser.parse(e)}catch(s){return t.push({line:s.line||1,column:s.column||1,message:s.message||"Syntax Error",severity:"error"}),t}return e.split(`
`).forEach((s,r)=>{let o=r+1,a=s.trim();if(!(!a||a.startsWith("//"))){if(a.startsWith("@")){let c=a.match(/^@(\w+)/);if(c){let l=c[1];Jr.VALID_DIRECTIVES.includes(l)||t.push({line:o,column:s.indexOf("@")+1,message:`Unknown directive '@${l}'. Allowed: ${Jr.VALID_DIRECTIVES.join(", ")}`,severity:"warning"})}}if(a.endsWith("{")){let c=a.split(" ")[0];s.match(/^[a-z]+\s+[\w#]+\s*\{$/)&&!Jr.VALID_KEYWORDS.includes(c)&&a.startsWith("trait")}}}),t}};Dh.VALID_DIRECTIVES=["trait","state","on_enter","on_exit","on_mount","on_tick","on_create","bot_config","lifecycle"];Dh.VALID_KEYWORDS=["world","scene","prefab","object","import","export"];var zy=class{constructor(n){this.pos=0,this.line=1,this.column=1,this.indentStack=[0],this.tokens=[],this.pendingDedents=0,this.source=n}tokenize(){for(;this.pos<this.source.length;){for(;this.pendingDedents>0;)this.tokens.push(this.createToken("DEDENT","")),this.pendingDedents--;let n=this.source[this.pos];if(n===" "||n==="	"){this.column===1?this.handleIndentation():this.advance();continue}if(n==="/"&&this.peek(1)==="/"){this.skipLineComment();continue}if(n==="/"&&this.peek(1)==="*"){this.skipBlockComment();continue}if(n==="#"&&this.peek(1)!=="#"&&this.peek(1)==="#"){this.skipLineComment();continue}if(n===`
`){this.tokens.push(this.createToken("NEWLINE",`
`)),this.advance(),this.line++,this.column=1;continue}if(n==="\r"){this.advance(),this.peek()===`
`&&this.advance(),this.tokens.push(this.createToken("NEWLINE",`
`)),this.line++,this.column=1;continue}if(n==="{"){this.tokens.push(this.createToken("LBRACE","{")),this.advance();continue}if(n==="}"){this.tokens.push(this.createToken("RBRACE","}")),this.advance();continue}if(n==="["){this.tokens.push(this.createToken("LBRACKET","[")),this.advance();continue}if(n==="]"){this.tokens.push(this.createToken("RBRACKET","]")),this.advance();continue}if(n==="("){this.tokens.push(this.createToken("LPAREN","(")),this.advance();continue}if(n===")"){this.tokens.push(this.createToken("RPAREN",")")),this.advance();continue}if(n===":"){this.tokens.push(this.createToken("COLON",":")),this.advance();continue}if(n===","){this.tokens.push(this.createToken("COMMA",",")),this.advance();continue}if(n==="@"){this.tokens.push(this.createToken("AT","@")),this.advance();continue}if(n==="#"){this.tokens.push(this.createToken("HASH","#")),this.advance();continue}if(n==="."){this.tokens.push(this.createToken("DOT",".")),this.advance();continue}if(n==="="){if(this.peek(1)===">"){this.tokens.push(this.createToken("ARROW","=>")),this.advance(),this.advance();continue}this.tokens.push(this.createToken("EQUALS","=")),this.advance();continue}if(n==="|"){this.tokens.push(this.createToken("PIPE","|")),this.advance();continue}if(n==='"'||n==="'"){this.tokens.push(this.readString(n));continue}if(this.isDigit(n)||n==="-"&&this.isDigit(this.peek(1))){this.tokens.push(this.readNumber());continue}if(n==="$"&&this.peek(1)==="{"){this.tokens.push(this.readExpression());continue}if(this.isIdentifierStart(n)){this.tokens.push(this.readIdentifier());continue}this.advance()}for(;this.indentStack.length>1;)this.tokens.push(this.createToken("DEDENT","")),this.indentStack.pop();return this.tokens.push(this.createToken("EOF","")),this.tokens}advance(){let n=this.source[this.pos];return this.pos++,this.column++,n}peek(n=0){let e=this.pos+n;return e<this.source.length?this.source[e]:""}createToken(n,e){return{type:n,value:e,line:this.line,column:this.column-e.length}}handleIndentation(){let n=0;for(;this.peek()===" "||this.peek()==="	";)n+=this.peek()==="	"?4:1,this.advance();if(this.peek()===`
`||this.peek()==="\r")return;let e=this.indentStack[this.indentStack.length-1];if(n>e)this.indentStack.push(n),this.tokens.push(this.createToken("INDENT",""));else if(n<e)for(;this.indentStack.length>1&&n<this.indentStack[this.indentStack.length-1];)this.indentStack.pop(),this.pendingDedents++}skipLineComment(){for(;this.peek()!==`
`&&this.pos<this.source.length;)this.advance()}skipBlockComment(){for(this.advance(),this.advance();this.pos<this.source.length;){if(this.peek()==="*"&&this.peek(1)==="/"){this.advance(),this.advance();break}this.peek()===`
`&&(this.line++,this.column=0),this.advance()}}readString(n){let e=this.line,t=this.column;this.advance();let i="";for(;this.peek()!==n&&this.pos<this.source.length;)if(this.peek()==="\\"){this.advance();let s=this.advance();switch(s){case"n":i+=`
`;break;case"t":i+="	";break;case"r":i+="\r";break;case"\\":i+="\\";break;case'"':i+='"';break;case"'":i+="'";break;default:i+=s}}else this.peek()===`
`?(this.line++,this.column=0,i+=this.advance()):i+=this.advance();return this.advance(),{type:"STRING",value:i,line:e,column:t}}readNumber(){let n=this.column,e="";for(this.peek()==="-"&&(e+=this.advance());this.isDigit(this.peek());)e+=this.advance();if(this.peek()==="."&&this.isDigit(this.peek(1)))for(e+=this.advance();this.isDigit(this.peek());)e+=this.advance();if(this.peek()==="e"||this.peek()==="E")for(e+=this.advance(),(this.peek()==="+"||this.peek()==="-")&&(e+=this.advance());this.isDigit(this.peek());)e+=this.advance();for(;this.isAlpha(this.peek())||this.peek()==="%";)e+=this.advance();return{type:"NUMBER",value:e,line:this.line,column:n}}readExpression(){let n=this.line,e=this.column;this.advance(),this.advance();let t="",i=1;for(;i>0&&this.pos<this.source.length;){if(this.peek()==="{")i++;else if(this.peek()==="}"&&(i--,i===0))break;this.peek()===`
`&&(this.line++,this.column=0),t+=this.advance()}return this.advance(),{type:"EXPRESSION",value:t.trim(),line:n,column:e}}readIdentifier(){let n=this.column,e="";for(;this.isIdentifierPart(this.peek());)e+=this.advance();return e==="true"||e==="false"?{type:"BOOLEAN",value:e,line:this.line,column:n}:e==="null"||e==="none"?{type:"NULL",value:e,line:this.line,column:n}:{type:"IDENTIFIER",value:e,line:this.line,column:n}}isDigit(n){return n>="0"&&n<="9"}isAlpha(n){return n>="a"&&n<="z"||n>="A"&&n<="Z"}isIdentifierStart(n){return this.isAlpha(n)||n==="_"}isIdentifierPart(n){return this.isIdentifierStart(n)||this.isDigit(n)||n==="-"}},Hy=class{constructor(n={}){this.tokens=[],this.pos=0,this.errors=[],this.warnings=[],this.imports=[],this.hasState=!1,this.hasVRTraits=!1,this.hasControlFlow=!1,this.compiledExpressions=new Map,this.options={enableVRTraits:!0,enableTypeScriptImports:!0,strict:!1,...n}}parse(n){this.errors=[],this.warnings=[],this.imports=[],this.hasState=!1,this.hasVRTraits=!1,this.hasControlFlow=!1,this.compiledExpressions=new Map,this.pos=0;let e=new zy(n);this.tokens=e.tokenize();let t=this.parseDocument();return{success:!0,ast:{type:"Program",body:t.directives||[],version:"1.0",root:t,imports:this.imports,hasState:this.hasState,hasVRTraits:this.hasVRTraits,hasControlFlow:this.hasControlFlow},compiledExpressions:this.compiledExpressions,requiredCompanions:this.imports.map(s=>s.path),features:{state:this.hasState,vrTraits:this.hasVRTraits,loops:this.hasControlFlow,conditionals:this.hasControlFlow,lifecycleHooks:t.directives.some(s=>s.type==="lifecycle")},warnings:this.warnings,errors:this.errors}}parseDocument(){this.skipNewlines();let n=[];for(;this.check("AT");){let t=this.parseDirective();t&&n.push(t),this.skipNewlines()}if(this.check("EOF")&&n.length>0)return{type:"fragment",id:"root",properties:{},directives:n,children:[],traits:new Map,loc:{start:{line:1,column:1},end:{line:this.current().line,column:this.current().column}}};let e=this.parseNode();return e.directives=[...n,...e.directives],e}parseNode(){let n=this.current(),e=this.expect("IDENTIFIER","Expected element type").value,t;this.check("HASH")&&(this.advance(),t=this.expect("IDENTIFIER","Expected ID after #").value);let i={},s=[],r=new Map;for(;!this.check("LBRACE")&&!this.check("NEWLINE")&&!this.check("EOF");)if(this.check("AT")){let a=this.parseDirective();a&&(a.type==="trait"?(r.set(a.name,a.config),this.hasVRTraits=!0):s.push(a))}else if(this.check("IDENTIFIER")){let a=this.advance().value;this.check("COLON")||this.check("EQUALS")?(this.advance(),i[a]=this.parseValue()):i[a]=!0}else break;let o=[];if(this.check("LBRACE")){for(this.advance(),this.skipNewlines();!this.check("RBRACE")&&!this.check("EOF");){if(this.check("AT")){let a=this.parseDirective();a&&(a.type==="trait"?(r.set(a.name,a.config),this.hasVRTraits=!0):s.push(a))}else if(this.check("IDENTIFIER")){let a=this.pos,c=this.advance().value;this.check("COLON")||this.check("EQUALS")?(this.advance(),i[c]=this.parseValue()):(this.pos=a,o.push(this.parseNode()))}else{if(this.skipNewlines(),this.check("RBRACE")||this.check("EOF"))break;this.advance()}this.skipNewlines()}this.expect("RBRACE","Expected }")}return{type:e,id:t,properties:i,directives:s,children:o,traits:r,loc:{start:{line:n.line,column:n.column},end:{line:this.current().line,column:this.current().column}}}}parseDirective(){this.expect("AT","Expected @");let n=this.expect("IDENTIFIER","Expected directive name").value;if(Fy.includes(n)){if(!this.options.enableVRTraits)return this.warn(`VR trait @${n} is disabled`),null;let e=this.parseTraitConfig();return{type:"trait",name:n,config:e}}if(By.includes(n)){let e=[];if(this.check("LPAREN")){for(this.advance();!this.check("RPAREN")&&!this.check("EOF");)e.push(this.expect("IDENTIFIER","Expected parameter name").value),this.check("COMMA")&&this.advance();this.expect("RPAREN","Expected )")}let t="";return this.check("ARROW")?(this.advance(),t=this.parseInlineExpression()):this.check("LBRACE")&&(t=this.parseCodeBlock()),{type:"lifecycle",hook:n,params:e,body:t}}if(n==="state")return this.hasState=!0,{type:"state",body:this.parseStateBlock()};if(n==="for"){this.hasControlFlow=!0;let e=this.expect("IDENTIFIER","Expected variable name").value;this.expect("IDENTIFIER",'Expected "in"');let t=this.parseInlineExpression(),i=this.parseControlFlowBody();return{type:"for",variable:e,iterable:t,body:i}}if(n==="forEach"){this.hasControlFlow=!0;let e=this.expect("IDENTIFIER","Expected variable name").value;this.expect("IDENTIFIER",'Expected "in"');let t=this.parseInlineExpression(),i=this.parseControlFlowBody();return{type:"forEach",variable:e,collection:t,body:i}}if(n==="while"){this.hasControlFlow=!0;let e=this.parseInlineExpression(),t=this.parseControlFlowBody();return{type:"while",condition:e,body:t}}if(n==="if"){this.hasControlFlow=!0;let e=this.parseInlineExpression(),t=this.parseControlFlowBody(),i;if(this.skipNewlines(),this.check("AT")){let s=this.pos;this.advance(),this.check("IDENTIFIER")&&this.current().value==="else"?(this.advance(),i=this.parseControlFlowBody()):this.pos=s}return{type:"if",condition:e,body:t,else:i}}if(n==="import"){if(!this.options.enableTypeScriptImports)return this.warn("@import is disabled"),null;let e=this.expect("STRING","Expected import path").value,t=e.split("/").pop()?.replace(/\.[^.]+$/,"")||"import";return this.check("IDENTIFIER")&&this.current().value==="as"&&(this.advance(),t=this.expect("IDENTIFIER","Expected alias").value),this.imports.push({path:e,alias:t}),{type:"import",path:e,alias:t}}if(n==="external_api"){let e=this.parseTraitConfig(),t=e.url||"",i=e.method||"GET",s=e.interval||"0s",r=[];return this.check("LBRACE")&&(r=this.parseControlFlowBody()),{type:"external_api",url:t,method:i,interval:s,body:r}}if(n==="generate"){let e=this.parseTraitConfig(),t=e.prompt||"",i=e.context||"",s=e.target||"children";return{type:"generate",prompt:t,context:i,target:s}}if(n==="npc"){try{Nh("fs").appendFileSync("debug_parser.log",`ENTERED NPC BLOCK. Name length: ${n.length}
`)}catch{}let e=this.expect("STRING","Expected NPC name").value,t=this.parsePropsBlock();return{type:"npc",name:e,props:t}}if(n==="dialog"){let e=this.expect("STRING","Expected dialog name").value,{props:t,options:i}=this.parseDialogBlock();return{type:"dialog",name:e,props:t,options:i}}return this.options.strict?this.error(`Unknown directive @${n}`):this.warn(`Unknown directive @${n}`),null}parsePropsBlock(){this.skipNewlines();let n={};if(this.check("LBRACE")){for(this.advance(),this.skipNewlines();!this.check("RBRACE")&&!this.check("EOF");){let e=this.expect("IDENTIFIER","Expected property name").value;this.check("COLON")||this.check("EQUALS")?(this.advance(),n[e]=this.parseValue()):n[e]=!0,this.skipNewlines()}this.expect("RBRACE","Expected }")}return n}parseDialogBlock(){this.skipNewlines();let n={},e=[];if(this.check("LBRACE")){for(this.advance(),this.skipNewlines();!this.check("RBRACE")&&!this.check("EOF");){if(this.check("IDENTIFIER")&&this.current().value==="option"){this.advance();let t=this.expect("STRING","Expected option text").value;this.expect("ARROW","Expected ->");let i;this.check("AT")?i={type:"directive",value:this.parseDirective()}:i=this.expect("STRING","Expected target ID").value,e.push({text:t,target:i})}else{let t=this.expect("IDENTIFIER","Expected property name").value;this.check("COLON")||this.check("EQUALS")?(this.advance(),n[t]=this.parseValue()):n[t]=!0}this.skipNewlines()}this.expect("RBRACE","Expected }")}return{props:n,options:e}}parseTraitConfig(){let n={};if(this.check("LPAREN")){for(this.advance(),this.skipNewlines();!this.check("RPAREN")&&!this.check("EOF")&&(this.skipNewlines(),!(this.check("RPAREN")||this.check("EOF")));){if(!this.check("IDENTIFIER")){this.advance();continue}let e=this.expect("IDENTIFIER","Expected property name").value;this.check("COLON")||this.check("EQUALS")?(this.advance(),n[e]=this.parseValue()):n[e]=!0,this.check("COMMA")&&this.advance(),this.skipNewlines()}this.expect("RPAREN","Expected )")}return n}parseStateBlock(){let n={};if(this.check("LBRACE")){for(this.advance(),this.skipNewlines();!this.check("RBRACE")&&!this.check("EOF");){let e=this.expect("IDENTIFIER","Expected state variable name").value;this.check("COLON")||this.check("EQUALS")?(this.advance(),n[e]=this.parseValue()):n[e]=null,this.skipNewlines()}this.expect("RBRACE","Expected }")}return n}parseControlFlowBody(){let n=[];if(this.check("LBRACE")){for(this.advance(),this.skipNewlines();!this.check("RBRACE")&&!this.check("EOF");){if(this.check("AT")){let e=this.parseDirective();e&&e.type==="for"&&n.push({type:"fragment",properties:{},directives:[e],children:[],traits:new Map})}else this.check("IDENTIFIER")&&n.push(this.parseNode());this.skipNewlines()}this.expect("RBRACE","Expected }")}return n}parseCodeBlock(){let n="",e=0;if(this.check("LBRACE"))for(this.advance(),e=1;e>0&&!this.check("EOF");){let t=this.advance();t.type==="LBRACE"?(e++,n+="{"):t.type==="RBRACE"?(e--,e>0&&(n+="}")):(n+=t.value,t.type==="NEWLINE"?n+=`
`:n+=" ")}return n.trim()}parseInlineExpression(){let n="";for(;!this.check("NEWLINE")&&!this.check("LBRACE")&&!this.check("EOF");){let e=this.advance();n+=e.value+" "}return n.trim()}parseValue(){let n=this.current();if(n.type==="STRING")return this.advance(),n.value;if(n.type==="NUMBER"){this.advance();let e=n.value.match(/^(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)(.*)?$/i);if(e){let t=parseFloat(e[1]),i=e[2];return i?`${t}${i}`:t}return parseFloat(n.value)}if(n.type==="BOOLEAN")return this.advance(),n.value==="true";if(n.type==="NULL")return this.advance(),null;if(n.type==="EXPRESSION"){this.advance();let e=`expr_${this.compiledExpressions.size}`;return this.compiledExpressions.set(e,n.value),{__expr:e,__raw:n.value}}return n.type==="LBRACKET"?this.parseArray():n.type==="LBRACE"?this.parseObject():n.type==="IDENTIFIER"?(this.advance(),{__ref:n.value}):null}parseArray(){let n=[];for(this.expect("LBRACKET","Expected ["),this.skipNewlines();!this.check("RBRACKET")&&!this.check("EOF");){let e=this.pos;if(this.skipNewlines(),this.check("RBRACKET")||this.check("EOF"))break;let t=this.parseValue();t!==null?n.push(t):this.pos===e&&this.advance(),this.check("COMMA")&&this.advance(),this.skipNewlines()}return this.expect("RBRACKET","Expected ]"),n}parseObject(){let n={};for(this.expect("LBRACE","Expected {"),this.skipNewlines();!this.check("RBRACE")&&!this.check("EOF")&&(this.skipNewlines(),!(this.check("RBRACE")||this.check("EOF")));){if(!this.check("IDENTIFIER")){this.advance();continue}let e=this.expect("IDENTIFIER","Expected property name").value;this.check("COLON")||this.check("EQUALS")?(this.advance(),n[e]=this.parseValue()):n[e]=!0,this.check("COMMA")&&this.advance(),this.skipNewlines()}return this.expect("RBRACE","Expected }"),n}current(){return this.tokens[this.pos]||{type:"EOF",value:"",line:0,column:0}}check(n){return this.current().type===n}advance(){let n=this.current();return this.pos<this.tokens.length&&this.pos++,n}expect(n,e){return this.check(n)?this.advance():(this.error(`${e}. Got ${this.current().type} "${this.current().value}"`),{type:n,value:"",line:this.current().line,column:this.current().column})}skipNewlines(){for(;this.check("NEWLINE")||this.check("INDENT")||this.check("DEDENT");)this.advance()}error(n){let e=this.current();this.errors.push({message:n,line:e.line,column:e.column})}warn(n){let e=this.current();this.warnings.push({message:n,line:e.line,column:e.column})}};function Vy(n){return new Hy(n)}function Oh(n,e){return Vy(e).parse(n)}var Gy={composition:"COMPOSITION",environment:"ENVIRONMENT",state:"STATE",template:"TEMPLATE",object:"OBJECT",spatial_group:"SPATIAL_GROUP",logic:"LOGIC",action:"ACTION",async:"ASYNC",await:"AWAIT",if:"IF",else:"ELSE",for:"FOR",in:"IN",return:"RETURN",emit:"EMIT",animate:"ANIMATE",using:"USING",import:"IMPORT",from:"FROM",particle_system:"PARTICLE_SYSTEM",true:"BOOLEAN",false:"BOOLEAN",null:"NULL"},Wy=class{constructor(n){this.pos=0,this.line=1,this.column=1,this.tokens=[],this.source=n}tokenize(){for(;this.pos<this.source.length;){let n=this.current();if(n===" "||n==="	"){this.advance();continue}if(n==="/"&&this.peek(1)==="/"){this.skipLineComment();continue}if(n==="/"&&this.peek(1)==="*"){this.skipBlockComment();continue}if(n===`
`){this.addToken("NEWLINE",`
`),this.advance(),this.line++,this.column=1;continue}if(n==="\r"){this.advance(),this.current()===`
`&&this.advance(),this.addToken("NEWLINE",`
`),this.line++,this.column=1;continue}if(!this.trySymbol()){if(n==='"'||n==="'"){this.readString(n);continue}if(this.isDigit(n)||n==="-"&&this.isDigit(this.peek(1))){this.readNumber();continue}if(this.isIdentifierStart(n)){this.readIdentifier();continue}this.advance()}}return this.addToken("EOF",""),this.tokens}trySymbol(){let n=this.current(),e=this.peek(1);if(n==="="&&e==="=")return this.addToken("EQUALS_EQUALS","=="),this.advance(),this.advance(),!0;if(n==="!"&&e==="=")return this.addToken("BANG_EQUALS","!="),this.advance(),this.advance(),!0;if(n==="<"&&e==="=")return this.addToken("LESS_EQUALS","<="),this.advance(),this.advance(),!0;if(n===">"&&e==="=")return this.addToken("GREATER_EQUALS",">="),this.advance(),this.advance(),!0;if(n==="+"&&e==="=")return this.addToken("PLUS_EQUALS","+="),this.advance(),this.advance(),!0;if(n==="-"&&e==="=")return this.addToken("MINUS_EQUALS","-="),this.advance(),this.advance(),!0;if(n==="*"&&e==="=")return this.addToken("STAR_EQUALS","*="),this.advance(),this.advance(),!0;if(n==="/"&&e==="=")return this.addToken("SLASH_EQUALS","/="),this.advance(),this.advance(),!0;if(n==="="&&e===">")return this.addToken("ARROW","=>"),this.advance(),this.advance(),!0;if(n==="&"&&e==="&")return this.addToken("AND","&&"),this.advance(),this.advance(),!0;if(n==="|"&&e==="|")return this.addToken("OR","||"),this.advance(),this.advance(),!0;let t={"{":"LBRACE","}":"RBRACE","[":"LBRACKET","]":"RBRACKET","(":"LPAREN",")":"RPAREN",":":"COLON",",":"COMMA",".":"DOT","=":"EQUALS","+":"PLUS","-":"MINUS","*":"STAR","/":"SLASH","<":"LESS",">":"GREATER","!":"BANG"};return t[n]?(this.addToken(t[n],n),this.advance(),!0):!1}current(){return this.pos<this.source.length?this.source[this.pos]:""}peek(n){let e=this.pos+n;return e<this.source.length?this.source[e]:""}advance(){let n=this.source[this.pos];return this.pos++,this.column++,n}addToken(n,e){this.tokens.push({type:n,value:e,line:this.line,column:this.column-e.length})}skipLineComment(){for(;this.current()!==`
`&&this.pos<this.source.length;)this.advance()}skipBlockComment(){for(this.advance(),this.advance();this.pos<this.source.length;){if(this.current()==="*"&&this.peek(1)==="/"){this.advance(),this.advance();return}this.current()===`
`&&(this.line++,this.column=0),this.advance()}}readString(n){let e=this.line,t=this.column;this.advance();let i="";for(;this.current()!==n&&this.pos<this.source.length;)if(this.current()==="\\"){this.advance();let s=this.current();switch(s){case"n":i+=`
`;break;case"t":i+="	";break;case"r":i+="\r";break;case"\\":i+="\\";break;case'"':i+='"';break;case"'":i+="'";break;default:i+=s}this.advance()}else i+=this.advance();this.advance(),this.tokens.push({type:"STRING",value:i,line:e,column:t})}readNumber(){let n=this.column,e="";for(this.current()==="-"&&(e+=this.advance());this.isDigit(this.current());)e+=this.advance();if(this.current()==="."&&this.isDigit(this.peek(1)))for(e+=this.advance();this.isDigit(this.current());)e+=this.advance();this.tokens.push({type:"NUMBER",value:e,line:this.line,column:n})}readIdentifier(){let n=this.column,e="";for(;this.isIdentifierPart(this.current());)e+=this.advance();let t=Gy[e.toLowerCase()]||"IDENTIFIER";this.tokens.push({type:t,value:t==="BOOLEAN"?e.toLowerCase():e,line:this.line,column:n})}isDigit(n){return n>="0"&&n<="9"}isIdentifierStart(n){return n>="a"&&n<="z"||n>="A"&&n<="Z"||n==="_"}isIdentifierPart(n){return this.isIdentifierStart(n)||this.isDigit(n)}},Xy=class{constructor(n={}){this.tokens=[],this.pos=0,this.errors=[],this.warnings=[],this.options={locations:!0,tolerant:!0,strict:!1,...n}}parse(n){this.errors=[],this.warnings=[],this.pos=0;try{let e=new Wy(n);this.tokens=e.tokenize(),this.skipNewlines();let t=this.parseComposition();return{success:this.errors.length===0,ast:t,errors:this.errors,warnings:this.warnings}}catch(e){return this.errors.push({message:e instanceof Error?e.message:String(e),loc:this.currentLocation()}),{success:!1,errors:this.errors,warnings:this.warnings}}}parseComposition(){this.expect("COMPOSITION");let n=this.expectString();this.expect("LBRACE"),this.skipNewlines();let e={type:"Composition",name:n,templates:[],objects:[],spatialGroups:[],imports:[]};for(;!this.check("RBRACE")&&!this.isAtEnd()&&(this.skipNewlines(),!this.check("RBRACE"));)this.check("IMPORT")?e.imports.push(this.parseImport()):this.check("ENVIRONMENT")?e.environment=this.parseEnvironment():this.check("STATE")?e.state=this.parseState():this.check("TEMPLATE")?e.templates.push(this.parseTemplate()):this.check("OBJECT")?e.objects.push(this.parseObject()):this.check("SPATIAL_GROUP")?e.spatialGroups.push(this.parseSpatialGroup()):this.check("LOGIC")?e.logic=this.parseLogic():(this.error(`Unexpected token: ${this.current().type}`),this.advance()),this.skipNewlines();return this.expect("RBRACE"),e}parseImport(){this.expect("IMPORT"),this.expect("LBRACE"),this.skipNewlines();let n=[];for(;!this.check("RBRACE")&&!this.isAtEnd();){let t=this.expectIdentifier(),i;if(this.match("IDENTIFIER")&&this.previous().value==="as"&&(i=this.expectIdentifier()),n.push({type:"ImportSpecifier",imported:t,local:i}),!this.match("COMMA"))break;this.skipNewlines()}this.skipNewlines(),this.expect("RBRACE"),this.expect("FROM");let e=this.expectString();return{type:"Import",specifiers:n,source:e}}parseEnvironment(){this.expect("ENVIRONMENT"),this.expect("LBRACE"),this.skipNewlines();let n=[];for(;!this.check("RBRACE")&&!this.isAtEnd()&&(this.skipNewlines(),!this.check("RBRACE"));){if(this.check("PARTICLE_SYSTEM")){let e=this.parseParticleSystem();n.push({type:"EnvironmentProperty",key:e.name,value:e})}else{let e=this.expectIdentifier();this.expect("COLON");let t=this.parseValue();n.push({type:"EnvironmentProperty",key:e,value:t})}this.skipNewlines()}return this.expect("RBRACE"),{type:"Environment",properties:n}}parseParticleSystem(){this.expect("PARTICLE_SYSTEM");let n=this.expectString();this.expect("LBRACE"),this.skipNewlines();let e={};for(;!this.check("RBRACE")&&!this.isAtEnd()&&(this.skipNewlines(),!this.check("RBRACE"));){let t=this.expectIdentifier();this.expect("COLON"),e[t]=this.parseValue(),this.skipNewlines()}return this.expect("RBRACE"),{type:"ParticleSystem",name:n,properties:e}}parseState(){this.expect("STATE"),this.expect("LBRACE"),this.skipNewlines();let n=[];for(;!this.check("RBRACE")&&!this.isAtEnd()&&(this.skipNewlines(),!this.check("RBRACE"));){let e=this.expectIdentifier();this.expect("COLON");let t=this.parseValue();n.push({type:"StateProperty",key:e,value:t}),this.skipNewlines()}return this.expect("RBRACE"),{type:"State",properties:n}}parseTemplate(){this.expect("TEMPLATE");let n=this.expectString();this.expect("LBRACE"),this.skipNewlines();let e={type:"Template",name:n,properties:[],actions:[]};for(;!this.check("RBRACE")&&!this.isAtEnd()&&(this.skipNewlines(),!this.check("RBRACE"));){if(this.check("STATE"))e.state=this.parseState();else if(this.check("ACTION")||this.check("ASYNC"))e.actions.push(this.parseAction());else{let t=this.expectIdentifier();this.expect("COLON");let i=this.parseValue();e.properties.push({type:"TemplateProperty",key:t,value:i})}this.skipNewlines()}return this.expect("RBRACE"),e}parseObject(){this.expect("OBJECT");let n=this.expectString(),e;this.check("USING")&&(this.advance(),e=this.expectString()),this.expect("LBRACE"),this.skipNewlines();let t=[],i=[];for(;!this.check("RBRACE")&&!this.isAtEnd()&&(this.skipNewlines(),!this.check("RBRACE"));){if(this.check("OBJECT"))i.push(this.parseObject());else if(this.check("IDENTIFIER")){let s=this.expectIdentifier();this.expect("COLON");let r=this.parseValue();t.push({type:"ObjectProperty",key:s,value:r})}else this.error(`Unexpected token in object: ${this.current().type}`),this.advance();this.skipNewlines()}return this.expect("RBRACE"),{type:"Object",name:n,template:e,properties:t,children:i.length>0?i:void 0}}parseSpatialGroup(){this.expect("SPATIAL_GROUP");let n=this.expectString();this.expect("LBRACE"),this.skipNewlines();let e=[],t=[],i=[];for(;!this.check("RBRACE")&&!this.isAtEnd()&&(this.skipNewlines(),!this.check("RBRACE"));){if(this.check("OBJECT"))t.push(this.parseObject());else if(this.check("SPATIAL_GROUP"))i.push(this.parseSpatialGroup());else{let s=this.expectIdentifier();this.expect("COLON");let r=this.parseValue();e.push({type:"GroupProperty",key:s,value:r})}this.skipNewlines()}return this.expect("RBRACE"),{type:"SpatialGroup",name:n,properties:e,objects:t,groups:i.length>0?i:void 0}}parseLogic(){this.expect("LOGIC"),this.expect("LBRACE"),this.skipNewlines();let n=[],e=[];for(;!this.check("RBRACE")&&!this.isAtEnd()&&(this.skipNewlines(),!this.check("RBRACE"));)this.check("ACTION")||this.check("ASYNC")?e.push(this.parseAction()):this.check("IDENTIFIER")&&this.current().value.startsWith("on_")?n.push(this.parseEventHandler()):(this.error(`Unexpected token in logic block: ${this.current().type}`),this.advance()),this.skipNewlines();return this.expect("RBRACE"),{type:"Logic",handlers:n,actions:e}}parseEventHandler(){let n=this.expectIdentifier(),e=this.parseParameterList();this.expect("LBRACE"),this.skipNewlines();let t=this.parseStatementBlock();return this.expect("RBRACE"),{type:"EventHandler",event:n,parameters:e,body:t}}parseAction(){let n=this.match("ASYNC");this.expect("ACTION");let e=this.expectIdentifier(),t=this.parseParameterList();this.expect("LBRACE"),this.skipNewlines();let i=this.parseStatementBlock();return this.expect("RBRACE"),{type:"Action",name:e,parameters:t,body:i,async:n}}parseParameterList(){if(!this.check("LPAREN"))return[];this.expect("LPAREN"),this.skipNewlines();let n=[];for(;!this.check("RPAREN")&&!this.isAtEnd();){let e=this.expectIdentifier(),t;if(this.match("COLON")&&(t=this.expectIdentifier()),n.push({type:"Parameter",name:e,paramType:t}),!this.match("COMMA"))break;this.skipNewlines()}return this.expect("RPAREN"),n}parseStatementBlock(){let n=[];for(;!this.check("RBRACE")&&!this.isAtEnd()&&(this.skipNewlines(),!this.check("RBRACE"));){let e=this.parseStatement();e&&n.push(e),this.skipNewlines()}return n}parseStatement(){return this.check("IF")?this.parseIfStatement():this.check("FOR")?this.parseForStatement():this.check("AWAIT")?this.parseAwaitStatement():this.check("RETURN")?this.parseReturnStatement():this.check("EMIT")?this.parseEmitStatement():this.check("ANIMATE")?this.parseAnimateStatement():this.parseAssignmentOrExpression()}parseIfStatement(){this.expect("IF");let n=this.parseExpression();this.expect("LBRACE"),this.skipNewlines();let e=this.parseStatementBlock();this.expect("RBRACE");let t;return this.skipNewlines(),this.match("ELSE")&&(this.expect("LBRACE"),this.skipNewlines(),t=this.parseStatementBlock(),this.expect("RBRACE")),{type:"IfStatement",condition:n,consequent:e,alternate:t}}parseForStatement(){this.expect("FOR");let n=this.expectIdentifier();this.expect("IN");let e=this.parseExpression();this.expect("LBRACE"),this.skipNewlines();let t=this.parseStatementBlock();return this.expect("RBRACE"),{type:"ForStatement",variable:n,iterable:e,body:t}}parseAwaitStatement(){return this.expect("AWAIT"),{type:"AwaitStatement",expression:this.parseExpression()}}parseReturnStatement(){this.expect("RETURN");let n;return!this.check("NEWLINE")&&!this.check("RBRACE")&&(n=this.parseExpression()),{type:"ReturnStatement",value:n}}parseEmitStatement(){this.expect("EMIT");let n=this.expectString(),e;return(this.check("LBRACE")||this.check("IDENTIFIER"))&&(e=this.parseExpression()),{type:"EmitStatement",event:n,data:e}}parseAnimateStatement(){this.expect("ANIMATE");let n=this.expectString();this.expect("LBRACE"),this.skipNewlines();let e={};for(;!this.check("RBRACE")&&!this.isAtEnd()&&(this.skipNewlines(),!this.check("RBRACE"));){let t=this.expectIdentifier();this.expect("COLON"),e[t]=this.parseValue(),this.skipNewlines()}return this.expect("RBRACE"),{type:"AnimateStatement",target:n,properties:e}}parseAssignmentOrExpression(){let n=this.parseExpression();if(this.check("EQUALS")||this.check("PLUS_EQUALS")||this.check("MINUS_EQUALS")||this.check("STAR_EQUALS")||this.check("SLASH_EQUALS")){let e=this.advance().value,t=this.parseExpression();return{type:"Assignment",target:this.expressionToString(n),operator:e,value:t}}return{type:"ExpressionStatement",expression:n}}expressionToString(n){return n.type==="Identifier"?n.name:n.type==="MemberExpression"?`${this.expressionToString(n.object)}.${n.property}`:""}parseExpression(){return this.parseOr()}parseOr(){let n=this.parseAnd();for(;this.match("OR");){let e=this.parseAnd();n={type:"BinaryExpression",operator:"||",left:n,right:e}}return n}parseAnd(){let n=this.parseEquality();for(;this.match("AND");){let e=this.parseEquality();n={type:"BinaryExpression",operator:"&&",left:n,right:e}}return n}parseEquality(){let n=this.parseComparison();for(;this.check("EQUALS_EQUALS")||this.check("BANG_EQUALS");){let e=this.advance().value,t=this.parseComparison();n={type:"BinaryExpression",operator:e,left:n,right:t}}return n}parseComparison(){let n=this.parseAdditive();for(;this.check("LESS")||this.check("GREATER")||this.check("LESS_EQUALS")||this.check("GREATER_EQUALS");){let e=this.advance().value,t=this.parseAdditive();n={type:"BinaryExpression",operator:e,left:n,right:t}}return n}parseAdditive(){let n=this.parseMultiplicative();for(;this.check("PLUS")||this.check("MINUS");){let e=this.advance().value,t=this.parseMultiplicative();n={type:"BinaryExpression",operator:e,left:n,right:t}}return n}parseMultiplicative(){let n=this.parseUnary();for(;this.check("STAR")||this.check("SLASH");){let e=this.advance().value,t=this.parseUnary();n={type:"BinaryExpression",operator:e,left:n,right:t}}return n}parseUnary(){if(this.check("BANG")||this.check("MINUS")){let n=this.advance().value,e=this.parseUnary();return{type:"UnaryExpression",operator:n,argument:e}}return this.parsePostfix()}parsePostfix(){let n=this.parsePrimary();for(;;)if(this.match("DOT")){let e=this.expectIdentifier();n={type:"MemberExpression",object:n,property:e,computed:!1}}else if(this.match("LBRACKET")){let e=this.parseExpression();this.expect("RBRACKET");let t=this.expressionToString(e);n={type:"MemberExpression",object:n,property:t,computed:!0}}else if(this.match("LPAREN")){let e=this.parseArgumentList();n={type:"CallExpression",callee:n,arguments:e}}else break;return n}parseArgumentList(){this.skipNewlines();let n=[];if(this.check("RPAREN"))return this.expect("RPAREN"),n;for(n.push(this.parseExpression());this.match("COMMA");)this.skipNewlines(),n.push(this.parseExpression());return this.skipNewlines(),this.expect("RPAREN"),n}parsePrimary(){if(this.match("NUMBER"))return{type:"Literal",value:parseFloat(this.previous().value)};if(this.match("STRING"))return{type:"Literal",value:this.previous().value};if(this.match("BOOLEAN"))return{type:"Literal",value:this.previous().value==="true"};if(this.match("NULL"))return{type:"Literal",value:null};if(this.match("IDENTIFIER")||this.isKeywordAsIdentifier())return{type:"Identifier",name:this.previous().value};if(this.match("LBRACKET"))return this.parseArrayExpression();if(this.match("LBRACE"))return this.parseObjectExpression();if(this.match("LPAREN")){let n=this.parseExpression();return this.expect("RPAREN"),n}return this.error(`Unexpected token: ${this.current().type}`),this.advance(),{type:"Literal",value:null}}isKeywordAsIdentifier(){return["STATE","OBJECT","TEMPLATE","ENVIRONMENT","LOGIC","ACTION","EMIT","ANIMATE","RETURN"].includes(this.current().type)?(this.advance(),!0):!1}parseArrayExpression(){this.skipNewlines();let n=[];for(;!this.check("RBRACKET")&&!this.isAtEnd()&&(this.skipNewlines(),n.push(this.parseExpression()),this.skipNewlines(),!!this.match("COMMA"));)this.skipNewlines();return this.skipNewlines(),this.expect("RBRACKET"),{type:"ArrayExpression",elements:n}}parseObjectExpression(){this.skipNewlines();let n=[];for(;!this.check("RBRACE")&&!this.isAtEnd();){this.skipNewlines();let e=this.expectIdentifier();this.expect("COLON");let t=this.parseExpression();if(n.push({key:e,value:t}),this.skipNewlines(),!this.match("COMMA"))break;this.skipNewlines()}return this.skipNewlines(),this.expect("RBRACE"),{type:"ObjectExpression",properties:n}}parseValue(){return this.match("MINUS")?this.match("NUMBER")?-parseFloat(this.previous().value):(this.error("Expected number after minus sign"),0):this.match("NUMBER")?parseFloat(this.previous().value):this.match("STRING")?this.previous().value:this.match("BOOLEAN")?this.previous().value==="true":this.match("NULL")?null:this.match("IDENTIFIER")?this.previous().value:this.match("LBRACKET")?this.parseArrayValue():this.match("LBRACE")?this.parseObjectValue():(this.error(`Expected value, got ${this.current().type}`),null)}parseArrayValue(){this.skipNewlines();let n=[];for(;!this.check("RBRACKET")&&!this.isAtEnd()&&(this.skipNewlines(),n.push(this.parseValue()),this.skipNewlines(),!!this.match("COMMA"));)this.skipNewlines();return this.skipNewlines(),this.expect("RBRACKET"),n}parseObjectValue(){this.skipNewlines();let n={};for(;!this.check("RBRACE")&&!this.isAtEnd();){this.skipNewlines();let e=this.expectIdentifier();if(this.expect("COLON"),n[e]=this.parseValue(),this.skipNewlines(),!this.match("COMMA"))break;this.skipNewlines()}return this.skipNewlines(),this.expect("RBRACE"),n}current(){return this.tokens[this.pos]||{type:"EOF",value:"",line:0,column:0}}previous(){return this.tokens[this.pos-1]||this.current()}isAtEnd(){return this.current().type==="EOF"}check(n){return this.current().type===n}match(n){return this.check(n)?(this.advance(),!0):!1}advance(){return this.isAtEnd()||this.pos++,this.previous()}expect(n){return this.check(n)?this.advance():(this.error(`Expected ${n}, got ${this.current().type}`),this.current())}expectString(){return this.check("STRING")?this.advance().value:(this.error(`Expected string, got ${this.current().type}`),"")}expectIdentifier(){return this.check("IDENTIFIER")?this.advance().value:(this.error(`Expected identifier, got ${this.current().type}`),"")}skipNewlines(){for(;this.match("NEWLINE"););}currentLocation(){let n=this.current();return{line:n.line,column:n.column}}error(n){if(this.errors.push({message:n,loc:this.currentLocation()}),!this.options.tolerant)throw new Error(`Parse error at line ${this.currentLocation().line}: ${n}`)}};function Uh(n,e){return new Xy(e).parse(n)}var qy={name:"grabbable",defaultConfig:{snap_to_hand:!0,two_handed:!1,haptic_on_grab:.5,grab_points:[],preserve_rotation:!1,distance_grab:!1,max_grab_distance:3},onAttach(n,e,t){let i={isGrabbed:!1,grabbingHand:null,grabOffset:[0,0,0],grabRotationOffset:[0,0,0],previousHandPositions:[],previousHandTimes:[]};n.__grabState=i},onDetach(n){delete n.__grabState},onUpdate(n,e,t,i){let s=n.__grabState;if(!s?.isGrabbed||!s.grabbingHand)return;let r=s.grabbingHand,o=e.snap_to_hand?r.position:[r.position[0]+s.grabOffset[0],r.position[1]+s.grabOffset[1],r.position[2]+s.grabOffset[2]];n.properties.position=o,s.previousHandPositions.push([...r.position]),s.previousHandTimes.push(Date.now()),s.previousHandPositions.length>10&&(s.previousHandPositions.shift(),s.previousHandTimes.shift()),e.preserve_rotation||(n.properties.rotation=r.rotation)},onEvent(n,e,t,i){let s=n.__grabState;if(i.type==="grab_start"){if(!e.distance_grab){let o=i.hand.position,a=n.properties.position||[0,0,0],c=Math.sqrt(Math.pow(o[0]-a[0],2)+Math.pow(o[1]-a[1],2)+Math.pow(o[2]-a[2],2)),l=(e.max_grab_distance||3)*t.getScaleMultiplier();if(c>l)return}s.isGrabbed=!0,s.grabbingHand=i.hand;let r=n.properties.position||[0,0,0];s.grabOffset=[r[0]-i.hand.position[0],r[1]-i.hand.position[1],r[2]-i.hand.position[2]],e.haptic_on_grab&&t.haptics.pulse(i.hand.id,e.haptic_on_grab),t.physics.setKinematic(n,!0),t.emit("grab",{node:n,hand:i.hand})}if(i.type==="grab_end"){if(s.isGrabbed=!1,s.grabbingHand=null,t.physics.setKinematic(n,!1),s.previousHandPositions.length>=2){let r=s.previousHandPositions.length,o=(s.previousHandTimes[r-1]-s.previousHandTimes[0])/1e3;if(o>0){let a=[(s.previousHandPositions[r-1][0]-s.previousHandPositions[0][0])/o,(s.previousHandPositions[r-1][1]-s.previousHandPositions[0][1])/o,(s.previousHandPositions[r-1][2]-s.previousHandPositions[0][2])/o];if(n.traits.has("throwable")){let l=(n.traits.get("throwable").velocity_multiplier||1)*t.getScaleMultiplier();t.physics.applyVelocity(n,[a[0]*l,a[1]*l,a[2]*l])}}}s.previousHandPositions=[],s.previousHandTimes=[],t.emit("release",{node:n,velocity:i.velocity})}}},$y={name:"throwable",defaultConfig:{velocity_multiplier:1,gravity:!0,max_velocity:50,spin:!0,bounce:!1,bounce_factor:.5},onAttach(n,e,t){},onEvent(n,e,t,i){if(i.type==="collision"&&e.bounce){let s=i.data,r=e.bounce_factor||.5,o=s.relativeVelocity,a=s.normal,c=o[0]*a[0]+o[1]*a[1]+o[2]*a[2],l=[(o[0]-2*c*a[0])*r,(o[1]-2*c*a[1])*r,(o[2]-2*c*a[2])*r];t.physics.applyVelocity(n,l)}}},Yy={name:"pointable",defaultConfig:{highlight_on_point:!0,highlight_color:"#00ff00",cursor_style:"pointer"},onAttach(n,e,t){let i={isPointed:!1,pointingHand:null};n.__pointState=i},onDetach(n){delete n.__pointState},onEvent(n,e,t,i){let s=n.__pointState;i.type==="point_enter"&&(s.isPointed=!0,s.pointingHand=i.hand,e.highlight_on_point&&(n.properties.__originalEmissive=n.properties.emissive,n.properties.emissive=e.highlight_color),t.emit("point_enter",{node:n,hand:i.hand})),i.type==="point_exit"&&(s.isPointed=!1,s.pointingHand=null,e.highlight_on_point&&(n.properties.emissive=n.properties.__originalEmissive||null,delete n.properties.__originalEmissive),t.emit("point_exit",{node:n})),i.type==="click"&&t.emit("click",{node:n,hand:i.hand})}},Ky={name:"hoverable",defaultConfig:{highlight_color:"#ffffff",scale_on_hover:1.1,show_tooltip:!1,tooltip_offset:[0,.2,0],glow:!1,glow_intensity:.5},onAttach(n,e,t){let i={isHovered:!1,hoveringHand:null,originalScale:typeof n.properties.scale=="number"?n.properties.scale:1,originalColor:null};n.__hoverState=i},onDetach(n){delete n.__hoverState},onEvent(n,e,t,i){let s=n.__hoverState;if(i.type==="hover_enter"){if(s.isHovered=!0,s.hoveringHand=i.hand,e.scale_on_hover&&e.scale_on_hover!==1&&(s.originalScale=typeof n.properties.scale=="number"?n.properties.scale:1,n.properties.scale=s.originalScale*e.scale_on_hover),e.glow&&(s.originalColor=n.properties.emissive||null,n.properties.emissive=e.highlight_color,n.properties.emissiveIntensity=e.glow_intensity),e.show_tooltip){let r=typeof e.show_tooltip=="string"?e.show_tooltip:n.properties.tooltip||n.id||n.type;t.emit("show_tooltip",{node:n,text:r,offset:e.tooltip_offset})}t.emit("hover_enter",{node:n,hand:i.hand})}i.type==="hover_exit"&&(s.isHovered=!1,s.hoveringHand=null,e.scale_on_hover&&e.scale_on_hover!==1&&(n.properties.scale=s.originalScale),e.glow&&(n.properties.emissive=s.originalColor,delete n.properties.emissiveIntensity),e.show_tooltip&&t.emit("hide_tooltip",{node:n}),t.emit("hover_exit",{node:n}))}},jy={name:"scalable",defaultConfig:{min_scale:.1,max_scale:10,uniform:!0,pivot:[0,0,0]},onAttach(n,e,t){let i={isScaling:!1,initialDistance:0,initialScale:1};n.__scaleState=i},onDetach(n){delete n.__scaleState},onUpdate(n,e,t,i){let s=n.__scaleState;if(!s?.isScaling)return;let{hands:r}=t.vr;if(!r.left||!r.right)return;let a=Math.sqrt(Math.pow(r.right.position[0]-r.left.position[0],2)+Math.pow(r.right.position[1]-r.left.position[1],2)+Math.pow(r.right.position[2]-r.left.position[2],2))/s.initialDistance,c=s.initialScale*a;c=Math.max(e.min_scale||.1,Math.min(e.max_scale||10,c));let l=t.getScaleMultiplier(),h=c*l;h>1e6&&l<1e6?(t.setScaleContext("galactic"),c/=1e6):h>1e3&&l<1e3?(t.setScaleContext("macro"),c/=1e3):h<.001&&l>.001?(t.setScaleContext("micro"),c*=1e3):h<1e-6&&l>1e-6&&(t.setScaleContext("atomic"),c*=1e6),n.properties.scale=c,t.emit("scale_update",{node:n,scale:c})},onEvent(n,e,t,i){let s=n.__scaleState;if(i.type==="scale_start"){s.isScaling=!0,s.initialScale=typeof n.properties.scale=="number"?n.properties.scale:1;let{left:r,right:o}=i.hands;s.initialDistance=Math.sqrt(Math.pow(o.position[0]-r.position[0],2)+Math.pow(o.position[1]-r.position[1],2)+Math.pow(o.position[2]-r.position[2],2)),t.emit("scale_start",{node:n})}i.type==="scale_end"&&(s.isScaling=!1,t.emit("scale_end",{node:n,finalScale:n.properties.scale}))}},Zy={name:"rotatable",defaultConfig:{axis:"all",snap_angles:[],speed:1},onAttach(n,e,t){let i={isRotating:!1,initialHandRotation:[0,0,0],initialObjectRotation:[0,0,0]};n.__rotateState=i},onDetach(n){delete n.__rotateState},onUpdate(n,e,t,i){let s=n.__rotateState;if(!s?.isRotating)return;let r=t.vr.getDominantHand();if(!r)return;let o=[(r.rotation[0]-s.initialHandRotation[0])*(e.speed||1),(r.rotation[1]-s.initialHandRotation[1])*(e.speed||1),(r.rotation[2]-s.initialHandRotation[2])*(e.speed||1)],a;switch(e.axis){case"x":a=[s.initialObjectRotation[0]+o[0],s.initialObjectRotation[1],s.initialObjectRotation[2]];break;case"y":a=[s.initialObjectRotation[0],s.initialObjectRotation[1]+o[1],s.initialObjectRotation[2]];break;case"z":a=[s.initialObjectRotation[0],s.initialObjectRotation[1],s.initialObjectRotation[2]+o[2]];break;default:a=[s.initialObjectRotation[0]+o[0],s.initialObjectRotation[1]+o[1],s.initialObjectRotation[2]+o[2]]}e.snap_angles&&e.snap_angles.length>0&&(a=a.map(c=>{let l=e.snap_angles[0],h=Math.abs(c-l);for(let u of e.snap_angles){let d=Math.abs(c-u);d<h&&(h=d,l=u)}return h<10?l:c})),n.properties.rotation=a,t.emit("rotate_update",{node:n,rotation:a})},onEvent(n,e,t,i){let s=n.__rotateState;i.type==="rotate_start"&&(s.isRotating=!0,s.initialHandRotation=[...i.hand.rotation],s.initialObjectRotation=n.properties.rotation||[0,0,0],t.emit("rotate_start",{node:n})),i.type==="rotate_end"&&(s.isRotating=!1,t.emit("rotate_end",{node:n,finalRotation:n.properties.rotation}))}},Jy={name:"stackable",defaultConfig:{stack_axis:"y",stack_offset:0,max_stack:10,snap_distance:.5},onAttach(n,e,t){let i={stackedItems:[],stackParent:null};n.__stackState=i},onDetach(n){let e=n.__stackState;if(e.stackParent){let t=e.stackParent.__stackState,i=t.stackedItems.indexOf(n);i>-1&&t.stackedItems.splice(i,1)}e.stackedItems=[],delete n.__stackState},onEvent(n,e,t,i){let s=n.__stackState;if(i.type==="collision"||i.type==="trigger_enter"){let r=i.type==="collision"?i.data.target:i.other;if(!r.traits.has("stackable"))return;let o=r.__stackState;if(!o||s.stackedItems.length>=(e.max_stack||10))return;let a=n.properties.position||[0,0,0],c=r.properties.position||[0,0,0],l=e.stack_axis==="x"?0:e.stack_axis==="z"?2:1,h=[0,1,2].filter(d=>d!==l),u=!0;for(let d of h)if(Math.abs(a[d]-c[d])>(e.snap_distance||.5)){u=!1;break}if(u&&c[l]>a[l]){s.stackedItems.push(r),o.stackParent=n;let d=e.stack_offset||0,f=[...a];f[l]=a[l]+d,r.properties.position=f,t.emit("stack",{parent:n,child:r})}}}},Qy={name:"snappable",defaultConfig:{snap_points:[],snap_distance:.3,snap_rotation:!1,magnetic:!1},onUpdate(n,e,t,i){if(!e.snap_points||e.snap_points.length===0||!e.magnetic)return;let s=n.properties.position||[0,0,0],r=null,o=(e.snap_distance||.3)*t.getScaleMultiplier();for(let a of e.snap_points){let c=Math.sqrt(Math.pow(s[0]-a[0],2)+Math.pow(s[1]-a[1],2)+Math.pow(s[2]-a[2],2));c<o&&(o=c,r=a)}r&&(n.properties.position=[s[0]+(r[0]-s[0])*.1,s[1]+(r[1]-s[1])*.1,s[2]+(r[2]-s[2])*.1])},onEvent(n,e,t,i){if(i.type!=="grab_end"||!e.snap_points||e.snap_points.length===0)return;let s=n.properties.position||[0,0,0],r=null,o=(e.snap_distance||.3)*t.getScaleMultiplier();for(let a of e.snap_points){let c=Math.sqrt(Math.pow(s[0]-a[0],2)+Math.pow(s[1]-a[1],2)+Math.pow(s[2]-a[2],2));c<o&&(o=c,r=a)}r&&(n.properties.position=r,t.emit("snap",{node:n,point:r}),t.haptics.pulse(i.hand.id,.3))}},e0={name:"breakable",defaultConfig:{break_velocity:5,fragments:8,fragment_mesh:void 0,sound_on_break:void 0,respawn:!1,respawn_delay:"5s"},onEvent(n,e,t,i){if(i.type!=="collision")return;let s=i.data,r=Math.sqrt(Math.pow(s.relativeVelocity[0],2)+Math.pow(s.relativeVelocity[1],2)+Math.pow(s.relativeVelocity[2],2));if(r<(e.break_velocity||5))return;e.sound_on_break&&t.audio.playSound(e.sound_on_break,{position:s.point,spatial:!0});let o=e.fragments||8;for(let a=0;a<o;a++){let c=a/o*Math.PI*2,l=[Math.cos(c)*2,Math.random()*3,Math.sin(c)*2];t.emit("spawn_fragment",{position:s.point,velocity:l,mesh:e.fragment_mesh})}if(t.emit("break",{node:n,impactVelocity:r,collision:s}),e.respawn){let a=i0(e.respawn_delay||"5s");setTimeout(()=>{t.emit("respawn",{node:n})},a)}n.properties.__destroyed=!0}},t0={name:"proactive",defaultConfig:{intelligence_tier:"basic",observation_range:5,learning_rate:.1,auto_suggest:!0,context_window:10},onAttach(n,e,t){console.log(`[Proactive] Neural bridge attached to ${n.id||n.type}`),t.emit("proactive_init",{nodeId:n.id,tier:e.intelligence_tier})},onUpdate(n,e,t,i){if(!e||!e.auto_suggest)return;let s=t.vr,r=n.properties.position;if(!r||!s.headset.position)return;let o=r[0]-s.headset.position[0],a=r[1]-s.headset.position[1],c=r[2]-s.headset.position[2];Math.sqrt(o*o+a*a+c*c)<(e.observation_range||5)&&Math.random()<.01*(e.learning_rate||.1)*i&&t.emit("proactive_suggestion",{nodeId:n.id,type:"interaction_hint",suggestion:"Object is observing your proximity. Suggesting engagement."})}};function i0(n){let e=n.match(/^(\d+(?:\.\d+)?)(ms|s|m)$/);if(!e)return 0;let t=parseFloat(e[1]);switch(e[2]){case"ms":return t;case"s":return t*1e3;case"m":return t*60*1e3;default:return t}}var n0=class{constructor(){this.handlers=new Map,this.register(qy),this.register($y),this.register(Yy),this.register(Ky),this.register(jy),this.register(Zy),this.register(Jy),this.register(Qy),this.register(e0),this.register(t0)}register(n){this.handlers.set(n.name,n)}getHandler(n){return this.handlers.get(n)}attachTrait(n,e,t,i){let s=this.handlers.get(e);if(!s)return;let r={...s.defaultConfig,...t};n.traits.set(e,r),s.onAttach&&s.onAttach(n,r,i)}detachTrait(n,e,t){let i=this.handlers.get(e);if(!i)return;let s=n.traits.get(e);s&&i.onDetach&&i.onDetach(n,s,t),n.traits.delete(e)}updateTrait(n,e,t,i){let s=this.handlers.get(e);if(!s||!s.onUpdate)return;let r=n.traits.get(e);r&&s.onUpdate(n,r,t,i)}handleEvent(n,e,t,i){let s=this.handlers.get(e);if(!s||!s.onEvent)return;let r=n.traits.get(e);r&&s.onEvent(n,r,t,i)}updateAllTraits(n,e,t){for(let i of n.traits.keys())this.updateTrait(n,i,e,t)}handleEventForAllTraits(n,e,t){for(let i of n.traits.keys())this.handleEvent(n,i,e,t)}},R0=new n0;var oc=class{listeners=new Map;onceListeners=new Map;on(e,t){return this.listeners.has(e)||this.listeners.set(e,new Set),this.listeners.get(e).add(t),()=>this.off(e,t)}once(e,t){return this.onceListeners.has(e)||this.onceListeners.set(e,new Set),this.onceListeners.get(e).add(t),()=>{this.onceListeners.get(e)?.delete(t)}}emit(e,t){let i=this.listeners.get(e);i&&i.forEach(r=>{try{r(t)}catch(o){console.error(`[HoloScript] Error in event handler for "${e}":`,o)}});let s=this.onceListeners.get(e);s&&(s.forEach(r=>{try{r(t)}catch(o){console.error(`[HoloScript] Error in once handler for "${e}":`,o)}}),this.onceListeners.delete(e)),typeof window<"u"&&window.dispatchEvent(new CustomEvent(`holoscript:${e}`,{detail:t}))}off(e,t){t?this.listeners.get(e)?.delete(t):(this.listeners.delete(e),this.onceListeners.delete(e))}clear(){this.listeners.clear(),this.onceListeners.clear()}listenerCount(e){let t=this.listeners.get(e)?.size??0,i=this.onceListeners.get(e)?.size??0;return t+i}hasListeners(e){return this.listenerCount(e)>0}},Gi=new oc,Fh=Gi.on.bind(Gi),D0=Gi.once.bind(Gi),kt=Gi.emit.bind(Gi),O0=Gi.off.bind(Gi);var s0={get isMobile(){return typeof navigator>"u"?!1:/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)},get isTablet(){return typeof navigator>"u"?!1:/iPad|Android/i.test(navigator.userAgent)&&!/Mobile/i.test(navigator.userAgent)},get isDesktop(){return!this.isMobile&&!this.isTablet},get isTouchDevice(){return typeof window>"u"?!1:"ontouchstart"in window||navigator.maxTouchPoints>0},get isVRCapable(){return typeof navigator>"u"?!1:"xr"in navigator},get isARCapable(){return typeof navigator>"u"?!1:"xr"in navigator},async supportsVR(){if(!this.isVRCapable)return!1;try{return await navigator.xr?.isSessionSupported?.("immersive-vr")??!1}catch{return!1}},async supportsAR(){if(!this.isARCapable)return!1;try{return await navigator.xr?.isSessionSupported?.("immersive-ar")??!1}catch{return!1}},get prefersReducedMotion(){return typeof window>"u"?!1:window.matchMedia("(prefers-reduced-motion: reduce)").matches},get prefersDarkMode(){return typeof window>"u"?!1:window.matchMedia("(prefers-color-scheme: dark)").matches},get prefersHighContrast(){return typeof window>"u"?!1:window.matchMedia("(prefers-contrast: more)").matches},get devicePixelRatio(){return typeof window>"u"?1:window.devicePixelRatio||1},get supportsWebGL2(){if(typeof document>"u")return!1;try{return!!document.createElement("canvas").getContext("webgl2")}catch{return!1}},get supportsWebGPU(){return typeof navigator>"u"?!1:"gpu"in navigator},getMaxTextureSize(){if(typeof document>"u")return 4096;try{let n=document.createElement("canvas"),e=n.getContext("webgl2")||n.getContext("webgl");return e?e.getParameter(e.MAX_TEXTURE_SIZE):4096}catch{return 4096}},get hasGamepad(){return typeof navigator>"u"?!1:(navigator.getGamepads?.()||[]).some(e=>e!==null)},get screenWidth(){return typeof window>"u"?1920:window.innerWidth},get screenHeight(){return typeof window>"u"?1080:window.innerHeight},get orientation(){return typeof window>"u"?"landscape":window.innerHeight>window.innerWidth?"portrait":"landscape"},getCapabilities(){return{isMobile:this.isMobile,isTablet:this.isTablet,isDesktop:this.isDesktop,isTouchDevice:this.isTouchDevice,isVRCapable:this.isVRCapable,isARCapable:this.isARCapable,prefersReducedMotion:this.prefersReducedMotion,prefersDarkMode:this.prefersDarkMode,prefersHighContrast:this.prefersHighContrast,devicePixelRatio:this.devicePixelRatio,maxTextureSize:this.getMaxTextureSize(),supportsWebGL2:this.supportsWebGL2,supportsWebGPU:this.supportsWebGPU,hasGamepad:this.hasGamepad,screenWidth:this.screenWidth,screenHeight:this.screenHeight,orientation:this.orientation}},onOrientationChange(n){if(typeof window>"u")return()=>{};let e=()=>n(this.orientation);return window.addEventListener("resize",e),()=>window.removeEventListener("resize",e)},onReducedMotionChange(n){if(typeof window>"u")return()=>{};let e=window.matchMedia("(prefers-reduced-motion: reduce)"),t=i=>n(i.matches);return e.addEventListener("change",t),()=>e.removeEventListener("change",t)},onDarkModeChange(n){if(typeof window>"u")return()=>{};let e=window.matchMedia("(prefers-color-scheme: dark)"),t=i=>n(i.matches);return e.addEventListener("change",t),()=>e.removeEventListener("change",t)},onGamepadChange(n){if(typeof window>"u")return()=>{};let e=()=>n(!0),t=()=>n(this.hasGamepad);return window.addEventListener("gamepadconnected",e),window.addEventListener("gamepaddisconnected",t),()=>{window.removeEventListener("gamepadconnected",e),window.removeEventListener("gamepaddisconnected",t)}}};var Bh=()=>s0.isVRCapable;function zh(n,e){let t=e==="holo"?Uh(n):Oh(n);if(!t.success)throw new Error("Parse failed: "+(t.errors?.[0]?.message||"Unknown error"));return e==="holo"&&t.ast?r0(t.ast):o0(t.ast)}function r0(n){let e=[],t={},i={};if(console.log("[HoloScript] Extracting from AST:",n),console.log("[HoloScript] AST objects:",n.objects),n.state?.properties)for(let s of n.state.properties)t[s.key]=s.value;if(n.environment?.properties)for(let s of n.environment.properties)i[s.key]=s.value;for(let s of n.objects||[]){console.log("[HoloScript] Processing object:",s.name,s);let r=ac(s.properties?.find(C=>C.key==="position")?.value),o=cc(s.properties?.find(C=>C.key==="scale")?.value),a=s.properties?.find(C=>C.key==="color")?.value,c=s.properties?.find(C=>C.key==="geometry")?.value,l=s.properties?.find(C=>C.key==="type")?.value,h=s.properties?.find(C=>C.key==="model")?.value,u=s.properties?.find(C=>C.key==="animation")?.value,d=s.properties?.find(C=>C.key==="animationLoop")?.value,f=s.properties?.find(C=>C.key==="skeleton")?.value,g=s.properties?.find(C=>C.key==="patrol")?.value,y=s.properties?.find(C=>C.key==="patrolSpeed")?.value,m=s.properties?.find(C=>C.key==="directive")?.value,p=s.properties?.find(C=>C.key==="actions")?.value,S=s.properties?.find(C=>C.key==="directiveLoop")?.value,v=s.properties?.find(C=>C.key==="reps")?.value,w=s.properties?.find(C=>C.key==="restTime")?.value;e.push({id:s.name,type:c||l||"box",position:r,scale:o,color:a,model:h,traits:[],metadata:{},animation:u,animationLoop:d,skeleton:f,patrol:g,patrolSpeed:y,directive:m,actions:p,directiveLoop:S,reps:v,restTime:w})}for(let s of n.spatialGroups||[])for(let r of s.objects||[]){let o=ac(r.properties?.find(T=>T.key==="position")?.value),a=cc(r.properties?.find(T=>T.key==="scale")?.value),c=r.properties?.find(T=>T.key==="color")?.value,l=r.properties?.find(T=>T.key==="geometry")?.value,h=r.properties?.find(T=>T.key==="type")?.value,u=r.properties?.find(T=>T.key==="model")?.value,d=r.properties?.find(T=>T.key==="animation")?.value,f=r.properties?.find(T=>T.key==="animationLoop")?.value,g=r.properties?.find(T=>T.key==="skeleton")?.value,y=r.properties?.find(T=>T.key==="patrol")?.value,m=r.properties?.find(T=>T.key==="patrolSpeed")?.value,p=r.properties?.find(T=>T.key==="directive")?.value,S=r.properties?.find(T=>T.key==="actions")?.value,v=r.properties?.find(T=>T.key==="directiveLoop")?.value,w=r.properties?.find(T=>T.key==="reps")?.value,C=r.properties?.find(T=>T.key==="restTime")?.value;e.push({id:r.name,type:l||h||"box",position:o,scale:a,color:c,model:u,traits:[],metadata:{},animation:d,animationLoop:f,skeleton:g,patrol:y,patrolSpeed:m,directive:p,actions:S,directiveLoop:v,reps:w,restTime:C})}return{state:t,environment:i,objects:e,logic:{actions:new Map,eventHandlers:new Map,frameHandlers:[],keyboardHandlers:new Map}}}function o0(n){let e=[],t=n;for(let i of t.body||[])(i.type==="orb"||i.type==="object")&&e.push({id:i.name,type:i.type==="orb"?"sphere":"box",position:ac(i.props?.position),scale:cc(i.props?.scale),color:i.props?.color,traits:i.traits||[],metadata:i.props||{}});return{state:{},environment:{},objects:e,logic:{actions:new Map,eventHandlers:new Map,frameHandlers:[],keyboardHandlers:new Map}}}function ac(n){if(!n)return{x:0,y:0,z:0};if(Array.isArray(n))return{x:Number(n[0])||0,y:Number(n[1])||0,z:Number(n[2])||0};if(typeof n=="object"){let e=n;return{x:e.x||0,y:e.y||0,z:e.z||0}}return{x:0,y:0,z:0}}function cc(n){if(!n)return{x:1,y:1,z:1};if(typeof n=="number")return{x:n,y:n,z:n};if(Array.isArray(n))return{x:Number(n[0])||1,y:Number(n[1])||1,z:Number(n[2])||1};if(typeof n=="object"){let e=n;return{x:e.x||1,y:e.y||1,z:e.z||1}}return{x:1,y:1,z:1}}var Qr=class{config;composition=null;scene;camera;renderer;controls=null;objectMap=new Map;uiComponents=new Map;animationId=null;animationMixers=[];proceduralAnimatedObjects=[];patrollingObjects=[];directiveObjects=[];isRunning=!1;isPaused=!1;state={};actionContext;constructor(e){this.config={container:e.container,mode:e.mode||"web",features:{monaco:e.features?.monaco??!0,brittney:e.features?.brittney??!1,networking:e.features?.networking??!1,xr:e.features?.xr??!0},quality:e.quality||"medium"},this.scene=new gs,this.scene.background=new me(986906),this.camera=new dt(75,e.container.clientWidth/e.container.clientHeight,.1,1e3),this.camera.position.set(0,2,5),this.renderer=new Wn({antialias:this.config.quality!=="low",alpha:!0}),this.renderer.setSize(e.container.clientWidth,e.container.clientHeight),this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2)),this.renderer.shadowMap.enabled=this.config.quality!=="low",this.renderer.xr.enabled=this.config.features.xr??!0,e.container.appendChild(this.renderer.domElement),this.config.mode==="web"&&(this.controls=new $r(this.camera,this.renderer.domElement),this.controls.enableDamping=!0),this.setupDefaultLighting(),this.actionContext=this.createActionContext(),window.addEventListener("resize",this.handleResize.bind(this)),window.addEventListener("keydown",this.handleKeyDown.bind(this)),window.addEventListener("keyup",this.handleKeyUp.bind(this))}load(e){try{console.log("[HoloScript] Loading source:",e.substring(0,100)+"...");let t=e.includes("composition")?"holo":"hsplus";console.log("[HoloScript] Detected file type:",t),this.composition=zh(e,t),console.log("[HoloScript] Loaded composition:",this.composition),console.log("[HoloScript] Number of objects:",this.composition?.objects?.length||0),this.state={...this.composition.state},this.applyEnvironment(this.composition.environment),this.buildScene(),kt("runtime:loaded",{composition:this.composition})}catch(t){console.error("Failed to load composition:",t),kt("runtime:error",{error:t})}}start(){this.isRunning||(this.isRunning=!0,this.isPaused=!1,this.renderLoop(),kt("runtime:started"))}stop(){this.isRunning=!1,this.animationId!==null&&(cancelAnimationFrame(this.animationId),this.animationId=null),kt("runtime:stopped")}pause(){this.isPaused=!0,kt("runtime:paused")}resume(){this.isPaused=!1,kt("runtime:resumed")}getState(){return{...this.state}}setState(e,t){let i=e.split("."),s=this.state;for(let r=0;r<i.length-1;r++)i[r]in s||(s[i[r]]={}),s=s[i[r]];s[i[i.length-1]]=t,kt("state:changed",{key:e,value:t}),this.updateReactiveBindings(e)}supportsVR(){return Bh()&&(this.config.features.xr??!0)}supportsAR(){return"xr"in navigator&&(this.config.features.xr??!0)}async enterVR(){if(!this.supportsVR())throw new Error("VR not supported");let e=await navigator.xr.requestSession("immersive-vr");this.renderer.xr.setSession(e),kt("xr:entered",{type:"vr"})}async enterAR(){if(!this.supportsAR())throw new Error("AR not supported");let e=await navigator.xr.requestSession("immersive-ar");this.renderer.xr.setSession(e),kt("xr:entered",{type:"ar"})}exitXR(){let e=this.renderer.xr.getSession();e&&e.end(),kt("xr:exited")}on(e,t){return Fh(e,t)}emit(e,t){kt(e,t)}executeAction(e,...t){let i=this.composition?.logic.actions.get(e);if(!i){console.warn(`Action not found: ${e}`);return}return this.runAction(i,t)}dispose(){this.stop(),this.renderer.dispose(),this.controls?.dispose(),this.renderer.domElement.remove(),this.uiComponents.forEach(e=>e.dispose()),this.uiComponents.clear(),window.removeEventListener("resize",this.handleResize.bind(this)),window.removeEventListener("keydown",this.handleKeyDown.bind(this)),window.removeEventListener("keyup",this.handleKeyUp.bind(this)),kt("runtime:disposed")}setupDefaultLighting(){let e=new Kn(4210752,.4);this.scene.add(e);let t=new cn(16777215,.8);t.position.set(10,20,10),t.castShadow=this.config.quality!=="low",this.scene.add(t)}applyEnvironment(e){if(e.skybox&&this.loadSkybox(e.skybox),e.ambientLight!==void 0){let t=this.scene.children.find(i=>i instanceof Kn);t&&(t.intensity=e.ambientLight)}if(e.grid){let t=new Es(20,20,4473924,2236962);this.scene.add(t)}e.theme==="developer-dark"&&(this.scene.background=new me(986906))}loadSkybox(e){let t={nebula:1710638,sunset:16744272,night:657946,"dev-gradient":986906};e in t?this.scene.background=new me(t[e]):e.startsWith("#")&&(this.scene.background=new me(e))}buildScene(){if(!this.composition){console.log("[HoloScript] No composition to build");return}console.log("[HoloScript] Building scene with",this.composition.objects.length,"objects"),console.log("[HoloScript] Objects:",this.composition.objects);for(let e of this.composition.objects)console.log("[HoloScript] Creating object:",e),this.createSceneObject(e)}createSceneObject(e){let t=e.type;if(t.startsWith("ui-")){this.createUIComponent(e);return}if(t==="model"||e.model){this.loadModel(e);return}let i;switch(t){case"sphere":case"orb":i=new Ss(.5,32,32);break;case"box":case"cube":i=new Oi(1,1,1);break;case"plane":i=new ms(1,1);break;case"cylinder":i=new bs(.5,.5,1,32);break;case"cone":i=new Pr(.5,1,32);break;case"torus":i=new Lr(.5,.2,16,100);break;default:i=new Oi(1,1,1)}let s=e.color||e.properties?.color||"#00d4ff",r=new _i({color:new me(s),metalness:.3,roughness:.7});(e.traits?.includes("glowing")||e.traits?.includes("emissive"))&&(r.emissive=new me(s),r.emissiveIntensity=.5),e.traits?.includes("transparent")&&(r.transparent=!0,r.opacity=e.properties?.opacity??.7);let o=new _t(i,r);o.position.set(e.position.x,e.position.y,e.position.z),o.rotation.set(e.rotation?.x||0,e.rotation?.y||0,e.rotation?.z||0),o.scale.set(e.scale?.x||1,e.scale?.y||1,e.scale?.z||1),o.name=e.id,o.userData={holoObject:e},this.scene.add(o),this.objectMap.set(e.id,o)}loadModel(e){let t=new Yr,i=e.model||e.properties?.model;if(!i){console.warn(`No model path specified for object ${e.id}`);return}t.load(i,s=>{let r=s.scene;r.position.set(e.position?.x||0,e.position?.y||0,e.position?.z||0),r.rotation.set(e.rotation?.x||0,e.rotation?.y||0,e.rotation?.z||0);let o=e.scale?.x||e.scale||1;if(typeof o=="number"?r.scale.set(o,o,o):r.scale.set(e.scale?.x||1,e.scale?.y||1,e.scale?.z||1),r.name=e.id,r.userData={holoObject:e},e.color){let h=new me(e.color);console.log(`[HoloScript] Color ${e.color} specified for ${e.id}`);let u=0,d=0;r.traverse(f=>{if((f.isMesh||f.isSkinnedMesh)&&f.material){let y=(Array.isArray(f.material)?f.material:[f.material]).map(m=>{if(m.map||m.normalMap||m.roughnessMap||m.metalnessMap||m.aoMap||m.emissiveMap)return d++,m;let S=m.clone();return S.color&&(S.color.copy(h),u++),S});f.material=Array.isArray(f.material)?y:y[0]}}),console.log(`[HoloScript] ${e.id}: colored ${u} materials, preserved ${d} textured materials`)}let a=!1,c=0,l=[];if(r.traverse(h=>{h.isBone&&(c++,l.push(h.name)),h.isSkinnedMesh&&(a=!0,console.log(`[HoloScript] Found skinned mesh in ${e.id}: ${h.name}`),h.skeleton&&console.log(`[HoloScript] Skeleton bones: ${h.skeleton.bones.length}`))}),a?(console.log(`[HoloScript] \u2713 Humanoid skeleton detected in ${e.id}`),console.log(`[HoloScript]   Bones (${c}): ${l.slice(0,10).join(", ")}${c>10?"...":""}`),r._skeletonInfo={type:e.skeleton||"humanoid",boneCount:c,boneNames:l,autoDetected:!0}):console.log(`[HoloScript] No skeleton in ${e.id} - static model`),console.log(`[HoloScript] Model ${e.id} has ${s.animations.length} animations`),s.animations.length>0){console.log("[HoloScript] Animation clips:",s.animations.map(u=>u.name));let h=new Br(r);if(e.actions&&Array.isArray(e.actions)&&e.actions.length>0){console.log(`[HoloScript] \u2713 Directive mode for ${e.id} with ${e.actions.length} actions`);let u={actions:e.actions,currentIndex:0,currentReps:0,isResting:!1,restEndTime:0,loop:e.directiveLoop!==!1,mixer:h,model:r,gltf:s};this.startDirectiveAction(u),this.directiveObjects.push(u),r._mixer=h,this.animationMixers.push(h)}else if(e.animation){let u=e.animation,d=e.animationLoop!==!1,f=e.reps,g=s.animations.find(y=>y.name.toLowerCase().includes(u.toLowerCase()))||s.animations[0];if(g){let y=h.clipAction(g);if(f&&f>0){console.log(`[HoloScript] ${e.id}: ${f} reps of ${g.name}`),y.setLoop(As,f),y.clampWhenFinished=!0;let m={actions:[{animation:u,reps:f},{rest:e.restTime||3}],currentIndex:0,currentReps:0,isResting:!1,restEndTime:0,loop:e.directiveLoop!==!1,mixer:h,model:r,gltf:s};this.startDirectiveAction(m),this.directiveObjects.push(m)}else y.setLoop(d?As:wa,1/0),y.play(),console.log(`[HoloScript] Playing requested animation: ${g.name}`)}r._mixer=h,this.animationMixers.push(h)}else{for(let u of s.animations)h.clipAction(u).play(),console.log(`[HoloScript] Playing animation: ${u.name} (duration: ${u.duration}s)`);r._mixer=h,this.animationMixers.push(h)}console.log(`[HoloScript] Total animation mixers: ${this.animationMixers.length}`)}else{let h=r._skeletonInfo;if(h&&h.boneCount>0){console.log(`[HoloScript] ${e.id}: No clips, using procedural skeleton animation`);let u=null;if(r.traverse(d=>{d.isSkinnedMesh&&d.skeleton&&(u=d)}),u&&u.skeleton){let d=u.skeleton,f=d.bones,g=[];for(let y of f)g.push(y.quaternion.clone());r._proceduralSkeleton={mesh:u,skeleton:d,bones:f,originalRotations:g,phase:Math.random()*Math.PI*2,animationType:e.animation||"idle"},r._isProceduralSkeletonAnimated=!0,this.proceduralAnimatedObjects.push(r),console.log(`[HoloScript] ${e.id}: Procedural skeleton ready with ${f.length} bones`)}}else{console.log(`[HoloScript] No animations in ${e.id}, adding procedural idle`);let u=r.scale.clone();r._breathePhase=Math.random()*Math.PI*2,r._baseScale=u,r._isProceduralAnimated=!0,this.proceduralAnimatedObjects.push(r)}}e.patrol&&Array.isArray(e.patrol)&&e.patrol.length>1&&(console.log(`[HoloScript] Setting up patrol for ${e.id} with ${e.patrol.length} waypoints`),r._patrol={waypoints:e.patrol.map(h=>new L(h[0],h[1],h[2])),currentIndex:0,speed:e.patrolSpeed||1,startPosition:new L(e.position?.x||0,e.position?.y||0,e.position?.z||0)},this.patrollingObjects.push(r)),this.scene.add(r),this.objectMap.set(e.id,r),console.log(`Loaded model: ${e.id} from ${i}`)},s=>{},s=>{console.error(`Failed to load model ${i}:`,s);let r=new _t(new Ss(.5,16,16),new _i({color:16711680}));r.position.set(e.position?.x||0,e.position?.y||0,e.position?.z||0),r.name=e.id,this.scene.add(r),this.objectMap.set(e.id,r)})}createUIComponent(e){let t=e.type.replace("ui-","");switch(t){case"monaco-editor":this.createMonacoEditor(e);break;case"3d-viewport":this.create3DViewport(e);break;case"button":this.createButton(e);break;case"text":this.createText(e);break;case"input":this.createInput(e);break;case"chat":this.createChatPanel(e);break;case"list":this.createList(e);break;case"properties":this.createPropertiesPanel(e);break;case"error-list":this.createErrorList(e);break;default:console.warn(`Unknown UI component: ${t}`)}}createMonacoEditor(e){if(!this.config.features.monaco){console.warn("Monaco editor feature not enabled");return}let t=document.createElement("div");t.id=`monaco-${e.id}`,t.style.cssText=`
      position: absolute;
      left: ${this.worldToScreenX(e.position.x)}px;
      top: ${this.worldToScreenY(e.position.y)}px;
      width: ${(e.scale?.x||1)*200}px;
      height: ${(e.scale?.y||1)*200}px;
      background: #1e1e1e;
      border-radius: 8px;
      overflow: hidden;
      z-index: 10;
    `,this.config.container.appendChild(t),this.loadMonaco(t,e),this.uiComponents.set(e.id,{element:t,type:"monaco-editor",dispose:()=>t.remove()})}async loadMonaco(e,t){try{let r=(await import("monaco-editor")).editor.create(e,{value:this.resolveStateRef(t.metadata?.value)||"",language:t.metadata?.language||"holo",theme:"vs-dark",minimap:{enabled:!1},fontSize:14,automaticLayout:!0});t.metadata?.on_change&&r.onDidChangeModelContent(()=>{let o=r.getValue();this.executeHandler(t.metadata.on_change,{value:o})}),this.uiComponents.get(t.id).editor=r}catch{console.warn("Monaco editor not available, using textarea fallback");let s=document.createElement("textarea");s.value=this.resolveStateRef(t.metadata?.value)||"",s.style.cssText="width: 100%; height: 100%; background: #1e1e1e; color: #d4d4d4; border: none; padding: 8px; font-family: monospace;",e.appendChild(s)}}create3DViewport(e){let t=document.createElement("div");t.id=`viewport-${e.id}`,t.style.cssText=`
      position: absolute;
      left: ${this.worldToScreenX(e.position.x)}px;
      top: ${this.worldToScreenY(e.position.y)}px;
      width: ${(e.scale?.x||1)*200}px;
      height: ${(e.scale?.y||1)*200}px;
      background: #0a0a0f;
      border-radius: 8px;
      overflow: hidden;
      z-index: 5;
    `,this.config.container.appendChild(t);let i=new Wn({antialias:!0,alpha:!0});i.setSize(t.clientWidth,t.clientHeight),t.appendChild(i.domElement);let s=new gs;s.background=new me(657935);let r=new dt(75,t.clientWidth/t.clientHeight,.1,100);r.position.set(0,2,5),e.properties?.show_grid&&s.add(new Es(10,10,4473924,2236962)),e.properties?.show_axes&&s.add(new zr(2)),s.add(new Kn(4210752,.5)),s.add(new cn(16777215,.8)),this.uiComponents.set(e.id,{element:t,type:"3d-viewport",renderer:i,scene:s,camera:r,dispose:()=>{i.dispose(),t.remove()}})}createButton(e){let t=document.createElement("button");t.id=`btn-${e.id}`,t.textContent=e.properties?.label||"Button",t.style.cssText=`
      position: absolute;
      left: ${this.worldToScreenX(e.position.x)}px;
      top: ${this.worldToScreenY(e.position.y)}px;
      padding: 8px 16px;
      background: ${e.properties?.color||"#00d4ff"};
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      z-index: 20;
    `,e.properties?.on_click&&(t.onclick=()=>this.executeHandler(e.properties.on_click,{})),this.config.container.appendChild(t),this.uiComponents.set(e.id,{element:t,type:"button",dispose:()=>t.remove()})}createText(e){let t=document.createElement("div");t.id=`text-${e.id}`,t.textContent=this.resolveStateRef(e.properties?.text)||"",t.style.cssText=`
      position: absolute;
      left: ${this.worldToScreenX(e.position.x)}px;
      top: ${this.worldToScreenY(e.position.y)}px;
      color: ${e.properties?.color||"#ffffff"};
      font-size: ${e.properties?.font_size||16}px;
      z-index: 15;
    `,this.config.container.appendChild(t),this.uiComponents.set(e.id,{element:t,type:"text",dispose:()=>t.remove()})}createInput(e){let t=document.createElement("input");t.id=`input-${e.id}`,t.type="text",t.placeholder=e.properties?.placeholder||"",t.style.cssText=`
      position: absolute;
      left: ${this.worldToScreenX(e.position.x)}px;
      top: ${this.worldToScreenY(e.position.y)}px;
      width: ${(e.scale?.x||1)*150}px;
      padding: 8px;
      background: #1a1a2e;
      color: #ffffff;
      border: 1px solid #333;
      border-radius: 6px;
      z-index: 20;
    `,e.properties?.on_submit&&(t.onkeydown=i=>{i.key==="Enter"&&(this.executeHandler(e.properties.on_submit,{value:t.value}),t.value="")}),this.config.container.appendChild(t),this.uiComponents.set(e.id,{element:t,type:"input",dispose:()=>t.remove()})}createChatPanel(e){let t=document.createElement("div");t.id=`chat-${e.id}`,t.style.cssText=`
      position: absolute;
      left: ${this.worldToScreenX(e.position.x)}px;
      top: ${this.worldToScreenY(e.position.y)}px;
      width: ${(e.scale?.x||1)*200}px;
      height: ${(e.scale?.y||1)*200}px;
      background: #1a1a2e;
      border-radius: 8px;
      overflow-y: auto;
      padding: 8px;
      z-index: 15;
    `,this.config.container.appendChild(t),this.uiComponents.set(e.id,{element:t,type:"chat",messages:[],addMessage:(i,s)=>{let r=document.createElement("div");r.style.cssText=`
          padding: 6px 10px;
          margin: 4px 0;
          border-radius: 6px;
          background: ${i==="user"?"#00d4ff22":"#ffd70022"};
          color: #e0e0e0;
          font-size: 13px;
        `,r.textContent=s,t.appendChild(r),t.scrollTop=t.scrollHeight},dispose:()=>t.remove()})}createList(e){let t=document.createElement("div");t.id=`list-${e.id}`,t.style.cssText=`
      position: absolute;
      left: ${this.worldToScreenX(e.position.x)}px;
      top: ${this.worldToScreenY(e.position.y)}px;
      width: ${(e.scale?.x||1)*150}px;
      max-height: ${(e.scale?.y||1)*200}px;
      background: #1a1a2e;
      border-radius: 8px;
      overflow-y: auto;
      z-index: 15;
    `,this.config.container.appendChild(t),this.uiComponents.set(e.id,{element:t,type:"list",dispose:()=>t.remove()})}createPropertiesPanel(e){let t=document.createElement("div");t.id=`props-${e.id}`,t.style.cssText=`
      position: absolute;
      left: ${this.worldToScreenX(e.position.x)}px;
      top: ${this.worldToScreenY(e.position.y)}px;
      width: 180px;
      background: #1a1a2e;
      border-radius: 8px;
      padding: 8px;
      z-index: 15;
    `,t.innerHTML='<div style="color:#00d4ff;font-size:12px;margin-bottom:8px;">Properties</div>',this.config.container.appendChild(t),this.uiComponents.set(e.id,{element:t,type:"properties",dispose:()=>t.remove()})}createErrorList(e){let t=document.createElement("div");t.id=`errors-${e.id}`,t.style.cssText=`
      position: absolute;
      left: ${this.worldToScreenX(e.position.x)}px;
      top: ${this.worldToScreenY(e.position.y)}px;
      width: ${(e.scale?.x||1)*200}px;
      background: #2a1a1a;
      border-radius: 6px;
      padding: 6px;
      color: #ff6666;
      font-size: 12px;
      z-index: 20;
    `,this.config.container.appendChild(t),this.uiComponents.set(e.id,{element:t,type:"error-list",dispose:()=>t.remove()})}worldToScreenX(e){return this.config.container.clientWidth/2+e*100}worldToScreenY(e){return this.config.container.clientHeight/2-e*100}resolveStateRef(e){if(typeof e=="object"&&e!==null&&"__stateRef"in e){let t=e.__stateRef;return this.getStatePath(t)||""}return e}getStatePath(e){let t=e.split("."),i=this.state;for(let s of t){if(i==null)return;i=i[s]}return i}executeHandler(e,t){if(typeof e=="object"&&e!==null&&"__call"in e){let i=e.__call;this.executeAction(i.name,...i.args)}else typeof e=="string"&&this.executeAction(e)}runAction(e,t){let i=this.createActionContext(),s={};return e.params.forEach((r,o)=>{s[r]=t[o]}),this.interpretActionBody(e.body,{...i,...s})}createActionContext(){return{state:this.state,setState:this.setState.bind(this),emit:kt,parse_holo:e=>{try{return{success:!0,ast:zh(e,"holo")}}catch(t){return{success:!1,errors:[t.message]}}},render_to_preview:(e,t)=>{let i=this.uiComponents.get(e);i&&i.type},format_holoscript:e=>e,lint_holoscript:e=>[],get_fps:()=>60,get_entities:()=>Array.from(this.objectMap.keys()),now:()=>performance.now()}}interpretActionBody(e,t){e&&console.log("Would execute:",e)}updateReactiveBindings(e){this.uiComponents.forEach((t,i)=>{t.type})}handleResize(){let e=this.config.container.clientWidth,t=this.config.container.clientHeight;this.camera.aspect=e/t,this.camera.updateProjectionMatrix(),this.renderer.setSize(e,t)}handleKeyDown(e){let t=this.composition?.logic.keyboardHandlers.get("on_keydown");t&&this.runAction(t,[{key:e.key,ctrl:e.ctrlKey,shift:e.shiftKey,alt:e.altKey}])}handleKeyUp(e){let t=this.composition?.logic.keyboardHandlers.get("on_keyup");t&&this.runAction(t,[{key:e.key,ctrl:e.ctrlKey,shift:e.shiftKey,alt:e.altKey}])}clock=new Fr;updateProceduralSkeleton(e,t){let{bones:i,phase:s,animationType:r,originalRotations:o}=e,a={idle:{speed:1.5,amplitude:.05,breathing:!0},flexing:{speed:2,amplitude:.3,arms:!0},boxing:{speed:4,amplitude:.4,arms:!0,punch:!0},situps:{speed:1.5,amplitude:.3,spine:!0},bicycleCrunch:{speed:2,amplitude:.4,spine:!0,legs:!0},wave:{speed:2,amplitude:.5,rightArm:!0},dance:{speed:3,amplitude:.3,fullBody:!0}},c=a[r]||a.idle,l=t*c.speed+s;for(let h=0;h<i.length;h++){let u=i[h],d=u.name.toLowerCase(),f=o[h];if(u.quaternion.copy(f),c.breathing&&(d.includes("spine")||d.includes("chest"))){let g=Math.sin(l*.8)*.03;u.rotation.x+=g}if(d.includes("hip")||d==="root"||d==="pelvis"){let g=Math.sin(l*.5)*.02;u.rotation.z+=g}if(c.arms||c.rightArm){if(d.includes("upperarm")||d.includes("upper_arm")){let g=d.includes("right")||d.includes("_r"),y=d.includes("left")||d.includes("_l");if(c.punch){let m=g?l:l+Math.PI,p=Math.max(0,Math.sin(m))*c.amplitude;u.rotation.x-=p*.5,u.rotation.z+=(g?-1:1)*p*.3}else if(c.rightArm&&g){let m=Math.sin(l*2)*c.amplitude;u.rotation.z+=m}else if(c.arms){let m=(1+Math.sin(l))*.5*c.amplitude;u.rotation.x-=m*.8,u.rotation.z+=(g?-1:1)*.5}}if(d.includes("forearm")||d.includes("lower_arm")||d.includes("lowerarm")){if(c.punch){let g=d.includes("right")?l:l+Math.PI,y=Math.max(0,Math.sin(g))*c.amplitude;u.rotation.x-=y*1.2}else if(c.arms){let g=(1+Math.sin(l*1.5))*.5*c.amplitude;u.rotation.x-=g*1.5}}}if(c.spine){if(d.includes("spine")&&!d.includes("spine1")&&!d.includes("spine2")){let g=Math.sin(l)*c.amplitude;u.rotation.x+=g}if(d.includes("spine1")){let g=Math.sin(l)*c.amplitude*.7;u.rotation.x+=g}if(d.includes("spine2")){let g=Math.sin(l)*c.amplitude*.4;u.rotation.x+=g}}if(c.legs){if(d.includes("thigh")||d.includes("upperleg")||d.includes("upper_leg")){let y=d.includes("right")||d.includes("_r")?l:l+Math.PI,m=Math.sin(y)*c.amplitude;u.rotation.x-=m*.8}if(d.includes("shin")||d.includes("lowerleg")||d.includes("lower_leg")||d.includes("calf")){let y=d.includes("right")||d.includes("_r")?l:l+Math.PI,m=Math.max(0,Math.sin(y+.5))*c.amplitude;u.rotation.x+=m*.6}}if(d.includes("head")||d.includes("neck")){let g=Math.sin(l*.7)*.02,y=Math.sin(l*.5)*.01;u.rotation.x+=g,u.rotation.z+=y}}}startDirectiveAction(e){let t=e.actions[e.currentIndex],i=e.model.name||"unknown";if(t.rest!==void 0)console.log(`[HoloScript] ${i}: resting for ${t.rest}s`),e.isResting=!0,e.restEndTime=performance.now()+t.rest*1e3,e.mixer.stopAllAction();else if(t.animation){let s=t.reps||1;console.log(`[HoloScript] ${i}: ${t.animation} x${s}`);let r=e.gltf.animations.find(o=>o.name.toLowerCase().includes(t.animation.toLowerCase()))||e.gltf.animations[0];if(r){e.mixer.stopAllAction();let o=e.mixer.clipAction(r);o.reset(),o.setLoop(As,1/0),o.play(),e.currentReps=0;let a=()=>{if(e.mixer.removeEventListener("loop",c),o.stop(),e.currentIndex++,e.currentIndex>=e.actions.length)if(e.loop)e.currentIndex=0,console.log(`[HoloScript] ${i}: Directive sequence complete, restarting`);else{console.log(`[HoloScript] ${i}: Directive sequence complete`);return}this.startDirectiveAction(e)},c=l=>{l.action===o&&(e.currentReps++,console.log(`[HoloScript] ${i}: rep ${e.currentReps}/${s}`),e.currentReps>=s&&a())};e.mixer.addEventListener("loop",c)}else console.warn(`[HoloScript] ${i}: Animation clip not found for "${t.animation}"`)}}renderLoop=()=>{if(!this.isRunning||(this.animationId=requestAnimationFrame(this.renderLoop),this.isPaused))return;let e=this.clock.getDelta();for(let s of this.animationMixers)s.update(e);let t=this.clock.getElapsedTime();for(let s of this.proceduralAnimatedObjects){let r=s._proceduralSkeleton;if(r&&s._isProceduralSkeletonAnimated)this.updateProceduralSkeleton(r,t);else{let o=s._breathePhase||0,a=s._baseScale;if(a){let c=1+Math.sin(t*2+o)*.02,l=Math.sin(t*1.5+o)*.03;s.scale.set(a.x*c,a.y*c,a.z*c),s.rotation.y=l}}}for(let s of this.patrollingObjects){let r=s._patrol;if(!r)continue;let o=r.waypoints[r.currentIndex],a=o.clone().sub(s.position),c=a.length();if(c<.1)r.currentIndex=(r.currentIndex+1)%r.waypoints.length;else{a.normalize();let l=r.speed*e;s.position.add(a.multiplyScalar(Math.min(l,c))),s.lookAt(o.x,s.position.y,o.z)}}let i=performance.now();for(let s of this.directiveObjects)if(s.isResting&&i>=s.restEndTime){if(s.isResting=!1,s.currentIndex++,s.currentIndex>=s.actions.length)if(s.loop)s.currentIndex=0,console.log(`[HoloScript] Directive loop restart for ${s.model.name}`);else continue;this.startDirectiveAction(s)}this.controls?.update();for(let s of this.composition?.logic.frameHandlers||[])this.runAction(s,[]);this.renderer.render(this.scene,this.camera),this.uiComponents.forEach(s=>{s.type==="3d-viewport"&&s.renderer&&s.scene&&s.camera&&s.renderer.render(s.scene,s.camera)})}};function Hh(n){return new Qr(n)}typeof window<"u"&&(window.HoloScript={createRuntime:Hh,version:"2.1.0"});return Jh(a0);})();
/*! Bundled license information:

three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2023 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/
//# sourceMappingURL=holoscript.global.global.js.map