// Guangxi Minzu University · Xiangsi Lake campus south gate.
// The central double-eaved gate, side arches and lettering follow the referenced
// east-campus south-gate photograph. Landscape and street are condensed to scale.
const palette = {
  background: 0xe5ebe8, stone: 0xded2b8, stoneLight: 0xeee4ce,
  stoneShade: 0xb4ad94, roof: 0xbf6548, roofLight: 0xd98459,
  roofDark: 0x874b3b, timber: 0x42594f, timberLight: 0x6a7762,
  grass: 0x9aaf71, grassLight: 0xb3c68b, pavement: 0xd5d3bc,
  road: 0x889997, white: 0xf1efda, metal: 0x637d73,
  ink: 0x444f45, glass: 0x779d9b, red: 0xb94f38, gold: 0xb58d46
};
const canvas = document.querySelector('canvas');
const renderer = new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(palette.background);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.toneMapping = THREE.NoToneMapping;
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-24,24,20,-20,.1,160);
const model = new THREE.Group(); model.name='校园微缩模型'; scene.add(model);
const terrain = new THREE.Group(); terrain.name='正方形底座与道路'; model.add(terrain);
const architecture = new THREE.Group(); architecture.name='南门建筑'; model.add(architecture);
const landscape = new THREE.Group(); landscape.name='校园树木与绿植'; model.add(landscape);
const daily = new THREE.Group(); daily.name='街角日常'; model.add(daily);

const ramp = new THREE.DataTexture(new Uint8Array([95,156,210,255]),4,1,THREE.RedFormat);
ramp.minFilter=ramp.magFilter=THREE.NearestFilter;ramp.generateMipmaps=false;ramp.needsUpdate=true;
const materials = new Map();
function mat(color) {
  if(!materials.has(color)) materials.set(color,new THREE.MeshToonMaterial({color,gradientMap:ramp}));
  return materials.get(color);
}
const edgeMaterial=new THREE.LineBasicMaterial({color:0x526358,transparent:true,opacity:.22});
const meshCache=new Map();
function mesh(geometry,color,parent=model,edge=false) {
  const item=new THREE.Mesh(geometry,typeof color==='number'?mat(color):color);
  item.castShadow=true;item.receiveShadow=true;parent.add(item);
  if(edge){const line=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,35),edgeMaterial);item.add(line);}
  return item;
}
function box(w,h,d,x,y,z,color,parent=model,edge=false) {
  const key=`b${w},${h},${d}`;
  if(!meshCache.has(key))meshCache.set(key,new THREE.BoxGeometry(w,h,d));
  const item=mesh(meshCache.get(key),color,parent,edge);item.position.set(x,y,z);return item;
}
function roundedBox(w,h,d,r,x,y,z,color,parent=model) {
  const s=new THREE.Shape(),a=-w/2,b=-h/2;
  s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);
  s.lineTo(a+w,b+h-r);s.quadraticCurveTo(a+w,b+h,a+w-r,b+h);
  s.lineTo(a+r,b+h);s.quadraticCurveTo(a,b+h,a,b+h-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);
  const g=new THREE.ExtrudeGeometry(s,{depth:Math.max(.02,d-2*r),bevelEnabled:true,bevelSize:r,bevelThickness:r,bevelSegments:2,steps:1,curveSegments:3});
  g.translate(0,0,-(d-2*r)/2);const m=mesh(g,color,parent);m.position.set(x,y,z);return m;
}
function cylinder(r1,r2,h,x,y,z,color,parent=model,segments=12) {
  const key=`c${r1},${r2},${h},${segments}`;
  if(!meshCache.has(key))meshCache.set(key,new THREE.CylinderGeometry(r1,r2,h,segments));
  const m=mesh(meshCache.get(key),color,parent);m.position.set(x,y,z);return m;
}
function sphere(r,x,y,z,color,parent=model,sx=1,sy=1,sz=1) {
  const key='s'+r;if(!meshCache.has(key))meshCache.set(key,new THREE.SphereGeometry(r,12,9));
  const m=mesh(meshCache.get(key),color,parent);m.position.set(x,y,z);m.scale.set(sx,sy,sz);return m;
}
function bar(a,b,r,color,parent=model) {
  const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b);
  const m=cylinder(r,r,A.distanceTo(B),...(A.clone().add(B).multiplyScalar(.5).toArray()),color,parent,7);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),B.sub(A).normalize());return m;
}
function tube(points,r,color,parent=model,segments=20){
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments,r,5,false),color,parent);
}
function group(x,y,z,parent=model,rotation=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rotation;parent.add(g);return g;}
function mergeGeometries(items) {
  const ps=[],ns=[],uvs=[];
  for(let g of items){if(g.index)g=g.toNonIndexed();ps.push(...g.attributes.position.array);ns.push(...g.attributes.normal.array);if(g.attributes.uv)uvs.push(...g.attributes.uv.array);}
  const merged=new THREE.BufferGeometry();merged.setAttribute('position',new THREE.Float32BufferAttribute(ps,3));merged.setAttribute('normal',new THREE.Float32BufferAttribute(ns,3));
  if(uvs.length)merged.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));return merged;
}
let seed=187;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}

