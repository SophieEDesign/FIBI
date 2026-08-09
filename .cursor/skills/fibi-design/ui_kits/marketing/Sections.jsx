const {Button,Logo,Card,Icon,Badge}=window.FIBIDesignSystem_383abe;
const IMG="https://www.fibi.world/";
function Shot({src,alt,ratio="16 / 10",radius="var(--radius-2xl)",style}){
  const [bad,setBad]=React.useState(false);
  return <div style={{aspectRatio:ratio,borderRadius:radius,overflow:"hidden",background:"var(--gradient-brand-soft)",boxShadow:"var(--shadow-xl)",display:"grid",placeItems:"center",...style}}>
    {bad?<span style={{font:"var(--type-caption)",color:"var(--text-tertiary)"}}>{src}</span>:
    <img src={IMG+src} alt={alt} onError={()=>setBad(true)} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>}
  </div>;
}
function Section({id,children,style}){return <section id={id} style={{padding:"var(--space-13) var(--gutter-desktop)",...style}}><div style={{maxWidth:"var(--container-max)",margin:"0 auto"}}>{children}</div></section>}
function Eyebrow({children}){return <p style={{font:"var(--type-caption)",fontWeight:"var(--fw-medium)",letterSpacing:"var(--ls-caps)",textTransform:"uppercase",color:"var(--text-tertiary)",margin:"0 0 var(--space-5)"}}>{children}</p>}

function SiteHeader({onSignin}){
  return <header style={{position:"sticky",top:0,zIndex:30,background:"var(--surface-glass)",backdropFilter:"var(--blur-glass)",WebkitBackdropFilter:"var(--blur-glass)",borderBottom:"1px solid var(--border-subtle)"}}>
    <div style={{maxWidth:"var(--container-max)",margin:"0 auto",padding:"0 var(--gutter-desktop)",height:68,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <a href="#top" style={{display:"flex",alignItems:"center",gap:10}}><Logo variant="mark" height={30}/><span style={{font:"var(--fw-semibold) 20px/1 var(--font-sans)",letterSpacing:"var(--ls-tight)",color:"var(--text-primary)"}}>FiBi</span></a>
      <Button variant="secondary" size="sm" onClick={onSignin}>Sign in</Button>
    </div></header>;
}

function Hero({onStart}){
  return <div id="top" style={{position:"relative",background:"var(--bg-page)",overflow:"hidden"}}>
    <div style={{position:"absolute",inset:0,background:"var(--wash-aurora)",pointerEvents:"none"}}/>
    <div style={{position:"relative",maxWidth:"var(--container-max)",margin:"0 auto",padding:"var(--space-13) var(--gutter-desktop) var(--space-12)",display:"grid",gridTemplateColumns:"1.05fr .95fr",gap:"var(--space-12)",alignItems:"center"}}>
      <div>
        <h1 style={{font:"var(--type-display)",letterSpacing:"var(--ls-tighter)",margin:0,textWrap:"balance"}}>Organise your travel inspiration.</h1>
        <p style={{font:"var(--fw-medium) 22px/1.35 var(--font-sans)",letterSpacing:"var(--ls-tight)",color:"var(--text-secondary)",margin:"var(--space-6) 0 0"}}>Beautifully. Simply. Calmly.</p>
        <p style={{font:"var(--type-body-lg)",color:"var(--text-secondary)",margin:"var(--space-6) 0 0",maxWidth:440,textWrap:"pretty"}}>Share from TikTok, Instagram, or any app. We help you keep it organised.</p>
        <div style={{display:"flex",alignItems:"center",gap:"var(--space-6)",marginTop:"var(--space-9)"}}>
          <Button variant="gradient" size="lg" onClick={onStart}>Get started</Button>
          <span style={{display:"inline-flex",alignItems:"center",gap:8,font:"var(--type-label)",color:"var(--text-tertiary)"}}><Icon name="smartphone" size={16}/>Install Fibi to share in one tap</span>
        </div>
      </div>
      <Shot src="hero-image.png" alt="FiBi - Save Your Travel Places" ratio="4 / 5"/>
    </div>
  </div>;
}

function HowItWorks(){
  const steps=[{img:"1.png",t:"Save it",d:"Share a link to FiBi directly from any app or website."},{img:"2.png",t:"Make it yours",d:"Add a screenshot, name, and location to remember why you saved it."},{img:"3.png",t:"Find it later",d:"Everything is organized in one calm, algorithm-free place for easy access."}];
  return <Section style={{background:"var(--bg-subtle)"}}>
    <h2 style={{font:"var(--type-h2)",letterSpacing:"var(--ls-tight)",margin:"0 0 var(--space-10)"}}>How it works</h2>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"var(--space-8)"}}>
      {steps.map((s,i)=><Card key={s.t} padding="var(--space-6)" elevation="sm">
        <Shot src={s.img} alt={s.t} ratio="4 / 3" radius="var(--radius-lg)" style={{boxShadow:"none"}}/>
        <h3 style={{font:"var(--type-h3)",letterSpacing:"var(--ls-tight)",margin:"var(--space-6) 0 var(--space-3)"}}>{s.t}</h3>
        <p style={{font:"var(--type-body)",color:"var(--text-secondary)",margin:0,textWrap:"pretty"}}>{s.d}</p>
      </Card>)}
    </div></Section>;
}

