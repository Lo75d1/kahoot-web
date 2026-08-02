import React from "react";
import {AbsoluteFill, Audio, Img, Sequence, interpolate, staticFile, useCurrentFrame} from "remotion";

const C = {green:"#018f41", dark:"#071b16", cream:"#f3efdf", orange:"#f58220", lime:"#d7f37b"};
const SHOTS = {
  intro:{from:0,duration:150}, sample:{from:150,duration:210}, prompt:{from:360,duration:210},
  gemini:{from:570,duration:240}, json:{from:810,duration:210}, import:{from:1020,duration:240},
  review:{from:1260,duration:210}, errors:{from:1470,duration:210}, outro:{from:1680,duration:120},
};
const fade = (f:number,d:number) => interpolate(f,[0,18,d-18,d],[0,1,1,0],{extrapolateLeft:"clamp",extrapolateRight:"clamp"});

const Shell:React.FC<React.PropsWithChildren<{step?:string,title:string,subtitle?:string,duration:number}>>=({step,title,subtitle,duration,children})=>{
  const f=useCurrentFrame(); const y=interpolate(f,[0,32],[34,0],{extrapolateRight:"clamp"});
  return <AbsoluteFill style={{background:`radial-gradient(circle at 85% 15%, #0d9f51 0, ${C.green} 28%, ${C.dark} 100%)`,color:"white",fontFamily:"Arial,'Segoe UI',sans-serif",opacity:fade(f,duration)}}>
    <div style={{position:"absolute",left:110,top:72,right:110,display:"flex",alignItems:"center",justifyContent:"space-between"}}><b style={{fontSize:32,letterSpacing:2}}>UDA ASSESSMENT HUB</b><span style={{fontSize:30,color:C.lime}}>HƯỚNG DẪN GEMINI TỪ A–Z</span></div>
    <div style={{position:"absolute",left:110,top:158,right:110,transform:`translateY(${y}px)`}}>{step&&<div style={{display:"inline-block",background:C.orange,borderRadius:999,padding:"11px 20px",fontSize:30,fontWeight:800}}>{step}</div>}<h1 style={{fontSize:58,lineHeight:1.12,margin:"22px 0 8px",maxWidth:1500,fontWeight:800}}>{title}</h1>{subtitle&&<p style={{fontSize:32,lineHeight:1.4,color:"#dcebe4",margin:0,maxWidth:1500}}>{subtitle}</p>}</div>
    <div style={{position:"absolute",left:110,right:110,top:350,bottom:80}}>{children}</div>
  </AbsoluteFill>;
};

const BrowserFrame:React.FC<React.PropsWithChildren<{url:string}>>=({url,children})=><div style={{height:"100%",background:"white",borderRadius:28,overflow:"hidden",boxShadow:"0 28px 80px #001b104f",border:"1px solid #ffffff66"}}><div style={{height:62,background:"#edf2ef",display:"flex",alignItems:"center",gap:12,padding:"0 22px"}}><i style={{width:16,height:16,borderRadius:99,background:"#fb786d"}}/><i style={{width:16,height:16,borderRadius:99,background:"#f6c65b"}}/><i style={{width:16,height:16,borderRadius:99,background:"#62c875"}}/><div style={{marginLeft:18,background:"white",borderRadius:14,padding:"7px 20px",fontSize:30,color:"#4b5b53",flex:1}}>{url}</div></div><div style={{height:"calc(100% - 62px)"}}>{children}</div></div>;
const Intro=()=> <Shell title="Từ tài liệu đến bộ đề trong vài phút" subtitle="Gemini phân tích · UDA chạy code nhập đề · Giảng viên kiểm tra trước khi lưu" duration={SHOTS.intro.duration}><div style={{marginTop:85,display:"flex",gap:28}}>{["1. Tải đề mẫu","2. Hỏi Gemini","3. Dán JSON","4. Duyệt & lưu"].map((x,i)=><div key={x} style={{flex:1,background:"#ffffffed",color:C.dark,borderRadius:28,padding:"38px 30px",fontSize:30,fontWeight:800,borderTop:`9px solid ${i===2?C.orange:C.lime}`}}>{x}</div>)}</div></Shell>;