scene.add(new THREE.HemisphereLight(0xf4f0dc,0x96aaa0,1.45));
const sunlight=new THREE.DirectionalLight(0xffecd2,2.15);
sunlight.position.set(-24,36,20);sunlight.castShadow=true;
sunlight.shadow.mapSize.set(2048,2048);
Object.assign(sunlight.shadow.camera,{left:-31,right:31,top:31,bottom:-31,near:1,far:90});
sunlight.shadow.bias=-.0002;sunlight.shadow.normalBias=.035;sunlight.shadow.radius=3.5;
sunlight.target.position.set(0,0,0);scene.add(sunlight,sunlight.target);
const fill=new THREE.DirectionalLight(0xd3e5eb,.45);fill.position.set(12,16,-20);scene.add(fill);

// A bevelled, square plinth; every physical feature stays inside ±19.5.
roundedBox(38.7,1.12,38.7,.16,0,-.68,0,0xb3bfa9,terrain);
box(39,.16,39,0,-.06,0,0xcfd5bd,terrain,true);
box(38.75,.11,38.75,0,.035,0,palette.pavement,terrain);
const studioFloor=mesh(new THREE.PlaneGeometry(220,220),new THREE.MeshBasicMaterial({color:palette.background}),scene);
studioFloor.rotation.x=-Math.PI/2;studioFloor.position.y=-1.42;studioFloor.castShadow=false;
const shadowFloor=mesh(new THREE.PlaneGeometry(100,100),new THREE.ShadowMaterial({opacity:.12}),scene);
shadowFloor.rotation.x=-Math.PI/2;shadowFloor.position.y=-1.4;shadowFloor.castShadow=false;

// Campus drive, a modest frontage, and a street with a landscaped median.
box(8.6,.025,31.4,0,.104,-3.2,0xa6b1a5,terrain);
box(12.9,.026,10.9,0,.11,3.4,0xa6b1a5,terrain);
// A continuous, unobstructed walking band sits in front of the furnishing strip.
const sidewalk=box(38.5,.025,3.05,0,.118,10.775,0xe2deca,terrain);
sidewalk.name='连续人行道';
// Flush vehicle access crosses the footway; zebra markings maintain the walking route.
const vehicleAccess=box(8.6,.024,4.15,0,.151,10.775,0xa6b1a5,terrain);
vehicleAccess.name='中央双向车辆出入口';
for(let x=-3.9;x<4.1;x+=.68)box(.36,.012,2.55,x,.17,10.775,0xede9d0,terrain);
box(38.5,.03,6.2,0,.105,15.9,palette.road,terrain);
// The campus-side kerb opens at the driveway and lowers at the pedestrian crossing.
for(const [z,segments] of [[12.55,[[-19.25,-4.3],[4.3,7.5],[10.1,19.25]]],[19,[[-19.25,7.5],[10.1,19.25]]]]){
  for(const [a,b] of segments)box(b-a,.12,.45,(a+b)/2,.16,z,0xe2dfc9,terrain,true);
}
for(const z of [12.55,19])box(2.6,.022,.45,8.8,.13,z,0xe2dfc9,terrain);
for(let x=-18.6;x<=18.6;x+=1.15){
  if(x>7.0&&x<10.7)continue;
  if(Math.abs(x)>4.85)box(1.02,.05,.06,x,.245,12.55,0xb7baa8,terrain);
  box(1.02,.05,.06,x,.245,19,0xb7baa8,terrain);
}
for(const z of [13.72,18.1])for(let x=-17;x<19;x+=3.1){
  if(x+0.75>7.5&&x-0.75<10.1)continue;
  box(1.5,.012,.07,x,.129,z,palette.white,terrain);
}
// Split both the median stone and its shrubs; the crossing stays at road level.
for(const [a,b] of [[-19,7.5],[10.1,19]]){
  box(b-a,.2,.8,(a+b)/2,.24,16,0xc1c7ad,terrain,true);
  box(b-a-.24,.08,.55,(a+b)/2,.37,16,0x92a96c,terrain);
  for(let x=a+.45;x<b-.40;x+=.62)sphere(.31,x,.53,16,x%2<0?0x8ba364:0x9bb273,landscape,1.2,.8,.8);
}
for(let z=13;z<18.8;z+=.57)box(2.1,.017,.28,8.8,.145,z,0xeee9cf,terrain);