function ShareSteps(){
  const steps=[
    {t:"Find something to save",d:"Open TikTok, Instagram, YouTube, or any app with a post or video about a place you want to save.",chips:["TikTok","Instagram","YouTube"]},
    {t:"Tap the Share button",d:"Look for the share icon (usually → or \"Share\") on the post or video you want to save.",tip:["💡 Tip:","On TikTok, it's the arrow icon in the bottom right. On Instagram, tap the three dots menu → Share."]},
    {t:"Select Fibi from Share Sheet",d:"Fibi will appear alongside other apps like Messages, WhatsApp, and more. Tap the Fibi icon.",tip:["📱 Important:","Make sure you've installed Fibi as an app first. If you don't see Fibi, install it from your browser menu."]},
    {t:"Review and save",d:"Fibi automatically pulls through a visual preview with the title and description. Add your own screenshot or location details if you want, then save!",tip:["✨ Auto-preview:","No need to copy and paste — everything is pulled through automatically!"]}];
  return <Section>
    <Eyebrow>How to share from your phone</Eyebrow>
    <h2 style={{font:"var(--type-h2)",letterSpacing:"var(--ls-tight)",margin:"0 0 var(--space-4)",maxWidth:640,textWrap:"balance"}}>Save places directly from TikTok, Instagram, and other apps — no copy-paste needed!</h2>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"var(--space-8)",marginTop:"var(--space-10)"}}>
      {steps.map((s,i)=><div key={s.t} style={{display:"flex",gap:"var(--space-6)"}}>
        <span style={{flex:"0 0 40px",height:40,borderRadius:"var(--radius-circle)",background:"var(--gradient-sky)",color:"#fff",display:"grid",placeItems:"center",font:"var(--fw-semibold) 16px/1 var(--font-sans)"}}>{i+1}</span>
        <div>
          <h3 style={{font:"var(--type-h4)",margin:"8px 0 var(--space-3)"}}>{s.t}</h3>
          <p style={{font:"var(--type-body)",color:"var(--text-secondary)",margin:0,textWrap:"pretty"}}>{s.d}</p>
          {s.chips&&<div style={{display:"flex",gap:8,marginTop:"var(--space-5)"}}>{s.chips.map(c=><Badge key={c} tone="neutral">{c}</Badge>)}</div>}
          {s.tip&&<div style={{marginTop:"var(--space-5)",background:"var(--bg-subtle)",border:"1px solid var(--border-subtle)",borderRadius:"var(--radius-lg)",padding:"var(--space-5) var(--space-6)"}}>
            <span style={{font:"var(--type-label)",color:"var(--text-primary)"}}>{s.tip[0]}</span>
            <p style={{font:"var(--type-body)",color:"var(--text-secondary)",margin:"4px 0 0"}}>{s.tip[1]}</p></div>}
        </div></div>)}
    </div></Section>;
}

function WhyFibi(){
  const items=[{i:"link-2",t:"No more lost links",d:"That restaurant you saw on Instagram? That beach from TikTok? Save it before it disappears from your feed."},
    {i:"image",t:"Your context, your way",d:"Add screenshots and locations so you remember why you saved it and where it is."},
    {i:"wind",t:"Calm and organised",d:"No algorithms, no noise. Just your saved places, organised how you want them."}];
  return <Section style={{background:"var(--indigo-900)",color:"#F2F3F8"}}>
    <h2 style={{font:"var(--type-h2)",letterSpacing:"var(--ls-tight)",margin:"0 0 var(--space-10)",color:"#fff"}}>Why Fibi?</h2>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"var(--space-8)"}}>
      {items.map(x=><div key={x.t}>
        <span style={{width:44,height:44,borderRadius:"var(--radius-md)",background:"rgba(255,255,255,.08)",border:"1px solid var(--indigo-700)",display:"grid",placeItems:"center",color:"var(--sky-300)"}}><Icon name={x.i} size={20}/></span>
        <h3 style={{font:"var(--type-h3)",letterSpacing:"var(--ls-tight)",margin:"var(--space-6) 0 var(--space-3)",color:"#fff"}}>{x.t}</h3>
        <p style={{font:"var(--type-body)",color:"#A9ADC4",margin:0,textWrap:"pretty"}}>{x.d}</p></div>)}
    </div>
    <p style={{font:"var(--type-body-lg)",color:"#A9ADC4",margin:"var(--space-11) 0 0",maxWidth:620,textWrap:"pretty"}}>Share from TikTok, Instagram, or any app. Fibi automatically pulls through a visual preview — or add your own.</p>
  </Section>;
}

function FinalCTA({onSignin}){
  return <Section style={{textAlign:"center"}}>
    <h2 style={{font:"var(--type-h1)",letterSpacing:"var(--ls-tighter)",margin:"0 0 var(--space-8)"}}>Ready to start saving?</h2>
    <div style={{display:"flex",gap:"var(--space-5)",justifyContent:"center",alignItems:"center"}}>
      <Button variant="gradient" size="lg" onClick={onSignin}>Sign in to start saving</Button>
      <Button variant="ghost" size="lg">Install the app</Button></div>
  </Section>;
}

function SiteFooter(){
  return <footer style={{borderTop:"1px solid var(--border-subtle)",padding:"var(--space-9) var(--gutter-desktop)"}}>
    <div style={{maxWidth:"var(--container-max)",margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",gap:"var(--space-8)",flexWrap:"wrap"}}>
      <span style={{font:"var(--type-caption)",color:"var(--text-tertiary)"}}>© 2026 Fibi. Save places before you lose them.</span>
      <nav style={{display:"flex",gap:"var(--space-7)",font:"var(--type-label)"}}>
        <a href="#">Privacy</a><a href="#">Terms</a><a href="#">Contact</a><a href="#">Sign in</a></nav>
    </div></footer>;
}
Object.assign(window,{Shot,Section,Eyebrow,SiteHeader,Hero,HowItWorks,ShareSteps,WhyFibi,FinalCTA,SiteFooter});
