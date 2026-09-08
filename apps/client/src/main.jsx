import React,{useMemo,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {Home,Compass,Map,CalendarDays,User,Search,MapPin,ChevronRight,Heart,Share2,Clock,Users,Ticket,ChevronLeft,CheckCircle2,X,Navigation,Music2,Sparkles} from 'lucide-react'
import './styles.css'

const venues=[
 {id:'faunna',name:'Faunna',area:'Jurica',distance:'4.1 km',music:'Open format',tag:'Popular',image:'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?auto=format&fit=crop&w=1000&q=80'},
 {id:'annua',name:'Annua',area:'Juriquilla',distance:'5.8 km',music:'House · Reggaetón',tag:'Hoy',image:'https://images.unsplash.com/photo-1571266028243-d220c9c3b2d2?auto=format&fit=crop&w=1000&q=80'},
 {id:'mezontle',name:'Mezontle',area:'Centro',distance:'2.3 km',music:'Latino · Hits',tag:'Trending',image:'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80'},
 {id:'janis',name:'Janis',area:'Centro Sur',distance:'6.7 km',music:'Pop · Reggaetón',tag:'Últimas mesas',image:'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=80'}
]
const events=[
 {id:1,venue:'Faunna',title:'Velvet Friday',date:'Vie 11 Sep',time:'10:30 PM',price:'Desde $350',image:'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1000&q=80'},
 {id:2,venue:'Annua',title:'After Hours',date:'Sáb 12 Sep',time:'10:00 PM',price:'Cover $300',image:'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=80'},
 {id:3,venue:'Mezontle',title:'Noche 00s',date:'Sáb 12 Sep',time:'9:30 PM',price:'Entrada libre antes de 11',image:'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1000&q=80'}
]
const tabs=[['home','Inicio',Home],['explore','Explorar',Compass],['map','Mapa',Map],['plans','Planes',CalendarDays],['profile','Perfil',User]]

function App(){
 const [tab,setTab]=useState('home'); const [selected,setSelected]=useState(null); const [booking,setBooking]=useState(null); const [liked,setLiked]=useState([])
 const title=tab==='home'?'Pari':tab==='explore'?'Explorar':tab==='map'?'Esta noche':tab==='plans'?'Mis planes':'Perfil'
 const openVenue=v=>setSelected(v)
 if(selected) return <Venue venue={selected} onBack={()=>setSelected(null)} onBook={()=>setBooking(selected)} liked={liked.includes(selected.id)} toggleLike={()=>setLiked(x=>x.includes(selected.id)?x.filter(i=>i!==selected.id):[...x,selected.id])} />
 if(booking) return null
 return <div className="app-shell"><main className="screen">
   <header className="topbar"><div><p className="eyebrow">QUERÉTARO · ESTA NOCHE</p><h1>{title}</h1></div><button className="avatar">SR</button></header>
   {tab==='home'&&<HomeView openVenue={openVenue}/>} 
   {tab==='explore'&&<ExploreView openVenue={openVenue}/>} 
   {tab==='map'&&<MapView openVenue={openVenue}/>} 
   {tab==='plans'&&<PlansView/>}
   {tab==='profile'&&<ProfileView/>}
 </main><Nav tab={tab} setTab={setTab}/></div>
}

function HomeView({openVenue}){return <>
 <section className="hero"><div className="hero-copy"><span className="pill glow"><Sparkles size={13}/> Tonight in Qro</span><h2>Tu noche empieza<br/>aquí.</h2><p>Descubre los lugares y eventos que están pasando hoy.</p><button onClick={()=>document.getElementById('popular').scrollIntoView({behavior:'smooth'})}>Explorar ahora <ChevronRight size={17}/></button></div></section>
 <Section title="Lo más caliente" subtitle="Eventos que todos están guardando"><div className="event-scroll">{events.map(e=><EventCard key={e.id} e={e}/>)}</div></Section>
 <Section id="popular" title="Lugares populares" subtitle="Antros que están moviendo la noche"><div className="venue-grid">{venues.map(v=><VenueCard key={v.id} v={v} onClick={()=>openVenue(v)}/>)}</div></Section>
 <div className="spacer"/>
</>}
function ExploreView({openVenue}){const [q,setQ]=useState(''); const [filter,setFilter]=useState('Todos'); const filtered=useMemo(()=>venues.filter(v=>(v.name+v.area+v.music).toLowerCase().includes(q.toLowerCase())),[q]); return <>
 <div className="search"><Search size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar antro, evento o zona"/></div>
 <div className="chips">{['Todos','Popular','Hoy','Cerca','Últimas mesas'].map(x=><button className={filter===x?'active':''} onClick={()=>setFilter(x)} key={x}>{x}</button>)}</div>
 <div className="explore-list">{filtered.map(v=><button className="explore-card" key={v.id} onClick={()=>openVenue(v)}><img src={v.image}/><div className="shade"/><span className="tag">{v.tag}</span><div className="card-copy"><h3>{v.name}</h3><p><MapPin size={14}/>{v.area} · {v.distance}</p><small>{v.music}</small></div><ChevronRight className="arrow"/></button>)}</div><div className="spacer"/>
</>}
function MapView({openVenue}){return <><div className="mapbox"><div className="map-noise"></div>{venues.map((v,i)=><button className={'pin p'+i} key={v.id} onClick={()=>openVenue(v)}><MapPin size={16}/><span>{v.name}</span></button>)}<button className="locate"><Navigation size={17}/></button></div><Section title="Cerca de ti" subtitle="Con disponibilidad esta noche"><div className="mini-list">{venues.slice(0,3).map(v=><VenueRow v={v} key={v.id} onClick={()=>openVenue(v)}/>)}</div></Section><div className="spacer"/></>}
function PlansView(){return <><div className="empty-hero"><Ticket size={38}/><h2>Tus próximas noches</h2><p>Cuando reserves una mesa o te registres a un evento, aparecerá aquí.</p><button>Explorar eventos</button></div><Section title="Guardados"><div className="saved-placeholder"><Heart/><span>Aún no guardas eventos</span></div></Section></>}
function ProfileView(){return <><div className="profile-card"><div className="big-avatar">SR</div><div><h2>Santiago</h2><p>Miembro de Pari</p></div></div><div className="settings">{['Métodos de pago','Notificaciones','Mis favoritos','Invitar amigos','Ayuda y soporte'].map(x=><button key={x}><span>{x}</span><ChevronRight/></button>)}</div></>}

function Venue({venue,onBack,onBook,liked,toggleLike}){const [showBook,setShowBook]=useState(false); if(showBook)return <Booking venue={venue} onBack={()=>setShowBook(false)}/>; return <div className="app-shell"><main className="screen venue-screen"><div className="venue-hero" style={{backgroundImage:`url(${venue.image})`}}><div className="venue-gradient"/><button className="circle back" onClick={onBack}><ChevronLeft/></button><div className="hero-actions"><button className="circle" onClick={toggleLike}><Heart fill={liked?'currentColor':'none'}/></button><button className="circle"><Share2/></button></div><div className="venue-title"><span className="pill">{venue.tag}</span><h1>{venue.name}</h1><p><MapPin size={15}/>{venue.area} · {venue.distance}</p></div></div><div className="venue-body"><div className="quickfacts"><span><Clock/>10:00 PM – 3:00 AM</span><span><Music2/>{venue.music}</span></div><h2>Esta noche</h2><div className="featured-event"><div><p>Evento destacado</p><h3>Saturday Ritual</h3><small>DJ set · Dress code casual chic</small></div><span>12 SEP</span></div><h2>Reserva tu mesa</h2><p className="muted">Asegura tu lugar con un anticipo. El resto se liquida en el venue.</p><div className="table-options"><div><b>Terraza</b><span>4–6 personas</span><strong>$3,500 mín.</strong></div><div><b>VIP</b><span>6–8 personas</span><strong>$6,000 mín.</strong></div><div><b>Backstage</b><span>8–10 personas</span><strong>$10,000 mín.</strong></div></div><div className="spacer"/></div></main><div className="bookbar"><div><small>Anticipo desde</small><b>$700</b></div><button onClick={()=>setShowBook(true)}>Reservar</button></div></div>}
function Booking({venue,onBack}){const [step,setStep]=useState(1); const [zone,setZone]=useState('VIP'); const [people,setPeople]=useState(6); const [done,setDone]=useState(false); if(done)return <div className="app-shell"><main className="screen success"><CheckCircle2/><p className="eyebrow">RESERVA CONFIRMADA</p><h1>Nos vemos en {venue.name}</h1><p>Tu mesa está lista. Presenta este QR al llegar.</p><div className="qr">▦</div><div className="confirmation"><span>Saturday Ritual</span><b>12 SEP · 11:00 PM</b><span>{zone} · {people} personas</span><small>Reserva #PARI-09261</small></div><button className="primary" onClick={()=>location.reload()}>Ver mis planes</button></main></div>
 return <div className="app-shell"><main className="screen booking"><header className="booking-head"><button className="circle" onClick={onBack}><ChevronLeft/></button><div><p className="eyebrow">RESERVAR EN</p><h1>{venue.name}</h1></div><span>{step}/3</span></header><div className="progress"><i style={{width:(step/3*100)+'%'}}/></div>{step===1&&<div className="step"><h2>¿Dónde quieres estar?</h2><p>Selecciona una zona.</p>{['Terraza','VIP','Backstage'].map((x,i)=><button onClick={()=>setZone(x)} className={'zone '+(zone===x?'selected':'')} key={x}><div><b>{x}</b><span>{[4,6,8][i]}–{[6,8,10][i]} personas</span></div><strong>${[3500,6000,10000][i].toLocaleString()} mín.</strong></button>)}</div>}{step===2&&<div className="step"><h2>¿Cuántos van?</h2><p>Puedes ajustar invitados después.</p><div className="counter"><button onClick={()=>setPeople(Math.max(2,people-1))}>−</button><strong>{people}</strong><button onClick={()=>setPeople(Math.min(12,people+1))}>+</button></div><div className="summary-card"><span>Zona</span><b>{zone}</b><span>Fecha</span><b>Sábado 12 Sep</b><span>Hora</span><b>11:00 PM</b></div></div>}{step===3&&<div className="step"><h2>Confirma tu reserva</h2><p>Solo cobramos el anticipo.</p><div className="pay-card"><span>Total anticipo</span><strong>$1,200 MXN</strong><small>Se descontará de tu consumo mínimo.</small></div><div className="payment"><b>Apple Pay</b><span>•••• 4821</span></div><div className="summary-card"><span>Venue</span><b>{venue.name}</b><span>Zona</span><b>{zone}</b><span>Personas</span><b>{people}</b></div></div>}<div className="booking-bottom"><button className="primary" onClick={()=>step<3?setStep(step+1):setDone(true)}>{step<3?'Continuar':'Pagar y reservar'}</button></div></main></div>}

function Section({title,subtitle,children,id}){return <section className="section" id={id}><div className="section-head"><div><h2>{title}</h2><p>{subtitle}</p></div><button>Ver todo</button></div>{children}</section>}
function EventCard({e}){return <article className="event-card"><img src={e.image}/><div className="event-overlay"/><span className="event-date">{e.date}</span><div><small>{e.venue}</small><h3>{e.title}</h3><p>{e.time} · {e.price}</p></div></article>}
function VenueCard({v,onClick}){return <button className="venue-card" onClick={onClick}><img src={v.image}/><div><span className="venue-tag">{v.tag}</span><h3>{v.name}</h3><p><MapPin size={13}/>{v.area}</p><small>{v.music}</small></div></button>}
function VenueRow({v,onClick}){return <button className="venue-row" onClick={onClick}><img src={v.image}/><div><b>{v.name}</b><span>{v.area} · {v.distance}</span><small>{v.music}</small></div><ChevronRight/></button>}
function Nav({tab,setTab}){return <nav className="bottom-nav">{tabs.map(([id,label,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon/><span>{label}</span></button>)}</nav>}
createRoot(document.getElementById('root')).render(<App/>)