function pavingLine(x1,z1,x2,z2,y=.15){bar([x1,y,z1],[x2,y,z2],.012,0xbcc1ae,terrain);}
for(let z=6.9;z<9;z+=1.1){pavingLine(-18.6,z,-6.55,z);pavingLine(6.55,z,18.6,z);}
for(let z=9.35;z<=12.2;z+=.95){pavingLine(-19.1,z,-4.35,z);pavingLine(4.35,z,19.1,z);}
for(let x=-18.5;x<19;x+=1.45){if(Math.abs(x)>4.35)pavingLine(x,9.3,x,12.2);}
for(const x of [-4.08,4.08])box(.09,.014,27.0,x,.131,-4.5,0xe6e2c9,terrain);
// Two vehicle lanes share a painted centreline beneath the physical divider fence.
for(let z=-17.8;z<8.8;z+=2.0){
  const divider=box(.12,.014,1.2,0,.14,z,0xe5c564,terrain);
  divider.name='车辆进出分界线';
}
function roadArrow(x,z,angle=0,scale=1){
  const shape=new THREE.Shape();shape.moveTo(-.12,-1.05);shape.lineTo(.12,-1.05);shape.lineTo(.12,.2);shape.lineTo(.46,.2);shape.lineTo(0,1);shape.lineTo(-.46,.2);shape.lineTo(-.12,.2);shape.closePath();
  const m=mesh(new THREE.ShapeGeometry(shape),mat(0xede9d0),terrain);m.rotation.set(-Math.PI/2,0,angle);m.position.set(x,.14,z);m.scale.setScalar(scale);m.castShadow=false;
}
for(const z of [6.4,-6.8,-14.0]){
  roadArrow(2.15,z,0,.9);      // Right lane enters campus, towards negative z.
  roadArrow(-2.15,z,Math.PI,.9); // Left lane exits campus, towards positive z.
}

// Soft, baked contact shades augment the real directional shadow.
const shadeCanvas=document.createElement('canvas');shadeCanvas.width=shadeCanvas.height=128;
const sc=shadeCanvas.getContext('2d'),sg=sc.createRadialGradient(64,64,0,64,64,64);
sg.addColorStop(0,'rgba(47,73,48,.22)');sg.addColorStop(.5,'rgba(47,73,48,.12)');sg.addColorStop(1,'rgba(47,73,48,0)');
sc.fillStyle=sg;sc.fillRect(0,0,128,128);
const shadeTexture=new THREE.CanvasTexture(shadeCanvas);
const shadeMaterial=new THREE.MeshBasicMaterial({map:shadeTexture,transparent:true,depthWrite:false});
function contact(x,z,w,d,y=.15){const m=mesh(new THREE.PlaneGeometry(w,d),shadeMaterial,landscape);m.rotation.x=-Math.PI/2;m.position.set(x,y,z);m.castShadow=m.receiveShadow=false;}