const Sample=()=>{const f=useCurrentFrame();const scale=interpolate(f,[0,180],[1,1.025],{extrapolateRight:"clamp"});return <Shell step="BƯỚC 1" title="Mở UDA Assessment Hub và lấy đề mẫu" subtitle="Trong khung nhập đề, tải file nguồn hoặc JSON mẫu để thử trước." duration={SHOTS.sample.duration}><BrowserFrame url="kahoot-web-pi.vercel.app"><div style={{height:"100%",overflow:"hidden",position:"relative"}}><Img src={staticFile("screens/uda-tall.png")} style={{position:"absolute",left:0,top:-500,width:"100%",height:"auto",transform:`scale(${scale})`}}/><div style={{position:"absolute",left:770,top:265,width:335,height:70,border:`7px solid ${C.orange}`,borderRadius:18}}/></div></BrowserFrame><div style={{position:"absolute",right:45,bottom:24,background:C.orange,borderRadius:20,padding:"18px 26px",fontSize:30,fontWeight:800,boxShadow:"0 12px 36px #0004"}}>↓ Tải đề mẫu / JSON mẫu</div></Shell>};

const Prompt=()=> <Shell step="BƯỚC 2" title="Nhấn “Copy prompt cho Gemini”" subtitle="Prompt đã yêu cầu đúng cấu trúc để code của hệ thống có thể đọc." duration={SHOTS.prompt.duration}><BrowserFrame url="kahoot-web-pi.vercel.app"><div style={{height:"100%",overflow:"hidden",position:"relative"}}><Img src={staticFile("screens/uda-tall.png")} style={{position:"absolute",left:0,top:-500,width:"100%",height:"auto"}}/><div style={{position:"absolute",left:770,top:85,width:340,height:64,border:`7px solid ${C.orange}`,borderRadius:18,boxShadow:"0 0 0 999px #00150b55"}}/><div style={{position:"absolute",right:75,top:200,background:C.orange,borderRadius:18,padding:"18px 26px",fontSize:30,fontWeight:800}}>Bấm nút số 1 để copy prompt</div></div></BrowserFrame></Shell>;

const Gemini=()=>{const f=useCurrentFrame();const lines=["Đọc tài liệu đính kèm.","Phân tích từng câu và đáp án.","Chỉ trả JSON hợp lệ, không giải thích."];return <Shell step="BƯỚC 3" title="Dán prompt vào Gemini và gửi kèm tài liệu" subtitle="Đợi Gemini xử lý xong rồi kiểm tra nhanh tiêu đề, số câu và loại câu." duration={SHOTS.gemini.duration}><BrowserFrame url="gemini.google.com"><div style={{background:"#f8faf9",height:"100%",padding:"34px 110px",color:C.dark}}><div style={{fontSize:30,fontWeight:800,color:C.green}}>Gemini</div><div style={{marginTop:28,marginLeft:"auto",width:"78%",background:"#e5f3ea",borderRadius:"24px 24px 6px 24px",padding:30,fontSize:30,lineHeight:1.65}}>{lines.map((x,i)=><div key={x} style={{opacity:interpolate(f,[24+i*28,42+i*28],[0,1],{extrapolateLeft:"clamp",extrapolateRight:"clamp"})}}>✓ {x}</div>)}</div><div style={{marginTop:28,border:"2px dashed #97b8a6",borderRadius:20,padding:22,fontSize:30}}>📎 de-mau-gemini.txt</div></div></BrowserFrame></Shell>};

