import React,{useMemo,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {Home,Compass,Map,CalendarDays,User,Search,MapPin,ChevronRight,Heart,Share2,Clock,Users,Ticket,ChevronLeft,CheckCircle2,X,Navigation,Music2,Sparkles} from 'lucide-react'
import './styles.css'

const venues=[
 {id:'looloo',name:'LooLoo',area:'Juárez',distance:'1.8 km',music:'House · Techno',tag:'Popular',image:'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?auto=format&fit=crop&w=1000&q=80'},
 {id:'funk',name:'Funk Club',area:'Roma Norte',distance:'2.6 km',music:'House · Disco',tag:'Hoy',image:'https://images.unsplash.com/photo-1571266028243-d220c9c3b2d2?auto=format&fit=crop&w=1000&q=80'},
 {id:'phonique',name:'Phonique',area:'Polanco',distance:'4.2 km',music:'Open format · Hits',tag:'Trending',image:'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80'},
 {id:'departamento',name:'Departamento',area:'Roma Norte',distance:'2.9 km',music:'Electronic · Indie',tag:'Últimos lugares',image:'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=80'}
]
const events=[
 {id:1,venue:'LooLoo',title:'Saturday Ritual',date:'Vie 11 Sep',time:'10:30 PM',price:'Reservaciones abiertas',image:'https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?auto=format&fit=crop&w=1000&q=80'},
 {id:2,venue:'Funk Club',title:'After Hours',date:'Sáb 12 Sep',time:'10:00 PM',price:'Lista disponible',image:'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1000&q=80'},
 {id:3,venue:'Phonique',title:'Noche 00s',date:'Sáb 12 Sep',time:'9:30 PM',price:'Reserva tu lugar',image:'https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1000&q=80'}
]
const tabs=[['home','Inicio',Home],['explore','Explorar',Compass],['map','Mapa',Map],['plans','Planes',CalendarDays],['profile','Perfil',User]]

function App(){
 const [tab,setTab]=useState('home'); const [selected,setSelected]=useState(null); const [booking,setBooking]=useState(null); const [liked,setLiked]=useState([])
 const title=tab==='home'?'Pari':tab==='explore'?'Explorar':tab==='map'?'Esta noche':tab==='plans'?'Mis planes':'Perfil'
 const openVenue=v=>setSelected(v)
 if(selected) return <Venue venue={selected} onBack={()=>setSelected(null)} onBook={()=>setBooking(selected)} liked={liked.includes(selected.id)} toggleLike={()=>setLiked(x=>x.includes(selected.id)?x.filter(i=>i!==selected.id):[...x,selected.id])} />
 if(booking) return null
 return <div className="app-shell"><main className="screen">
   <header className="topbar"><div><p className="eyebrow">CDMX · ESTA NOCHE</p><h1>{title}</h1></div><button className="avatar">SR</button></header>
   {tab==='home'&&<HomeView openVenue={openVenue}/>} 
   {tab==='explore'&&<ExploreView openVenue={openVenue}/>} 
   {tab==='map'&&<MapView openVenue={openVenue}/>} 
   {tab==='plans'&&<PlansView/>}
   {tab==='profile'&&<ProfileView/>}
 </main><Nav tab={tab} setTab={setTab}/></div>
}

function HomeView({openVenue}){return <>
 <section className="hero"><div className="hero-copy"><span className="pill glow"><Sparkles size={13}/> Tonight in CDMX</span><h2>Tu noche empieza<br/>aquí.</h2><p>Descubre los lugares y eventos que están pasando hoy.</p><button onClick={()=>document.getElementById('popular').scrollIntoView({behavior:'smooth'})}>Explorar ahora <ChevronRight size={17}/></button></div></section>
 <Section title="Lo más caliente" subtitle="Eventos que todos están guardando"><div className="event-scroll">{events.map(e=><EventCard key={e.id} e={e}/>)}</div></Section>
 <Section id="popular" title="Lugares populares" subtitle="Antros que están moviendo la noche"><div className="venue-grid">{venues.map(v=><VenueCard key={v.id} v={v} onClick={()=>openVenue(v)}/>)}</div></Section>
 <div className="spacer"/>
</>}
function ExploreView({openVenue}){const [q,setQ]=useState(''); const [filter,setFilter]=useState('Todos'); const filtered=useMemo(()=>venues.filter(v=>(v.name+v.area+v.music).toLowerCase().includes(q.toLowerCase())),[q]); return <>
 <div className="search"><Search size={18}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar antro, evento o zona"/></div>
 <div className="chips">{['Todos','Popular','Hoy','Cerca','Últimos lugares'].map(x=><button className={filter===x?'active':''} onClick={()=>setFilter(x)} key={x}>{x}</button>)}</div>
 <div className="explore-list">{filtered.map(v=><button className="explore-card" key={v.id} onClick={()=>openVenue(v)}><img src={v.image}/><div className="shade"/><span className="tag">{v.tag}</span><div className="card-copy"><h3>{v.name}</h3><p><MapPin size={14}/>{v.area} · {v.distance}</p><small>{v.music}</small></div><ChevronRight className="arrow"/></button>)}</div><div className="spacer"/>
</>}
function MapView({openVenue}){return <><div className="mapbox"><div className="map-noise"></div>{venues.map((v,i)=><button className={'pin p'+i} key={v.id} onClick={()=>openVenue(v)}><MapPin size={16}/><span>{v.name}</span></button>)}<button className="locate"><Navigation size={17}/></button></div><Section title="Cerca de ti" subtitle="Con disponibilidad esta noche"><div className="mini-list">{venues.slice(0,3).map(v=><VenueRow v={v} key={v.id} onClick={()=>openVenue(v)}/>)}</div></Section><div className="spacer"/></>}
function PlansView(){return <><div className="empty-hero"><Ticket size={38}/><h2>Tus próximas noches</h2><p>Cuando reserves una mesa o te registres a un evento, aparecerá aquí.</p><button>Explorar eventos</button></div><Section title="Guardados"><div className="saved-placeholder"><Heart/><span>Aún no guardas eventos</span></div></Section></>}
function ProfileView(){return <><div className="profile-card"><div className="big-avatar">SR</div><div><h2>Santiago</h2><p>Miembro de Pari</p></div></div><div className="settings">{['Métodos de pago','Notificaciones','Mis favoritos','Invitar amigos','Ayuda y soporte'].map(x=><button key={x}><span>{x}</span><ChevronRight/></button>)}</div></>}

function Venue({venue,onBack,liked,toggleLike}){const [showBook,setShowBook]=useState(false); const [people,setPeople]=useState(4); if(showBook)return <Booking venue={venue} initialPeople={people} onBack={()=>setShowBook(false)}/>; return <div className="app-shell"><main className="screen venue-screen"><div className="venue-hero" style={{backgroundImage:`url(${venue.image})`}}><div className="venue-gradient"/><button className="circle back" onClick={onBack}><ChevronLeft/></button><div className="hero-actions"><button className="circle" onClick={toggleLike}><Heart fill={liked?'currentColor':'none'}/></button><button className="circle"><Share2/></button></div><div className="venue-title"><span className="pill">{venue.tag}</span><h1>{venue.name}</h1><p><MapPin size={15}/>{venue.area} · CDMX · {venue.distance}</p></div></div><div className="venue-body"><div className="quickfacts"><span><Clock/>10:00 PM – 3:00 AM</span><span><Music2/>{venue.music}</span></div><h2>Esta noche</h2><div className="featured-event"><div><p>Evento destacado</p><h3>Saturday Ritual</h3><small>DJ set · Dress code casual chic</small></div><span>12 SEP</span></div><h2>Haz tu reservación</h2><p className="muted">Dinos cuántas personas van y Pari prepara la solicitud para el lugar.</p><div className="guest-picker"><span>¿Cuántas personas son?</span><div className="guest-counter"><button onClick={()=>setPeople(Math.max(1,people-1))}>−</button><strong>{people}</strong><button onClick={()=>setPeople(Math.min(20,people+1))}>+</button></div><small>{people===1?'1 persona':`${people} personas`} · Puedes modificarlo antes de confirmar</small></div><div className="spacer"/></div></main><div className="bookbar"><div><small>Reservación para</small><b>{people} {people===1?'persona':'personas'}</b></div><button onClick={()=>setShowBook(true)}>Continuar</button></div></div>}
function Booking({venue,onBack,initialPeople=4}){const [step,setStep]=useState(1); const [people,setPeople]=useState(initialPeople); const [time,setTime]=useState('11:00 PM'); const [done,setDone]=useState(false); if(done)return <div className="app-shell"><main className="screen success"><CheckCircle2/><p className="eyebrow">SOLICITUD ENVIADA</p><h1>Reservación en {venue.name}</h1><p>Tu solicitud para {people} {people===1?'persona':'personas'} quedó registrada. Presenta este QR al llegar cuando sea confirmada.</p><div className="qr">▦</div><div className="confirmation"><span>Saturday Ritual</span><b>12 SEP · {time}</b><span>{people} {people===1?'persona':'personas'}</span><small>Reserva #PARI-09261</small></div><button className="primary" onClick={()=>location.reload()}>Ver mis planes</button></main></div>
 return <div className="app-shell"><main className="screen booking"><header className="booking-head"><button className="circle" onClick={onBack}><ChevronLeft/></button><div><p className="eyebrow">RESERVAR EN</p><h1>{venue.name}</h1></div><span>{step}/3</span></header><div className="progress"><i style={{width:(step/3*100)+'%'}}/></div>{step===1&&<div className="step"><h2>¿Cuántos van?</h2><p>Selecciona el tamaño de tu grupo.</p><div className="counter"><button onClick={()=>setPeople(Math.max(1,people-1))}>−</button><strong>{people}</strong><button onClick={()=>setPeople(Math.min(20,people+1))}>+</button></div><div className="people-presets">{[2,4,6,8,10].map(n=><button key={n} onClick={()=>setPeople(n)} className={people===n?'selected':''}>{n} personas</button>)}</div></div>}{step===2&&<div className="step"><h2>¿A qué hora llegas?</h2><p>Elige tu horario estimado de llegada.</p><div className="time-options">{['10:00 PM','10:30 PM','11:00 PM','11:30 PM','12:00 AM'].map(t=><button key={t} className={time===t?'selected':''} onClick={()=>setTime(t)}>{t}</button>)}</div><div className="summary-card"><span>Fecha</span><b>Sábado 12 Sep</b><span>Personas</span><b>{people}</b></div></div>}{step===3&&<div className="step"><h2>Confirma tu reservación</h2><p>El lugar recibirá tu solicitud con estos datos.</p><div className="reservation-card"><Users/><div><small>Grupo</small><strong>{people} {people===1?'persona':'personas'}</strong></div></div><div className="summary-card"><span>Lugar</span><b>{venue.name}</b><span>Zona</span><b>{venue.area}, CDMX</b><span>Fecha</span><b>Sábado 12 Sep</b><span>Hora</span><b>{time}</b></div></div>}<div className="booking-bottom"><button className="primary" onClick={()=>step<3?setStep(step+1):setDone(true)}>{step<3?'Continuar':'Enviar reservación'} <ChevronRight size={18}/></button></div></main></div>}

function Section({title,subtitle,children,id}){return <section className="section" id={id}><div className="section-head"><div><h2>{title}</h2><p>{subtitle}</p></div><button>Ver todo</button></div>{children}</section>}
function EventCard({e}){return <article className="event-card"><img src={e.image}/><div className="event-overlay"/><span className="event-date">{e.date}</span><div><small>{e.venue}</small><h3>{e.title}</h3><p>{e.time} · {e.price}</p></div></article>}
function VenueCard({v,onClick}){return <button className="venue-card" onClick={onClick}><img src={v.image}/><div><span className="venue-tag">{v.tag}</span><h3>{v.name}</h3><p><MapPin size={13}/>{v.area}</p><small>{v.music}</small></div></button>}
function VenueRow({v,onClick}){return <button className="venue-row" onClick={onClick}><img src={v.image}/><div><b>{v.name}</b><span>{v.area} · {v.distance}</span><small>{v.music}</small></div><ChevronRight/></button>}
function Nav({tab,setTab}){return <nav className="bottom-nav">{tabs.map(([id,label,Icon])=><button key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon/><span>{label}</span></button>)}</nav>}
createRoot(document.getElementById('root')).render(<App/>)