// Swept hip roofs with individual rounded tile seams and curled eaves.
function roof(w,d,h,level,parent,roofColor=palette.roof) {
  const positions=[],indices=[],tileGeometries=[],edgePoints=[];
  const n=28,m=10,ridge=(w-d)*.5;
  function surf(u,t,side){
    const a=(u-.5)*2;
    const yy=level+h*Math.pow(1-t,1.62)+.26*Math.pow(t,5)+.18*Math.pow(Math.abs(a),5)*Math.pow(t,4);
    if(side<2)return [a*(ridge*(1-t)+w*.5*t),yy,(side===0?1:-1)*d*.5*t];
    return [(side===2?1:-1)*(ridge+(w*.5-ridge)*t),yy,a*d*.5*t];
  }
  for(let side=0;side<4;side++){
    const offset=positions.length/3;
    for(let j=0;j<=m;j++)for(let i=0;i<=n;i++)positions.push(...surf(i/n,j/m,side));
    for(let j=0;j<m;j++)for(let i=0;i<n;i++){
      const a=offset+j*(n+1)+i,b=a+1,c=a+n+1,e=c+1;
      indices.push(a,c,b,b,c,e);
    }
    const strips=side<2?Math.ceil(w/.26):Math.ceil(d/.32);
    for(let i=0;i<=strips;i++){
      const pts=[];for(let t=0;t<=10;t++){const p=surf(i/strips,t/10,side);p[1]+=.028;pts.push(new THREE.Vector3(...p));}
      tileGeometries.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),12,.029,4,false));
    }
    const points=[];for(let i=0;i<=20;i++)points.push(surf(i/20,1,side));
    tube(points,.075,palette.roofDark,parent,30);
    for(const t of [.32,.54,.74,.91]){
      const points=[];for(let i=0;i<=20;i++){const p=surf(i/20,t,side);p[1]+=.018;points.push(new THREE.Vector3(...p));}
      tileGeometries.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,.012,3,false));
    }
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
  const material=new THREE.MeshToonMaterial({color:roofColor,gradientMap:ramp,side:THREE.DoubleSide});
  mesh(g,material,parent);
  mesh(mergeGeometries(tileGeometries),palette.roofLight,parent);
  box(w-.35,.13,d-.35,0,level+.04,0,palette.stoneShade,parent);
  bar([-ridge,level+h+.08,0],[ridge,level+h+.08,0],.12,palette.roofDark,parent);
  bar([-ridge,level+h+.17,0],[ridge,level+h+.17,0],.052,palette.roofLight,parent);
  for(const sx of [-1,1]) {
    tube([[sx*(ridge-.25),level+h+.13,0],[sx*(ridge+.1),level+h+.3,0],[sx*(ridge+.05),level+h+.62,0],[sx*(ridge-.13),level+h+.68,0]],.075,palette.roofDark,parent,16);
    for(const sz of [-1,1]){
      tube([[sx*(w/2-.8),level+.37,sz*(d/2-.2)],[sx*(w/2-.15),level+.55,sz*d/2],[sx*(w/2+.02),level+.97,sz*(d/2+.03)]],.072,palette.roofDark,parent,16);
    }
  }
}
function bracket(x,y,z,parent,rotation=0) {
  const g=group(x,y,z,parent,rotation);
  box(.19,.48,.22,0,.13,0,palette.stoneLight,g);
  box(.55,.14,.36,0,.02,0,palette.stoneShade,g);
  box(.78,.12,.23,0,.25,-.05,palette.stoneLight,g);
  box(.23,.26,.59,0,.38,-.03,palette.stoneLight,g);
  box(.95,.12,.45,0,.52,-.02,palette.stoneLight,g);
  box(.14,.18,.18,-.34,.38,-.03,palette.stoneShade,g);
  box(.14,.18,.18,.34,.38,-.03,palette.stoneShade,g);
}
function decorativePanel(x,y,z,size,parent) {
  box(size,.05,size,x,y,z,palette.stoneShade,parent);
}
function medallion(x,y,z,size,parent) {
  const g=group(x,y,z,parent);
  box(size,size,.07,0,0,0,0xb4ab8d,g);
  box(size*.83,size*.83,.085,0,0,.025,palette.stoneLight,g);
  const rr=size*.27;
  for(let i=0;i<4;i++){
    const a=i*Math.PI/2;
    const b=box(size*.18,size*.40,.05,Math.sin(a)*rr,Math.cos(a)*rr,.09,palette.stoneShade,g);
    b.rotation.z=-a;
  }
  box(size*.24,size*.24,.06,0,0,.1,palette.stoneShade,g);
}