const Json=()=> <Shell step="BƯỚC 4" title="Copy đúng phần JSON Gemini trả về" subtitle="Bắt đầu từ dấu { đầu tiên và kết thúc ở dấu } cuối cùng." duration={SHOTS.json.duration}><div style={{background:"#0c1914",borderRadius:30,padding:"34px 44px",height:"100%",boxSizing:"border-box",fontFamily:"Consolas,monospace",fontSize:30,lineHeight:1.5,color:"#d7f37b",boxShadow:"0 24px 70px #0005"}}><span style={{color:"#75d9a0"}}>{`{`}</span><br/>&nbsp;&nbsp;{`"title": "Kỹ năng sử dụng AI có trách nhiệm",`}<br/>&nbsp;&nbsp;{`"questions": [`}<br/>&nbsp;&nbsp;&nbsp;&nbsp;{`{ "type": "single_choice", ... }`},<br/>&nbsp;&nbsp;&nbsp;&nbsp;{`{ "type": "essay", "answers": [], "hintDelaySeconds": 30 }`}<br/>&nbsp;&nbsp;]<br/><span style={{color:"#75d9a0"}}>{`}`}</span><div style={{position:"absolute",right:40,bottom:35,background:C.orange,color:"white",borderRadius:16,padding:"14px 22px",fontFamily:"inherit",fontWeight:800}}>Ctrl + C</div></div></Shell>;

const Import=()=> <Shell step="BƯỚC 5" title="Dán JSON và chạy code nhập đề" subtitle="Quay lại website: dán vào ô số 2, sau đó nhấn nút màu cam số 3." duration={SHOTS.import.duration}><BrowserFrame url="kahoot-web-pi.vercel.app"><div style={{height:"100%",overflow:"hidden",position:"relative"}}><Img src={staticFile("screens/uda-tall.png")} style={{position:"absolute",left:0,top:-500,width:"100%",height:"auto"}}/><div style={{position:"absolute",left:770,top:150,width:340,height:92,border:`7px solid ${C.orange}`,borderRadius:18,boxShadow:"0 0 0 999px #00150b55"}}/><div style={{position:"absolute",left:770,top:365,width:340,height:58,border:`7px solid ${C.orange}`,borderRadius:18}}/><div style={{position:"absolute",right:70,top:270,display:"flex",gap:18}}><span style={{background:"white",color:C.dark,padding:"17px 24px",borderRadius:16,fontSize:30,fontWeight:800}}>2. Dán JSON</span><span style={{background:C.orange,color:"white",padding:"17px 24px",borderRadius:16,fontSize:30,fontWeight:800}}>3. Chạy code</span></div></div></BrowserFrame></Shell>;

const Review=()=> <Shell step="BƯỚC 6" title="Duyệt trước khi lưu vào ngân hàng đề" subtitle="Kiểm tra đáp án, câu tự luận, gợi ý và thời gian; sau đó mới lưu." duration={SHOTS.review.duration}><div style={{background:"white",color:C.dark,borderRadius:30,padding:42,height:"100%",boxSizing:"border-box"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"start"}}><div><div style={{fontSize:34,fontWeight:800,color:C.green}}>✓ Đã nhận diện 4 câu</div><p style={{fontSize:30}}>Có 1 câu tự luận chờ giảng viên chấm</p></div><div style={{background:C.green,color:"white",padding:"18px 26px",borderRadius:16,fontSize:30,fontWeight:800}}>LƯU VÀO NGÂN HÀNG ĐỀ</div></div><div style={{marginTop:24,display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>{["Trắc nghiệm · Đáp án B","Đúng/Sai · Đúng","Tự luận · Gợi ý sau 30s","Điền khuyết · kiểm chứng"].map(x=><div key={x} style={{background:"#eff8f2",borderRadius:17,padding:22,fontSize:30,fontWeight:800}}>{x}</div>)}</div></div></Shell>;

const Errors=()=> <Shell step="NẾU CÓ LỖI" title="Ba cách sửa nhanh" subtitle="Không cần làm lại từ đầu." duration={SHOTS.errors.duration}><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:24,height:"100%"}}>{[["JSON có chữ thừa","Chỉ copy từ { đến }."],["Thiếu dấu hoặc sai cấu trúc","Bảo Gemini: “Sửa thành JSON hợp lệ, chỉ trả JSON”."],["Đáp án chưa chắc chắn","Mở Sửa và kiểm duyệt trước khi công bố."]].map(([a,b],i)=><div key={a} style={{background:i===2?"#fff3e8":"white",color:C.dark,borderRadius:26,padding:34,borderTop:`9px solid ${i===2?C.orange:C.lime}`}}><div style={{fontSize:31,fontWeight:800}}>{a}</div><p style={{fontSize:30,lineHeight:1.5}}>{b}</p></div>)}</div></Shell>;

