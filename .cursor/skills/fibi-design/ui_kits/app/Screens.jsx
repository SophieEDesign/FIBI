const {TopBar,TabBar,Tabs,SearchField,PlaceCard,CollectionTile,PinMarker,MapSurface,Button,IconButton,Icon,Logo,Tag,Badge,Card,EmptyState,Dialog,Toast,Field,Input,Textarea,Select,Switch}=window.FIBIDesignSystem_383abe;

const SEED=[
  {id:1,name:"Time Out Market",location:"Lisbon, Portugal",source:"tiktok",note:"Go early — the seafood counter gets busy.",tags:["Food","Lisbon"],saved:true,x:"24%",y:"32%",tone:"saved"},
  {id:2,name:"Praia da Ursa",location:"Sintra",source:"instagram",note:"Steep path down. Worth it at sunset.",tags:["Beach"],x:"58%",y:"56%",tone:"default"},
  {id:3,name:"Fábrica Coffee Roasters",location:"Chiado",source:"link",note:"",tags:["Coffee"],x:"40%",y:"72%",tone:"visited"},
  {id:4,name:"Miradouro da Senhora do Monte",location:"Graça",source:"youtube",note:"Best view over the city, free.",tags:["View"],x:"72%",y:"24%",tone:"default"}];

const Screen=({children,style})=><div style={{height:"100%",display:"flex",flexDirection:"column",background:"var(--bg-page)",...style}}>{children}</div>;
const Body=({children,style})=><div style={{flex:1,overflow:"auto",padding:"var(--space-6) var(--space-6) var(--space-10)",...style}}>{children}</div>;
const StatusSpacer=()=><div style={{height:54,flex:"0 0 auto"}}/>;
const SectionLabel=({children,right})=><div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",margin:"var(--space-8) 0 var(--space-5)"}}>
  <span style={{font:"var(--type-caption)",fontWeight:"var(--fw-medium)",letterSpacing:"var(--ls-caps)",textTransform:"uppercase",color:"var(--text-tertiary)"}}>{children}</span>{right}</div>;

function PlacesScreen({places,query,setQuery,onOpen,onAdd}){
  const list=places.filter(p=>(p.name+p.location).toLowerCase().includes(query.toLowerCase()));
  return <Screen>
    <StatusSpacer/>
    <TopBar left={<Logo variant="mark" height={26}/>} title="Your places"
      right={<IconButton icon={<Icon name="sliders-horizontal" size={19}/>} label="Filter"/>}/>
    <Body>
      <SearchField value={query} onChange={setQuery} onClear={()=>setQuery("")} placeholder="Search places"/>
      <SectionLabel right={<a href="#" style={{font:"var(--type-caption)"}}>See all</a>}>Collections</SectionLabel>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"var(--space-5)"}}>
        <CollectionTile name="Lisbon" count={12} tone="sky" style={{height:104}}/>
        <CollectionTile name="Weekend trips" count={5} tone="brand" style={{height:104}}/>
        <CollectionTile name="Coffee" count={9} tone="night" style={{height:104}}/>
        <CollectionTile name="Someday" count={23} tone="soft" style={{height:104}}/>
      </div>
      <SectionLabel right={<span style={{font:"var(--type-caption)",color:"var(--text-tertiary)"}}>{list.length}</span>}>Recently saved</SectionLabel>
      {list.length===0
        ? <EmptyState icon={<Icon name="map-pin" size={26}/>} title="Nothing here yet" description="Share a link from TikTok or Instagram and it lands here." action={<Button variant="secondary" size="sm" onClick={onAdd}>Add a place</Button>}/>
        : <div style={{display:"grid",gap:"var(--space-5)"}}>{list.map(p=><PlaceCard key={p.id} layout="row" {...p} onClick={()=>onOpen(p)}/>)}</div>}
    </Body></Screen>;
}

function MapScreen({places,onOpen}){
  const [active,setActive]=React.useState(places[0]);
  return <Screen>
    <MapSurface center={[38.7223,-9.1393]} zoom={13} cols={4} rows={5} style={{position:"absolute",inset:0}}>
      {places.map(p=><span key={p.id} onClick={()=>setActive(p)} style={{position:"absolute",left:p.x,top:p.y,cursor:"pointer"}}>
        <PinMarker tone={p.tone} active={active&&active.id===p.id} label={active&&active.id===p.id?p.name:undefined}/></span>)}
    </MapSurface>
    <div style={{position:"relative",display:"flex",flexDirection:"column",height:"100%",pointerEvents:"none"}}>
      <StatusSpacer/>
      <div style={{padding:"0 var(--space-6)",display:"flex",gap:"var(--space-4)",pointerEvents:"auto"}}>
        <SearchField placeholder="Search this area" style={{flex:1,boxShadow:"var(--shadow-md)",borderRadius:"var(--radius-pill)"}}/>
        <IconButton icon={<Icon name="layers" size={19}/>} label="Layers" variant="glass"/>
      </div>
      <div style={{flex:1}}/>
      {active&&<div style={{padding:"0 var(--space-6) var(--space-10)",pointerEvents:"auto"}}>
        <PlaceCard layout="row" {...active} onClick={()=>onOpen(active)} style={{boxShadow:"var(--shadow-lg)"}}/></div>}
    </div></Screen>;
}