const gate=group(0,.12,.3,architecture);gate.name='相思湖校区南门';
// Large stone portal: the open rectangular central span is its signature.
for(const x of [-7.35,7.35]){
  box(1.7,6.8,2.1,x,3.4,0,palette.stone,gate,true);
  box(1.93,.33,2.32,x,.16,0,palette.stoneShade,gate,true);
  box(1.84,.15,2.25,x,.40,0,palette.stoneLight,gate);
  for(let y=1;y<6.8;y+=.72)box(1.71,.018,.015,x,y,1.06,0xc1b69b,gate);
}
box(16.4,1.95,2.1,0,7.16,0,palette.stone,gate,true);
box(17.0,.24,2.48,0,8.18,0,palette.stoneShade,gate,true);
box(16.55,.14,2.26,0,8.38,0,palette.stoneLight,gate);
box(13.1,.19,1.8,0,6.11,0,palette.stoneShade,gate);
for(const x of [-7.35,7.35])medallion(x,7.1,1.08,.82,gate);
// The campus name is painted directly on the physical stone fascia.
function textTexture(){
  const c=document.createElement('canvas');c.width=2048;c.height=348;
  const ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);
  ctx.fillStyle='#665736';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font='38px Georgia, serif';ctx.fillText('GVANGJSIH MINZCUZ DAYOZ',1024,40);
  ctx.font='bold 156px KaiTi, STKaiti, SimSun, serif';
  const letters='广西民族大学';for(let i=0;i<letters.length;i++)ctx.fillText(letters[i],445+i*234,166);
  ctx.font='36px Georgia, serif';ctx.fillText('GUANGXI UNIVERSITY FOR NATIONALITIES',1024,290);
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return t;
}
const signMat=new THREE.MeshBasicMaterial({map:textTexture(),transparent:true,depthWrite:false});
const sign=mesh(new THREE.PlaneGeometry(11.6,1.68),signMat,gate);sign.position.set(0,7.14,1.066);sign.castShadow=false;
const rearSign=sign.clone();rearSign.position.z=-1.066;rearSign.rotation.y=Math.PI;gate.add(rearSign);
// Dark timber galleries and the two unmistakable orange tiled roof tiers.
for(const x of [-6.4,-4.3,0,4.3,6.4])for(const z of [-.78,.78]){
  box(.31,1.65,.33,x,9.23,z,palette.timber,gate,true);
  box(.54,.16,.54,x,8.49,z,palette.stoneShade,gate);
}
for(const z of [-.82,.82]){
  box(13.9,.28,.30,0,9.86,z,palette.timber,gate);
  box(13.8,.19,.30,0,8.98,z,palette.timberLight,gate);
  for(let x=-6.4;x<6.7;x+=1.05)bracket(x,10.0,z,gate);
}
for(const x of [-6.62,6.62])for(const z of [-.6,.1,.8])bracket(x,10,z,gate,Math.PI/2);
roof(17.4,4.9,1.48,10.66,gate);
for(const x of [-4.5,4.5])for(const z of [-.6,.6])box(.28,1.08,.28,x,12.17,z,palette.timber,gate);
box(9.5,.54,1.68,0,12.35,0,palette.timber,gate,true);
for(const z of [-.85,.85])for(let x=-4.4;x<4.5;x+=.75)bracket(x,12.62,z,gate);
roof(12.8,3.8,1.18,13.25,gate);
// Lower pavilion wings: the semicircular openings are sealed by fixed railings.
function sidePortal(x) {
  const wing=group(x,0,0,gate);wing.name='固定围栏侧拱门';
  const w=5.6,h=5.65,r=1.74,arcY=2.4;
  // The arch opens through the bottom edge: use one concave contour, not
  // a closed hole intersecting that edge (which Earcut would fill in).
  const s=new THREE.Shape();
  s.moveTo(-w/2,0);s.lineTo(-r,0);s.lineTo(-r,arcY);
  s.absarc(0,arcY,r,Math.PI,0,true);s.lineTo(r,0);
  s.lineTo(w/2,0);s.lineTo(w/2,h);s.lineTo(-w/2,h);s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:1.95,bevelEnabled:false,curveSegments:30});g.translate(0,0,-.975);mesh(g,palette.stone,wing,true);
  const outerR=r+.27,trim=new THREE.Shape();trim.moveTo(-outerR,0);trim.lineTo(-outerR,arcY);trim.absarc(0,arcY,outerR,Math.PI,0,true);trim.lineTo(outerR,0);trim.lineTo(r,0);trim.lineTo(r,arcY);trim.absarc(0,arcY,r,0,Math.PI,false);trim.lineTo(-r,0);trim.closePath();
  const ar=mesh(new THREE.ExtrudeGeometry(trim,{depth:.10,bevelEnabled:false,curveSegments:30}),palette.stoneShade,wing);ar.position.z=.982;
  const arr=ar.clone();arr.rotation.y=Math.PI;arr.position.z=-.982;wing.add(arr);
  archSecurityFence(wing,r,arcY);
  box(6,.23,2.3,0,5.73,0,palette.stoneShade,wing,true);
  for(const xx of [-2.15,2.15])for(const zz of [-.65,.65])box(.26,1.2,.28,xx,6.45,zz,palette.timber,wing);
  for(const zz of [-.73,.73]){
    box(4.8,.23,.28,0,6.92,zz,palette.timber,wing);
    for(let xx=-2.15;xx<=2.2;xx+=.86)bracket(xx,7.01,zz,wing);
  }
  roof(7.1,3.8,1.05,7.68,wing);
  medallion(-2.29,4.65,1.03,.48,wing);medallion(2.29,4.65,1.03,.48,wing);
}
sidePortal(-11.83);sidePortal(11.83);
for(const x of [-8.82,8.82])box(.95,4.65,1.55,x,2.325,0,palette.stoneShade,gate,true);
for(const x of [-15.6,15.6]){
  box(1.9,2.1,1.0,x,1.05,0,palette.stone,gate,true);
  box(2.1,.19,1.22,x,2.18,0,palette.stoneShade,gate);
}
function lantern(x,y,z,parent){
  bar([x,y+.40,z],[x,y+.87,z],.025,palette.timber,parent);
  sphere(.31,x,y,z,palette.red,parent,1.15,1,.95);
  for(const yy of [y-.29,y+.29])cylinder(.17,.17,.055,x,yy,z,palette.gold,parent);
  for(let i=-1;i<=1;i++)bar([x+i*.045,y-.32,z],[x+i*.045,y-.70,z],.012,0xc99144,parent);
}
for(const x of [-4.8,-2.6,2.6,4.8])lantern(x,5.72,.33,gate);