const Outro=()=> <Shell title="Hoàn tất: Gemini phân tích, hệ thống chạy code" subtitle="Tải đề mẫu ngay trên UDA Assessment Hub · Luôn kiểm duyệt trước khi cho sinh viên làm bài." duration={SHOTS.outro.duration}><div style={{marginTop:72,background:"white",color:C.green,borderRadius:26,padding:"34px 42px",fontSize:35,fontWeight:800,textAlign:"center"}}>kahoot-web-pi.vercel.app</div></Shell>;

const SFX=[
  {label:"Mở trang thật",from:SHOTS.sample.from,src:"transition-soft.mp3",volume:.26,duration:45},
  {label:"Khoanh nút copy prompt",from:SHOTS.prompt.from+22,src:"whoosh-fast.mp3",volume:.22,duration:55},
  {label:"Prompt xuất hiện trong Gemini",from:SHOTS.gemini.from+28,src:"keyboard.mp3",volume:.18,duration:96},
  {label:"JSON được trả về",from:SHOTS.json.from+20,src:"transition-soft.mp3",volume:.25,duration:45},
  {label:"Khoanh ô dán và nút chạy code",from:SHOTS.import.from+28,src:"whoosh-fast.mp3",volume:.22,duration:55},
  {label:"Bản xem trước được xác nhận",from:SHOTS.review.from+28,src:"impact-cine.mp3",volume:.18,duration:70},
  {label:"URL hoàn tất",from:SHOTS.outro.from+10,src:"sparkle.mp3",volume:.2,duration:100},
];

export const Tutorial:React.FC=()=> <AbsoluteFill style={{background:C.dark}}>
  <Sequence from={SHOTS.intro.from} durationInFrames={SHOTS.intro.duration}><Intro/></Sequence>
  <Sequence from={SHOTS.sample.from} durationInFrames={SHOTS.sample.duration}><Sample/></Sequence>
  <Sequence from={SHOTS.prompt.from} durationInFrames={SHOTS.prompt.duration}><Prompt/></Sequence>
  <Sequence from={SHOTS.gemini.from} durationInFrames={SHOTS.gemini.duration}><Gemini/></Sequence>
  <Sequence from={SHOTS.json.from} durationInFrames={SHOTS.json.duration}><Json/></Sequence>
  <Sequence from={SHOTS.import.from} durationInFrames={SHOTS.import.duration}><Import/></Sequence>
  <Sequence from={SHOTS.review.from} durationInFrames={SHOTS.review.duration}><Review/></Sequence>
  <Sequence from={SHOTS.errors.from} durationInFrames={SHOTS.errors.duration}><Errors/></Sequence>
  <Sequence from={SHOTS.outro.from} durationInFrames={SHOTS.outro.duration}><Outro/></Sequence>
  {SFX.map((s,i)=><Sequence key={i} from={s.from} durationInFrames={s.duration}><Audio src={staticFile(`audio/${s.src}`)} volume={s.volume}/></Sequence>)}
</AbsoluteFill>;


