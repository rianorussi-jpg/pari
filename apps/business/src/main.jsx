import React,{useEffect,useMemo,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {CalendarDays,Users,ScanLine,BarChart3,Settings,Plus,MoreHorizontal,LogOut,Building2,KeyRound,AlertCircle} from 'lucide-react'
import './styles.css'
import {supabase,isSupabaseConfigured} from './supabase'

function Login(){
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [loading,setLoading]=useState(false)
 const submit=async e=>{e.preventDefault();if(!supabase)return;setLoading(true);setError('');const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setError(error.message);setLoading(false)}
 return <div className="login-page"><form className="login-card" onSubmit={submit}><div className="brand">pari<span>.</span><small>NEGOCIOS</small></div><h1>Panel de negocios</h1><p>Entra con la cuenta asignada a tu antro.</p>{!isSupabaseConfigured&&<div className="login-error"><AlertCircle/>Faltan las variables de Supabase en Vercel.</div>}<label>Correo<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="faunna@pari.mx" required/></label><label>Contraseña<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required/></label>{error&&<div className="login-error"><AlertCircle/>{error}</div>}<button className="login-button" disabled={loading||!isSupabaseConfigured}><KeyRound/>{loading?'Entrando…':'Entrar'}</button></form></div>
}

function Dashboard({session}){
 const [venue,setVenue]=useState(null);const [membership,setMembership]=useState(null);const [pari_reservations,setReservations]=useState([]);const [pari_events,setEvents]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState('')
 useEffect(()=>{let active=true;(async()=>{
  const {data:member,error:memberError}=await supabase.from('pari_venue_members').select('id,role,venue_id,pari_venues(*)').eq('user_id',session.user.id).maybeSingle()
  if(!active)return;if(memberError||!member){setError(memberError?.message||'Esta cuenta todavía no está asignada a un negocio.');setLoading(false);return}
  setMembership(member);setVenue(member.pari_venues)
  const [{data:r},{data:e}]=await Promise.all([
   supabase.from('pari_reservations').select('id,user_id,party_size,reservation_date,arrival_time,status,created_at').eq('venue_id',member.venue_id).order('created_at',{ascending:false}).limit(20),
   supabase.from('pari_events').select('*').eq('venue_id',member.venue_id).order('starts_at',{ascending:true}).limit(10)
  ])
  if(active){setReservations(r||[]);setEvents(e||[]);setLoading(false)}
 })();return()=>{active=false}},[session.user.id])
 const today=new Date().toISOString().slice(0,10)
 const todayReservations=useMemo(()=>pari_reservations.filter(r=>r.reservation_date===today),[pari_reservations,today])
 const people=todayReservations.reduce((a,r)=>a+(r.party_size||0),0)
 if(loading)return <div className="loading-screen">Cargando Pari Negocios…</div>
 if(error)return <div className="login-page"><div className="login-card"><div className="brand">pari<span>.</span><small>NEGOCIOS</small></div><h1>Cuenta sin negocio</h1><div className="login-error"><AlertCircle/>{error}</div><button className="login-button" onClick={()=>supabase.auth.signOut()}><LogOut/>Cerrar sesión</button></div></div>
 return <div className="layout"><aside><div className="brand">pari<span>.</span><small>NEGOCIOS</small></div><nav>{[[BarChart3,'Resumen'],[CalendarDays,'Eventos'],[Users,'Reservaciones'],[ScanLine,'Check-in'],[Settings,'Configuración']].map(([I,t],i)=><button key={t} className={i===0?'active':''}><I/>{t}</button>)}</nav><button className="logout" onClick={()=>supabase.auth.signOut()}><LogOut/>Cerrar sesión</button></aside><main><header><div><p>{venue?.name?.toUpperCase()} · {venue?.city?.toUpperCase()}</p><h1>Buenas noches 👋</h1></div><button><Plus/>Crear evento</button></header><section className="stats"><article><span>Reservaciones hoy</span><strong>{todayReservations.length}</strong><small>Datos en vivo</small></article><article><span>Personas esperadas</span><strong>{people}</strong><small>Para hoy</small></article><article><span>Próximos eventos</span><strong>{pari_events.length}</strong><small>Publicados / borradores</small></article><article><span>Cuenta</span><strong>{membership?.role||'owner'}</strong><small>{session.user.email}</small></article></section><section className="panel"><div className="panel-head"><div><h2>Reservaciones recientes</h2><p>Conectadas a Supabase</p></div><button className="ghost">Ver todas</button></div><table><thead><tr><th>Reserva</th><th>Cliente</th><th>Personas</th><th>Fecha</th><th>Llegada</th><th>Estado</th><th></th></tr></thead><tbody>{pari_reservations.length?pari_reservations.map(r=><tr key={r.id}><td>{r.id.slice(0,8).toUpperCase()}</td><td>{'Usuario '+r.user_id.slice(0,6)}</td><td>{r.party_size}</td><td>{r.reservation_date}</td><td>{r.arrival_time||'—'}</td><td><span className={'status '+(r.status==='pending'?'pending':'')}>{r.status}</span></td><td><MoreHorizontal/></td></tr>):<tr><td colSpan="7" className="empty-row">Todavía no hay reservaciones.</td></tr>}</tbody></table></section><section className="twocol"><article className="panel"><h2>Tu negocio</h2><div className="business-info"><Building2/><div><b>{venue.name}</b><span>{venue.address||venue.neighborhood||'Ciudad de México'}</span><small>{venue.contact_email}</small></div></div></article><article className="panel"><h2>Próximos eventos</h2>{pari_events.length?pari_events.map(e=><div className="event" key={e.id}><div><b>{e.title}</b><span>{new Date(e.starts_at).toLocaleString('es-MX')}</span></div><strong>{e.status}</strong></div>):<p>Sin eventos todavía.</p>}</article></section></main></div>
}

function App(){const [session,setSession]=useState(null);const [ready,setReady]=useState(false);useEffect(()=>{if(!supabase){setReady(true);return}supabase.auth.getSession().then(({data})=>{setSession(data.session);setReady(true)});const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,s)=>setSession(s));return()=>subscription.unsubscribe()},[]);if(!ready)return <div className="loading-screen">Cargando…</div>;return session?<Dashboard session={session}/>:<Login/>}
createRoot(document.getElementById('root')).render(<App/>)