// Gatehouse, tidy white lane dividers and the small yellow/red traffic drums.
const booth=group(-6.9,.12,-3.8,daily);booth.name='侧边值守岗亭';
box(1.18,1.0,1.6,0,.5,0,0xd5d4bf,booth,true);
box(1.08,.8,1.46,0,1.4,0,0x91a8a2,booth);
for(const x of [-.51,.51])for(const z of [-.69,.69])box(.055,.86,.055,x,1.43,z,0xe4e1cb,booth);
box(1.38,.17,1.88,0,1.91,0,0x567266,booth,true);
box(.75,.05,.06,0,.99,.82,0xb3bda6,booth);
function railing(x,z,len,rotation=0) {
  const g=group(x,.14,z,daily,rotation);
  for(const y of [.14,.70])box(.045,.045,len,0,y,0,palette.white,g);
  for(let zz=-len/2;zz<=len/2+.01;zz+=.27)box(.035,.58,.035,0,.42,zz,palette.white,g);
  for(const zz of [-len/2,len/2]){box(.07,.83,.07,0,.41,zz,palette.metal,g);box(.3,.07,.28,0,.035,zz,palette.stoneShade,g);}
  return g;
}
// A narrow central fence separates the vehicle directions and stops before the crossing.
const centerFence=railing(0,-4.6,25.2);
centerFence.name='车辆进出中央隔离栅栏';
for(let i=1;i<7;i++){
  const z=-12.6+i*3.6;
  box(.07,.83,.07,0,.41,z,palette.metal,centerFence);
  box(.3,.07,.28,0,.035,z,palette.stoneShade,centerFence);
}
faceRecognitionLane(-5.35,2.15);faceRecognitionLane(5.35,2.15);
for(const side of [-1,1]){
  // Pedestrian queues stay beside the road, leaving its full central width open.
  railing(side*4.6,4.9,7.3);
  railing(side*6.35,5.95,5.2);
  railing(side*6.325,2.15,.35,Math.PI/2);
  railing(side*6.5,1.7,.9);
}
function trafficDrum(x,z){
  const g=group(x,.13,z,daily);cylinder(.24,.29,.62,0,.31,0,0xd3a342,g);
  cylinder(.25,.26,.40,0,.35,0,0xefedce,g);
  for(let i=0;i<8;i++)for(let j=0;j<2;j++)if((i+j)%2===0){
    const a=i*Math.PI/4,m=box(.13,.17,.018,Math.sin(a)*.255,.24+j*.18,Math.cos(a)*.255,palette.red,g);m.rotation.y=a;
  }
  cylinder(.27,.25,.09,0,.66,0,0xe2b547,g);
}
for(const x of [-4.6,4.6])trafficDrum(x,8.75);
trafficDrum(0,8.4);

