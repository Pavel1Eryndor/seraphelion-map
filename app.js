import * as THREE from 'three';
import {OrbitControls} from './OrbitControls.js';

const host=document.querySelector('#world'), loading=document.querySelector('#loading');
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch(e){loading.textContent='Browserul nu a putut porni harta 3D. Activează accelerarea grafică și reîncarcă pagina.';throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;host.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#101d24');scene.fog=new THREE.Fog('#101d24',32,75);
const camera=new THREE.PerspectiveCamera(39,innerWidth/innerHeight,.1,150);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.maxPolarAngle=Math.PI*.475;controls.minDistance=4;controls.maxDistance=48;controls.target.set(0,0,0);
scene.add(new THREE.AmbientLight(0xffffff,2.05));const sun=new THREE.DirectionalLight(0xffe7c1,2.0);sun.position.set(-10,22,8);scene.add(sun);const fill=new THREE.DirectionalLight(0xc4eafa,.6);fill.position.set(12,8,-8);scene.add(fill);
const W=24,D=16,NX=384,NY=256;let factor=1,terrain,heights,positions,markerItems=[];
const regions={all:[.5,.5,29],tarvel:[.50,.10,15],cyrintia:[.31,.35,14],myriador:[.72,.23,12],velmyria:[.47,.59,14],irilia:[.85,.67,10],thalesia:[.25,.80,13]};
const places=[['Capitala Cyrintiei',.302,.374],['Myria',.628,.172],["Mar’keth",.788,.256],['Arkhalon',.639,.337]];
// Artist-directed elevation: ridge locations are interpreted from the supplied illustration.
const peaks=[];function ridge(x1,y1,x2,y2,n,height,width){for(let i=0;i<n;i++){const t=i/(n-1);peaks.push([x1+(x2-x1)*t,y1+(y2-y1)*t+Math.sin(i*2.8)*width*.38,height*(.72+.28*Math.sin(i*5.3+1)**2),width,width*.72]);}}
ridge(.15,.015,.86,.015,25,1.65,.025);ridge(.22,.045,.66,.087,19,1.35,.023);ridge(.15,.218,.24,.241,6,1.05,.022);ridge(.13,.382,.235,.356,7,1.15,.022);ridge(.60,.628,.751,.815,11,1.2,.023);ridge(.515,.704,.572,.738,5,.7,.02);ridge(.79,.532,.924,.538,9,.52,.018);ridge(.105,.651,.127,.73,5,.6,.018);
function gauss(x,y,p){return p[2]*Math.exp(-((x-p[0])**2/(2*p[3]**2)+(y-p[1])**2/(2*p[4]**2)));}
function elevation(u,v,mask){let m=0;for(const p of peaks)m=Math.max(m,gauss(u,v,p));const undulation=(Math.sin(u*101+Math.sin(v*64))*Math.sin(v*94)+Math.sin(u*219+v*129)*.35);return mask*(.17+.06*Math.sin(u*15)**2+m*(.85+.15*undulation)+.04*undulation);}
function focus(key='all',top=false){const [u,v,dist]=regions[key];const x=(u-.5)*W,z=(v-.5)*D;controls.target.set(x,0,z);const mobile=innerWidth<760?1.2:1;camera.position.set(x,dist*(top?1:.72)*mobile,z+dist*(top?.001:.69)*mobile);controls.update();document.querySelector('#perspective').classList.toggle('active',!top);document.querySelector('#top').classList.toggle('active',top);document.querySelectorAll('[data-region]').forEach(b=>b.classList.toggle('selected',b.dataset.region===key));}
let currentRegion='all';
document.querySelectorAll('[data-region]').forEach(b=>b.onclick=()=>{currentRegion=b.dataset.region;focus(currentRegion);});document.querySelector('#top').onclick=()=>focus(currentRegion,true);document.querySelector('#perspective').onclick=()=>focus(currentRegion);document.querySelector('#reset').onclick=()=>{currentRegion='all';focus();};document.querySelector('#close').onclick=()=>document.querySelector('#detail').hidden=true;
function sampleHeight(u,v){return heights[Math.round(v*NY)*(NX+1)+Math.round(u*NX)]||0;}
function updateHeight(){for(let i=0;i<heights.length;i++)positions.setY(i,heights[i]*factor);positions.needsUpdate=true;terrain.geometry.computeVertexNormals();for(const m of markerItems){m.mesh.position.y=sampleHeight(m.u,m.v)*factor+.13;}}
document.querySelector('#height').oninput=e=>{factor=Number(e.target.value)/100;document.querySelector('#height-value').value=e.target.value+'%';if(terrain)updateHeight();};
document.querySelector('#markers').onchange=e=>{for(const m of markerItems){m.mesh.visible=e.target.checked;m.label.hidden=!e.target.checked;}};
async function build(){const texture=await new THREE.TextureLoader().loadAsync('./map.png');texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
 const c=document.createElement('canvas');c.width=NX+1;c.height=NY+1;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(texture.image,0,0,c.width,c.height);const rgba=ctx.getImageData(0,0,c.width,c.height).data;const raw=new Float32Array(c.width*c.height);
 for(let i=0;i<raw.length;i++){const r=rgba[i*4],g=rgba[i*4+1],b=rgba[i*4+2],v=Math.floor(i/c.width)/NY;raw[i]=(b>r*1.035&&g>r*1.015)?0:1;if(v>.915)raw[i]=0;}
 const geometry=new THREE.PlaneGeometry(W,D,NX,NY);geometry.rotateX(-Math.PI/2);positions=geometry.attributes.position;heights=new Float32Array(raw.length);
 for(let y=0;y<=NY;y++)for(let x=0;x<=NX;x++){let sum=0,count=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<=NX&&yy>=0&&yy<=NY){sum+=raw[yy*(NX+1)+xx];count++;}}let mask=sum/count;mask=THREE.MathUtils.smoothstep(mask,.25,.85);const u=x/NX,v=y/NY;const border=Math.min(1,x/3,(NX-x)/3,y/3,(NY-y)/3);heights[y*(NX+1)+x]=elevation(u,v,mask)*border;}
 terrain=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({map:texture,roughness:.95,metalness:0}));scene.add(terrain);
 const base=new THREE.Mesh(new THREE.BoxGeometry(W,.28,D),new THREE.MeshStandardMaterial({color:'#655441',roughness:1}));base.position.y=-.16;scene.add(base);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(180,180),new THREE.MeshBasicMaterial({color:'#101d24'}));ground.rotation.x=-Math.PI/2;ground.position.y=-.34;scene.add(ground);
 for(const [name,u,v] of places){const mesh=new THREE.Mesh(new THREE.SphereGeometry(.065,12,8),new THREE.MeshBasicMaterial({color:0xffdf91}));mesh.position.set((u-.5)*W,0,(v-.5)*D);scene.add(mesh);const label=document.createElement('button');label.className='pin-label';label.textContent=name;label.onclick=()=>{document.querySelector('#detail').hidden=false;document.querySelector('#place-name').textContent=name;};host.appendChild(label);markerItems.push({mesh,label,u,v});}
 updateHeight();focus();loading.hidden=true;window.__atlas={terrain,heights,renderer,scene,camera,markerItems};
}
build().catch(e=>{console.error(e);loading.textContent='Harta nu s-a putut încărca. Deschide site-ul printr-un server local sau GitHub Pages.';});
const projected=new THREE.Vector3();function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);for(const m of markerItems){projected.copy(m.mesh.position);projected.y+=.1;projected.project(camera);m.label.style.left=((projected.x*.5+.5)*innerWidth)+'px';m.label.style.top=((-projected.y*.5+.5)*innerHeight)+'px';m.label.hidden=!m.mesh.visible||projected.z>1||projected.z< -1;}}animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

