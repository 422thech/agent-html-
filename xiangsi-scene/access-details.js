// Physical access-control details only; these models never access a camera.
function archSecurityFence(parent,r,arcY) {
  const fence=group(0,.02,.12,parent);
  fence.name='侧拱固定金属围栏';
  fence.userData={kind:'fixed-arch-fence',passable:false,openingRadius:r};
  const steel=0x8a9b91,bright=0xb9c4b8,foot=0x788a80;
  // A continuous curved frame fits the semicircular masonry opening.
  const frameRadius=r-.07;
  for(const x of [-frameRadius,frameRadius]){
    box(.095,arcY,.105,x,arcY/2,0,steel,fence);
    box(.21,.11,.21,x,.055,0,foot,fence);
  }
  for(let i=0;i<24;i++){
    const a=Math.PI*i/24,b=Math.PI*(i+1)/24;
    bar([Math.cos(a)*frameRadius,arcY+Math.sin(a)*frameRadius,0],
      [Math.cos(b)*frameRadius,arcY+Math.sin(b)*frameRadius,0],.048,steel,fence);
  }
  for(const y of [.22,1.00,arcY-.08])box(frameRadius*2,.07,.085,0,y,0,bright,fence);
  const count=13;
  for(let i=0;i<count;i++){
    const x=-frameRadius+.17+i*(2*frameRadius-.34)/(count-1);
    const top=arcY+Math.sqrt(Math.max(0,frameRadius*frameRadius-x*x))-.045;
    const spindle=box(.048,top-.20,.052,x,(top+.20)/2,0,steel,fence);
    spindle.name='连续固定栏杆';
    box(.083,.10,.083,x,.90,0,bright,fence);
  }
  // There is deliberately no hinge, opening leaf, or pedestrian gap.
  box(frameRadius*2+.05,.13,.16,0,.09,0,foot,fence);
  return fence;
}

function faceRecognitionLane(x,z,parent=daily) {
  const bank=group(x,.14,z,parent);
  bank.name='单通道人脸核验摆闸';
  bank.userData={kind:'face-recognition-turnstile-bank',laneCount:1,visualOnly:true};
  const steel=0xbec7bf,edge=0x80958c,dark=0x3d554e,top=0x60766e;
  const glass=new THREE.MeshToonMaterial({color:0x8bd4c2,gradientMap:ramp,
    transparent:true,opacity:.71,depthWrite:false,side:THREE.DoubleSide});
  // A small, neutral face outline is printed on the physical reader screen.
  const icon=document.createElement('canvas');icon.width=192;icon.height=256;
  const ctx=icon.getContext('2d');
  ctx.fillStyle='#142b2c';ctx.fillRect(0,0,192,256);
  ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#95d6c8';ctx.lineWidth=6;
  for(const sx of [-1,1])for(const sy of [-1,1]){
    const xx=96+sx*65,yy=117+sy*78;
    ctx.beginPath();ctx.moveTo(xx-sx*22,yy);ctx.lineTo(xx,yy);ctx.lineTo(xx,yy-sy*23);ctx.stroke();
  }
  ctx.strokeStyle='#c8e1d8';ctx.lineWidth=5;
  ctx.beginPath();ctx.ellipse(96,102,31,40,0,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(46,181);ctx.bezierCurveTo(50,137,142,137,146,181);ctx.stroke();
  ctx.fillStyle='#84cbb6';ctx.fillRect(66,218,60,5);
  const texture=new THREE.CanvasTexture(icon);texture.colorSpace=THREE.SRGBColorSpace;
  const screenMaterial=new THREE.MeshBasicMaterial({map:texture});
  function terminal(xx){
    const mount=group(xx,0,.61,bank);mount.name='人脸身份核验终端';
    mount.userData={kind:'face-recognition-terminal',visualOnly:true};
    cylinder(.065,.075,.31,0,1.19,0,edge,mount,10);
    roundedBox(.22,.035,.22,.012,0,1.045,0,steel,mount);
    const head=group(0,1.55,0,mount);head.rotation.x=-.13;
    roundedBox(.38,.53,.13,.025,0,0,0,dark,head);
    for(const side of [-1,1]){
      const panel=mesh(new THREE.PlaneGeometry(.29,.375),screenMaterial,head);
      panel.position.set(0,-.036,side*.094);if(side<0)panel.rotation.y=Math.PI;
      panel.castShadow=false;panel.receiveShadow=false;panel.name='实体终端屏幕';
      sphere(.026,0,.195,side*.094,0x142a2a,head,1,1,.40);
      sphere(.011,.103,.197,side*.096,0x9ce0b1,head,1,1,.35);
    }
  }
  for(const xx of [-.8,.8]){
    const unit=group(xx,0,0,bank);unit.name='金属摆闸机箱';
    roundedBox(.34,.96,1.86,.035,0,.53,0,steel,unit);
    roundedBox(.32,.06,1.84,.025,0,1.03,0,top,unit);
    box(.26,.10,1.70,0,.085,0,edge,unit);
    for(const side of [-1,1]){
      box(.235,.018,.014,0,.88,side*.942,edge,unit);
      box(.085,.035,.016,0,.95,side*.946,0x7cc9a4,unit);
    }
    if(xx===Math.sign(x)*.8)terminal(xx);
  }
  for(const center of [0]){
    const lane=group(center,0,0,bank);lane.name='封闭状态摆闸通道';
    lane.userData={kind:'pedestrian-swing-lane',closed:true};
    for(const direction of [-1,1]){
      const pivot=direction*.627;
      cylinder(.047,.047,.78,pivot,.55,0,edge,lane,10);
      // Two real translucent leaves meet in the middle of each walkway.
      const flap=roundedBox(.61,.67,.04,.024,direction*.317,.60,0,glass,lane);
      flap.name='半透明摆闸门翼';flap.castShadow=false;
      box(.61,.027,.045,direction*.317,.93,0,0xa5c7b8,lane);
      box(.032,.67,.045,direction*.015,.60,0,0xa5c7b8,lane);
    }
  }
  return bank;
}