// Raised planted islands frame the opening; no trees obscure the name.
function bed(x,z,w,d) {
  roundedBox(w,.28,d,.09,x,.26,z,0xc1c8af,landscape);
  box(w-.24,.11,d-.24,x,.43,z,0xa9bd82,landscape);
}
bed(-12.1,4.75,8.5,3);bed(12.1,4.75,8.5,3);
bed(-12.4,-6.2,9.2,5.4);bed(12.4,-6.2,9.2,5.4);
bed(-12.4,-13.9,9.2,9);bed(12.4,-13.9,9.2,9);
bed(-6.65,-14.8,1.7,7.5);bed(6.65,-14.8,1.7,7.5);
function tree(x,z,size=1) {
  const g=group(x,.48,z,landscape);g.scale.setScalar(size);
  cylinder(.16,.25,3.4,0,1.7,0,0x8e8b69,g,9);
  for(const s of [-1,1])bar([0,2.5,0],[s*.8,3.5,.15],.1,0x8e8b69,g);
  const colors=[0x6d966b,0x799e6f,0x88ad75,0x96b77e,0x63885f];
  for(let i=0;i<11;i++){
    const angle=i*2.3999,r=i===0?0:1.25*Math.sqrt(i/11);
    const xx=Math.cos(angle)*r,zz=Math.sin(angle)*r;
    sphere(.95+random()*.25,xx,3.45+random()*.85,zz,colors[i%colors.length],g,1.1,.86,1);
  }
  contact(x,z,5*size,4*size,.49);
}
function palm(x,z,height=7.4,phase=0) {
  const g=group(x,.48,z,landscape,phase);
  const curve=[[0,0,0],[.15,height*.38,.1],[.12,height*.76,.18],[0,height,.18]];
  tube(curve,.14,0x999577,g,20);
  for(let y=.4;y<height;y+=.36){const r=cylinder(.155,.155,.036,.1,y,.1,0xaca389,g,10);r.castShadow=false;}
  const leafGeo=[];
  for(let k=0;k<9;k++){
    const a=k*Math.PI*2/9,r=2.35+random()*.35,tipY=height-.85-random()*.45;
    const pts=[[0,height,.18],[Math.cos(a)*r*.38,height+.53,.18+Math.sin(a)*r*.38],[Math.cos(a)*r*.8,height+.08,.18+Math.sin(a)*r*.8],[Math.cos(a)*r,tipY,.18+Math.sin(a)*r]];
    tube(pts,.026,0x68835d,g,15);
    const c=new THREE.CatmullRomCurve3(pts.map(p=>new THREE.Vector3(...p)));
    for(let j=1;j<11;j++){
      const t=j/11,p=c.getPoint(t),len=.63*Math.sin(t*Math.PI)+.10;
      for(const side of [-1,1]){
        const end=p.clone().add(new THREE.Vector3(Math.cos(a+side*1.35)*len,-.20-t*.19,Math.sin(a+side*1.35)*len));
        const forward=p.clone().add(new THREE.Vector3(Math.cos(a)*.22,.02,Math.sin(a)*.22));
        const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute([...p.toArray(),...end.toArray(),...forward.toArray()],3));geom.computeVertexNormals();leafGeo.push(geom);
      }
    }
  }
  const leafMat=new THREE.MeshToonMaterial({color:0x608d64,gradientMap:ramp,side:THREE.DoubleSide});
  mesh(mergeGeometries(leafGeo),leafMat,g);
  for(let k=0;k<3;k++)sphere(.16,Math.cos(k*2.1)*.19,height-.12,.18+Math.sin(k*2.1)*.19,0xa89b65,g);
  contact(x,z,3.7,3.7,.49);
}
tree(-15.1,-6.3,1.06);tree(-9.9,-7.0,1.0);tree(15,-6.0,1.1);tree(9.6,-6.9,.92);
tree(-16.2,-15.8,.82);tree(16.2,-15.8,.80);
tree(-6.5,-13.5,.61);tree(6.5,-13.5,.61);tree(-6.5,-17.2,.66);tree(6.5,-17.2,.65);
palm(-14.6,4.4,7.7,.2);palm(14.6,4.4,7.9,.8);
palm(-15.9,-2.4,6.8,1.2);palm(15.9,-2.4,6.9,.4);
for(const side of [-1,1]){
  for(let i=0;i<11;i++){
    const x=side*(8.7+i*.6),z=5.5+Math.sin(i)*.15;
    sphere(.44,x,.79,z, i%3===0?0x92ae70:0x76975f,landscape,1,.82,.85);
    if(i%2===0)for(let k=0;k<3;k++)sphere(.085,x+(random()-.5)*.5,1.03+random()*.12,z+(random()-.5)*.4,[0xe2c077,0xd39379,0xe8dcc1][k],landscape);
  }
}
// Small frangipani beds and the gate's globe lamps.
function lamp(x,z){
  const g=group(x,.12,z,daily);
  cylinder(.18,.25,.2,0,.1,0,palette.stoneShade,g);
  cylinder(.055,.09,2.8,0,1.5,0,palette.timber,g);
  for(const s of [-1,1]){
    tube([[0,2.1,0],[s*.3,2.4,0],[s*.46,2.35,0]],.045,palette.timber,g,12);
    sphere(.19,s*.46,2.52,0,0xf2ecd4,g,1,1.2,1);
  }
  sphere(.22,0,3.02,0,0xf5eed6,g,1,1.2,1);
}
lamp(-15.9,2.3);lamp(15.9,2.3);lamp(-6.2,-9);lamp(6.2,-9);
function bench(x,z,rotation=0){
  const g=group(x,.12,z,daily,rotation);
  for(let i=0;i<4;i++)box(1.5,.07,.095,0,.48,-.16+i*.12,0xb89c74,g);
  for(const xx of [-.55,.55]){box(.07,.5,.45,xx,.25,0,palette.metal,g);bar([xx,.5,-.2],[xx,.98,-.3],.035,palette.metal,g);}
  for(let y=.69;y<1;y+=.14)box(1.5,.095,.055,0,y,-.27,0xb89c74,g);
}
bench(-9.2,7.9,Math.PI);bench(11.8,7.9,Math.PI);
for(const x of [-17.2,17.2]){roundedBox(.5,.85,.5,.04,x,.55,7.9,0x73978a,daily);box(.54,.07,.54,x,1.02,7.9,0x4d6e62,daily);}