function DetailScreen({place,onBack}){
  return <Screen>
    <div style={{position:"relative",height:280,flex:"0 0 auto",background:"var(--gradient-brand-soft)",display:"grid",placeItems:"center"}}>
      <Icon name="map-pin" size={40} color="var(--sky-500)"/>
      <span style={{position:"absolute",inset:0,background:"var(--scrim-top)"}}/>
      <div style={{position:"absolute",top:54,left:"var(--space-6)",right:"var(--space-6)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <IconButton icon={<Icon name="chevron-left" size={20}/>} label="Back" variant="glass" onClick={onBack}/>
        <div style={{display:"flex",gap:"var(--space-3)"}}>
          <IconButton icon={<Icon name="share" size={19}/>} label="Share" variant="glass"/>
          <IconButton icon={<Icon name="bookmark" size={19}/>} label="Save" variant="glass"/></div></div>
    </div>
    <Body style={{marginTop:-28,borderRadius:"var(--radius-sheet) var(--radius-sheet) 0 0",background:"var(--bg-page)",position:"relative"}}>
      <h2 style={{font:"var(--type-h2)",letterSpacing:"var(--ls-tight)",margin:"0 0 var(--space-3)"}}>{place.name}</h2>
      <div style={{display:"flex",alignItems:"center",gap:8,font:"var(--type-label)",color:"var(--text-secondary)"}}>
        <Icon name="map-pin" size={14}/>{place.location}<span style={{color:"var(--border-default)"}}>·</span>
        <Badge tone="info">From {place.source}</Badge></div>
      {place.note&&<Card tone="subtle" padding="var(--space-6)" style={{marginTop:"var(--space-7)"}}>
        <p style={{font:"var(--type-caption)",letterSpacing:"var(--ls-caps)",textTransform:"uppercase",color:"var(--text-tertiary)",margin:"0 0 6px"}}>Your note</p>
        <p style={{font:"var(--type-body)",margin:0,textWrap:"pretty"}}>{place.note}</p></Card>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:"var(--space-7)"}}>{(place.tags||[]).map(t=><Tag key={t}>{t}</Tag>)}<Tag interactive>+ Add tag</Tag></div>
      <div style={{display:"grid",gap:"var(--space-4)",marginTop:"var(--space-9)"}}>
        <Button fullWidth iconLeft={<Icon name="navigation" size={16}/>}>Open in Maps</Button>
        <Button variant="secondary" fullWidth iconLeft={<Icon name="folder-plus" size={16}/>}>Move to collection</Button></div>
    </Body></Screen>;
}

function YouScreen(){
  const [a,setA]=React.useState(true),[b,setB]=React.useState(false),[c,setC]=React.useState(true);
  return <Screen>
    <StatusSpacer/><TopBar title="You"/>
    <Body>
      <Card padding="var(--space-6)" style={{display:"flex",alignItems:"center",gap:"var(--space-6)"}}>
        <span style={{width:52,height:52,borderRadius:"50%",background:"var(--gradient-sky)",display:"grid",placeItems:"center",color:"#fff",font:"var(--fw-semibold) 18px/1 var(--font-sans)"}}>AM</span>
        <div><div style={{font:"var(--type-h4)"}}>Alex Moreira</div><div style={{font:"var(--type-caption)",color:"var(--text-tertiary)"}}>alex@example.com</div></div>
      </Card>
      <SectionLabel>Preferences</SectionLabel>
      <Card padding="var(--space-6)" style={{display:"grid",gap:"var(--space-7)"}}>
        <Switch checked={a} onChange={setA} label="Show visited places"/>
        <Switch checked={b} onChange={setB} label="Dark map style"/>
        <Switch checked={c} onChange={setC} label="Pull preview images automatically"/>
        <Field label="Default collection"><Select options={["Someday","Lisbon","Coffee"]}/></Field>
      </Card>
      <SectionLabel>App</SectionLabel>
      <Card padding="0" style={{overflow:"hidden"}}>
        {[["smartphone","Install Fibi on this phone"],["share","How to share from TikTok"],["shield","Privacy"],["file-text","Terms"]].map(([i,t],n)=>
          <div key={t} style={{display:"flex",alignItems:"center",gap:"var(--space-5)",padding:"var(--space-6)",borderTop:n?"1px solid var(--border-subtle)":"none",cursor:"pointer"}}>
            <Icon name={i} size={18} color="var(--text-tertiary)"/><span style={{flex:1,font:"var(--type-body)"}}>{t}</span>
            <Icon name="chevron-right" size={16} color="var(--text-tertiary)"/></div>)}
      </Card>
      <Button variant="ghost" fullWidth style={{marginTop:"var(--space-8)",color:"var(--red-500)"}}>Sign out</Button>
    </Body></Screen>;
}

function AddSheet({open,onClose,onSave}){
  const [step,setStep]=React.useState(0);
  const [name,setName]=React.useState("");
  React.useEffect(()=>{if(open){setStep(0);setName("")}},[open]);
  const link="https://www.tiktok.com/@lisbonfoodie/video/7391…";
  return <Dialog open={open} onClose={onClose} variant="sheet" title={step===0?"Add a place":"Make it yours"}
    description={step===0?"Paste a link, or share straight to Fibi from any app.":"Add what you'll need to remember why you saved it."}
    footer={step===0
      ? <Button fullWidth onClick={()=>setStep(1)}>Pull in preview</Button>
      : <><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={()=>onSave({name:name||"Cervejaria Ramiro",location:"Intendente, Lisbon",source:"tiktok",note:"",tags:["Food"],x:"50%",y:"44%",tone:"default"})}>Save place</Button></>}>
    {step===0?<div style={{display:"grid",gap:"var(--space-6)"}}>
      <Field label="Link"><Input defaultValue={link} iconLeft={<Icon name="link" size={16}/>}/></Field>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><Tag interactive icon={<Icon name="clipboard" size={14}/>}>Paste</Tag><Tag interactive icon={<Icon name="image" size={14}/>}>Add screenshot</Tag></div>
    </div>
    :<div style={{display:"grid",gap:"var(--space-6)"}}>
      <Card tone="subtle" padding="var(--space-5)" style={{display:"flex",gap:"var(--space-5)",alignItems:"center"}}>
        <span style={{width:56,height:56,borderRadius:"var(--radius-md)",background:"var(--gradient-brand-soft)",display:"grid",placeItems:"center"}}><Icon name="video" size={18} color="var(--orchid-500)"/></span>
        <div style={{minWidth:0}}><div style={{font:"var(--type-label)",color:"var(--text-primary)"}}>Pulled from TikTok</div>
          <div style={{font:"var(--type-caption)",color:"var(--text-tertiary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{link}</div></div>
      </Card>
      <Field label="Name"><Input value={name} onChange={e=>setName(e.target.value)} placeholder="Cervejaria Ramiro"/></Field>
      <Field label="Location"><Input defaultValue="Intendente, Lisbon" iconLeft={<Icon name="map-pin" size={16}/>}/></Field>
      <Field label="Note" hint="Why did you save it?"><Textarea rows={2} placeholder="Garlic prawns, then the steak sandwich."/></Field>
      <Field label="Collection"><Select options={["Lisbon","Someday","Coffee"]}/></Field>
    </div>}
  </Dialog>;
}

function FibiApp(){
  const [tab,setTab]=React.useState("places");
  const [places,setPlaces]=React.useState(SEED);
  const [query,setQuery]=React.useState("");
  const [detail,setDetail]=React.useState(null);
  const [add,setAdd]=React.useState(false);
  const [toast,setToast]=React.useState(null);
  const save=p=>{setPlaces([{...p,id:Date.now()},...places]);setAdd(false);setTab("places");setToast("Saved to Lisbon");setTimeout(()=>setToast(null),2600)};
  const tabs=[{value:"places",label:"Places",icon:<Icon name="layout-grid" size={20}/>},{value:"map",label:"Map",icon:<Icon name="map" size={20}/>},{value:"add",label:"Add",icon:<Icon name="plus-circle" size={20}/>},{value:"you",label:"You",icon:<Icon name="user" size={20}/>}];
  return <div style={{position:"relative",height:"100%",display:"flex",flexDirection:"column"}}>
    <div style={{flex:1,minHeight:0,position:"relative"}}>
      {detail?<DetailScreen place={detail} onBack={()=>setDetail(null)}/>
      :tab==="map"?<MapScreen places={places} onOpen={setDetail}/>
      :tab==="you"?<YouScreen/>
      :<PlacesScreen places={places} query={query} setQuery={setQuery} onOpen={setDetail} onAdd={()=>setAdd(true)}/>}
    </div>
    {!detail&&<TabBar value={tab} onChange={v=>v==="add"?setAdd(true):setTab(v)} items={tabs} style={{paddingBottom:20,height:84,flex:"0 0 auto"}}/>}
    <AddSheet open={add} onClose={()=>setAdd(false)} onSave={save}/>
    {toast&&<div style={{position:"absolute",left:0,right:0,bottom:110,display:"flex",justifyContent:"center",zIndex:70}}>
      <Toast tone="success" icon={<Icon name="check" size={16}/>}>{toast}</Toast></div>}
  </div>;
}
Object.assign(window,{FibiApp,PlacesScreen,MapScreen,DetailScreen,YouScreen,AddSheet,SEED});