// Bicycles are built from tubular frames, spokes and small saddles.
function bicycle(x,z,color,rotation=0) {
  const g=group(x,.14,z,daily,rotation);
  for(const xx of [-.5,.5]){
    const tire=mesh(new THREE.TorusGeometry(.30,.036,6,20),0x4f645c,g);tire.position.set(xx,.33,0);
    const rim=mesh(new THREE.TorusGeometry(.265,.012,4,18),0xc1cab9,g);rim.position.set(xx,.33,0);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;bar([xx,.33,0],[xx+Math.cos(a)*.26,.33+Math.sin(a)*.26,0],.007,0xb9c7b8,g);}
  }
  for(const [a,b] of [
    [[-.5,.33,0],[-.15,.8,0]],[[-.15,.8,0],[.03,.33,0]],[[.03,.33,0],[-.5,.33,0]],
    [[-.15,.8,0],[.4,.75,0]],[[.4,.75,0],[.03,.33,0]],[[.4,.75,0],[.5,.33,0]]
  ])bar(a,b,.024,color,g);
  bar([-.15,.78,0],[-.19,.94,0],.021,palette.metal,g);roundedBox(.26,.055,.16,.015,-.2,.97,0,0x725e48,g);
  bar([.4,.74,0],[.36,1.01,0],.018,palette.metal,g);bar([.36,1.01,-.16],[.36,1.01,.16],.02,0x466457,g);
  bar([.03,.33,-.10],[.03,.33,.10],.018,palette.metal,g);box(.14,.03,.06,.03,.33,.13,palette.ink,g);
  bar([-.1,.4,0],[-.2,.01,.17],.015,palette.metal,g);
}
for(let i=0;i<4;i++)bicycle(-16.1+i*.74,7.9,[0xb8ad74,0x659383,0xca8967,0x8a9bb3][i],Math.PI/2+.15);
function scooter(x,z,color,rotation=0){
  const g=group(x,.14,z,daily,rotation);
  for(const xx of [-.44,.44]){const t=mesh(new THREE.TorusGeometry(.22,.055,6,18),palette.ink,g);t.position.set(xx,.23,0);}
  roundedBox(.76,.36,.36,.08,-.18,.48,0,color,g);
  roundedBox(.55,.09,.34,.03,-.22,.72,0,0x5e6c5c,g);
  box(.15,.64,.26,.35,.59,0,color,g);bar([.35,.68,0],[.32,1.05,0],.027,palette.metal,g);
  bar([.32,1.05,-.22],[.32,1.05,.22],.025,palette.metal,g);
  sphere(.08,.44,.82,0,0xf3e6be,g,.3,1,1);
  bar([-.1,.45,0],[-.18,.01,.2],.023,palette.metal,g);
}
scooter(16.3,7.9,0xc49a74,Math.PI/2);scooter(15.1,7.9,0x87aaa3,Math.PI/2);

// Whole-scene orbit: orthographic projection keeps the collectible-model feel.
const initialView={radius:61,elevation:40*Math.PI/180,azimuth:30*Math.PI/180,zoom:1};
const controls=createOrbitController({THREE,camera,element:canvas,target:new THREE.Vector3(0,2.6,0),...initialView});
let needsRender=true;
function resize(){
  const w=innerWidth,h=innerHeight,aspect=w/h;
  const span=Math.max(58.5,60/aspect);
  camera.left=-span*aspect/2;camera.right=span*aspect/2;
  camera.top=span/2;camera.bottom=-span/2;camera.updateProjectionMatrix();
  renderer.setSize(w,h);controls.resize(w,h);needsRender=true;
}
resize();window.addEventListener('resize',resize);
renderer.shadowMap.needsUpdate=true;
let lastTime=performance.now(),firstFrame=true;
function animate(time){
  const dt=Math.min((time-lastTime)/1000,.05);lastTime=time;
  const moved=controls.update(dt);
  if(moved||needsRender||firstFrame){
    renderer.render(scene,camera);needsRender=false;
    if(firstFrame){firstFrame=false;document.documentElement.dataset.sceneReady='true';}
  }
  requestAnimationFrame(animate);
}
document.addEventListener('visibilitychange',()=>{lastTime=performance.now();needsRender=true;});
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();document.documentElement.dataset.sceneReady='false';});
canvas.addEventListener('webglcontextrestored',()=>{renderer.shadowMap.needsUpdate=true;needsRender=true;firstFrame=true;});
window.campusScene=Object.freeze({getView:()=>controls.getState(),resetView:()=>{controls.setState(initialView);needsRender=true;}});
requestAnimationFrame(animate);
